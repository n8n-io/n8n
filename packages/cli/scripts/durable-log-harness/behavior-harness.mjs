#!/usr/bin/env node
/**
 * Durable-log behavior harness (RFC: instance-ai durable event log).
 *
 * Boots a REAL n8n main (built dist, throwaway sqlite dir, E2E test endpoints
 * on), drives scripted event runs through the real bus via the E2E
 * publish-events endpoint, and exercises the real SSE endpoint and process
 * lifecycle, flag off vs flag on:
 *
 *   R1 reload mid-run      - reconnect with a cursor, same process
 *   R2 restart mid-run     - SIGTERM (flush) + fresh process, reconnect
 *   R3 reconnect mid-block - cursor taken mid text segment, no duplicate text
 *   R4 kill -9 mid-run     - fresh process, startup sweep marks interrupted
 *   L  first-event latency - publish -> first SSE frame, A/B
 *
 * Usage: node packages/cli/scripts/durable-log-harness/behavior-harness.mjs [--flag on|off|both]
 * Writes results to DURABLE_LOG_RESULTS or $TMPDIR/durable-log-behavior.json.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_DIR = path.resolve(__dirname, '..', '..');
const RESULTS_PATH =
	process.env.DURABLE_LOG_RESULTS ?? path.join(tmpdir(), 'durable-log-behavior.json');

const OWNER = {
	email: 'harness@n8n.io',
	firstName: 'Durable',
	lastName: 'Harness',
	password: 'SuperSecure123!',
};

function recordResult(section, data) {
	let all = {};
	if (existsSync(RESULTS_PATH)) {
		try {
			all = JSON.parse(readFileSync(RESULTS_PATH, 'utf8'));
		} catch {}
	}
	all[section] = data;
	writeFileSync(RESULTS_PATH, JSON.stringify(all, null, 1));
	console.log(`  recorded ${section}`);
}

function percentileStats(samples) {
	const s = [...samples].sort((a, b) => a - b);
	const pick = (p) => s[Math.max(0, Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1))];
	const r = (x) => Math.round(x * 1000) / 1000;
	return { n: s.length, p50: r(pick(50)), p95: r(pick(95)), max: r(s[s.length - 1] ?? NaN) };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function request(port, method, urlPath, { body, cookie, timeoutMs = 15000 } = {}) {
	return new Promise((resolve, reject) => {
		const data = body === undefined ? undefined : JSON.stringify(body);
		const req = http.request(
			{
				host: '127.0.0.1',
				port,
				method,
				path: urlPath,
				headers: {
					'content-type': 'application/json',
					...(data ? { 'content-length': Buffer.byteLength(data) } : {}),
					...(cookie ? { cookie } : {}),
				},
				timeout: timeoutMs,
			},
			(res) => {
				let out = '';
				res.on('data', (c) => (out += c));
				res.on('end', () => {
					let parsed;
					try {
						parsed = JSON.parse(out);
					} catch {
						parsed = out;
					}
					resolve({ status: res.statusCode, body: parsed, headers: res.headers });
				});
			},
		);
		req.on('error', reject);
		req.on('timeout', () => {
			req.destroy(new Error(`timeout: ${method} ${urlPath}`));
		});
		if (data) req.write(data);
		req.end();
	});
}

/**
 * Minimal SSE client over raw http. Collects frames; each frame is
 * { id?: number, event?: string, data: object, at: ms-timestamp }.
 */
function openSse(port, threadId, cookie, { lastEventId } = {}) {
	const frames = [];
	const url = `/rest/instance-ai/events/${threadId}${
		lastEventId !== undefined ? `?lastEventId=${lastEventId}` : ''
	}`;
	let onFrame = () => {};
	const req = http.request(
		{
			host: '127.0.0.1',
			port,
			method: 'GET',
			path: url,
			headers: { accept: 'text/event-stream', cookie },
		},
		(res) => {
			if (res.statusCode !== 200) {
				req.emit('error', new Error(`SSE status ${res.statusCode}`));
				return;
			}
			let buffer = '';
			res.on('data', (chunk) => {
				buffer += chunk.toString('utf8');
				let idx;
				while ((idx = buffer.indexOf('\n\n')) >= 0) {
					const raw = buffer.slice(0, idx);
					buffer = buffer.slice(idx + 2);
					if (raw.startsWith(':')) continue; // keep-alive comment
					const frame = { at: performance.now() };
					for (const line of raw.split('\n')) {
						if (line.startsWith('id: ')) frame.id = Number(line.slice(4));
						else if (line.startsWith('event: ')) frame.event = line.slice(7);
						else if (line.startsWith('data: ')) {
							try {
								frame.data = JSON.parse(line.slice(6));
							} catch {
								frame.data = line.slice(6);
							}
						}
					}
					if (frame.data !== undefined) {
						frames.push(frame);
						onFrame(frame);
					}
				}
			});
		},
	);
	req.end();
	return {
		frames,
		close: () => req.destroy(),
		waitFor: async (predicate, timeoutMs = 15000) => {
			const found = frames.find(predicate);
			if (found) return found;
			return await new Promise((resolve, reject) => {
				const timer = setTimeout(
					() => reject(new Error('SSE waitFor timeout')),
					timeoutMs,
				);
				const prev = onFrame;
				onFrame = (frame) => {
					prev(frame);
					if (predicate(frame)) {
						clearTimeout(timer);
						resolve(frame);
					}
				};
			});
		},
	};
}

// ---------------------------------------------------------------------------
// n8n process lifecycle
// ---------------------------------------------------------------------------

async function startN8n({ port, userFolder, durableLog, label }) {
	const child = spawn(process.execPath, [path.join(CLI_DIR, 'bin', 'n8n'), 'start'], {
		cwd: CLI_DIR,
		env: {
			...process.env,
			N8N_USER_FOLDER: userFolder,
			N8N_PORT: String(port),
			N8N_RUNNERS_BROKER_PORT: String(port + 1000),
			N8N_LOG_LEVEL: 'error',
			N8N_DIAGNOSTICS_ENABLED: 'false',
			N8N_RUNNERS_ENABLED: 'false',
			E2E_TESTS: 'true',
			NODE_ENV: 'development',
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			N8N_INSTANCE_AI_DURABLE_LOG: durableLog ? 'true' : 'false',
			DB_SQLITE_POOL_SIZE: '4',
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	let output = '';
	child.stdout.on('data', (c) => (output += c));
	child.stderr.on('data', (c) => (output += c));

	const deadline = Date.now() + 120_000;
	while (Date.now() < deadline) {
		try {
			// The starter page answers every path with 200 text/html until the
			// REST layer is ready, so require a JSON response.
			const res = await request(port, 'GET', '/rest/settings', { timeoutMs: 2000 });
			if (res.status === 200 && typeof res.body === 'object') {
				console.log(`  [${label}] n8n up on :${port} (durableLog=${durableLog})`);
				return { child, getOutput: () => output };
			}
		} catch {}
		if (child.exitCode !== null) {
			throw new Error(`n8n exited early (${child.exitCode}):\n${output.slice(-4000)}`);
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	child.kill('SIGKILL');
	throw new Error(`n8n did not become healthy:\n${output.slice(-4000)}`);
}

async function stopN8n(proc, signal = 'SIGTERM') {
	if (proc.child.exitCode !== null) return;
	proc.child.kill(signal);
	if (signal === 'SIGKILL') {
		await new Promise((r) => setTimeout(r, 300));
		return;
	}
	const deadline = Date.now() + 30_000;
	while (proc.child.exitCode === null && Date.now() < deadline) {
		await new Promise((r) => setTimeout(r, 250));
	}
	if (proc.child.exitCode === null) proc.child.kill('SIGKILL');
}

async function setupAuth(port) {
	// Fresh instance: owner setup returns the auth cookie directly.
	const setup = await request(port, 'POST', '/rest/owner/setup', { body: OWNER });
	let cookie;
	let userId;
	if (setup.status === 200) {
		cookie = (setup.headers['set-cookie'] ?? [])
			.map((c) => c.split(';')[0])
			.join('; ');
		userId = setup.body.data?.id ?? setup.body.id;
	} else {
		// Already set up (restart of same user folder): log in.
		const login = await request(port, 'POST', '/rest/login', {
			body: { emailOrLdapLoginId: OWNER.email, password: OWNER.password },
		});
		if (login.status !== 200) throw new Error(`login failed: ${JSON.stringify(login.body)}`);
		cookie = (login.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]).join('; ');
		userId = login.body.data?.id ?? login.body.id;
	}
	if (!cookie || !userId) throw new Error('auth bootstrap failed');
	return { cookie, userId };
}

// ---------------------------------------------------------------------------
// Scripted events (same shapes as the synthetic harness)
// ---------------------------------------------------------------------------

const DELTA_TEXT = 'the quick brown fox jumps over the l';
const orchestrator = (runId) => `orchestrator:${runId}`;

function step(runId, stepIdx, { textDeltas = 4, reasoningDeltas = 2 } = {}) {
	const agentId = orchestrator(runId);
	const responseId = `msg_${runId.slice(-6)}_${stepIdx}`;
	const events = [];
	for (let i = 0; i < reasoningDeltas; i++)
		events.push({ type: 'reasoning-delta', runId, agentId, responseId, payload: { text: DELTA_TEXT } });
	for (let i = 0; i < textDeltas; i++)
		events.push({ type: 'text-delta', runId, agentId, responseId, payload: { text: DELTA_TEXT } });
	const toolCallId = `tc_${stepIdx}_${runId.slice(-6)}`;
	events.push({
		type: 'tool-call',
		runId,
		agentId,
		responseId,
		payload: { toolCallId, toolName: 'search-workflows', args: { query: `step ${stepIdx}` } },
	});
	events.push({
		type: 'tool-result',
		runId,
		agentId,
		responseId,
		payload: { toolCallId, result: { matches: stepIdx } },
	});
	return events;
}

const runStart = (runId, userId) => ({
	type: 'run-start',
	runId,
	agentId: orchestrator(runId),
	userId,
	payload: { messageId: `m_${runId}` },
});
const runFinish = (runId, status = 'completed') => ({
	type: 'run-finish',
	runId,
	agentId: orchestrator(runId),
	payload: { status },
});

async function publish(port, cookie, userId, threadId, events, { ensureThread = false } = {}) {
	const res = await request(port, 'POST', '/rest/instance-ai/test/publish-events', {
		body: { threadId, userId, events, ensureThread },
		cookie,
	});
	if (res.status !== 200) throw new Error(`publish failed: ${JSON.stringify(res.body)}`);
}

const newThreadId = () =>
	'11111111-1111-4111-8111-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
const newRunId = () => `run_${Math.random().toString(16).slice(2, 10)}`;

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

async function scenarioReloadMidRun(port, cookie, userId, flagLabel) {
	const threadId = newThreadId();
	const runId = newRunId();
	const sse1 = openSse(port, threadId, cookie);
	await new Promise((r) => setTimeout(r, 300));
	await publish(port, cookie, userId, threadId, [runStart(runId, userId), ...step(runId, 0)], {
		ensureThread: true,
	});
	await sse1.waitFor((f) => f.data?.type === 'tool-result');
	const cursor = [...sse1.frames].reverse().find((f) => f.id !== undefined)?.id;
	sse1.close(); // reload: client goes away mid-run

	await publish(port, cookie, userId, threadId, [...step(runId, 1), runFinish(runId)]);

	const sse2 = openSse(port, threadId, cookie, { lastEventId: cursor });
	await sse2.waitFor((f) => f.data?.type === 'run-finish');
	sse2.close();
	const replayedTypes = sse2.frames.map((f) => f.data?.type).filter(Boolean);
	const sawStep1Facts =
		replayedTypes.includes('tool-call') && replayedTypes.includes('tool-result');
	return {
		scenario: 'R1 reload mid-run',
		flag: flagLabel,
		cursor,
		replayedEvents: sse2.frames.length,
		missedFactsReplayed: sawStep1Facts,
		pass: sawStep1Facts,
	};
}

async function scenarioRestartMidRun(ctx, flagOn) {
	// Publish half a run, SIGTERM (graceful: drain flush), boot a fresh process
	// on the SAME user folder, reconnect with the pre-restart cursor.
	const { port, userFolder } = ctx;
	let proc = ctx.proc;
	const { cookie, userId } = ctx.auth;
	const threadId = newThreadId();
	const runId = newRunId();

	const sse1 = openSse(port, threadId, cookie);
	await new Promise((r) => setTimeout(r, 300));
	await publish(port, cookie, userId, threadId, [runStart(runId, userId), ...step(runId, 0)], {
		ensureThread: true,
	});
	await sse1.waitFor((f) => f.data?.type === 'tool-result');
	const cursor = [...sse1.frames].reverse().find((f) => f.id !== undefined)?.id;
	sse1.close();

	await stopN8n(proc, 'SIGTERM');
	proc = await startN8n({ port, userFolder, durableLog: flagOn, label: 'restarted' });
	ctx.proc = proc;
	const auth = await setupAuth(port); // fresh cookie for the new process
	ctx.auth = auth;

	const sse2 = openSse(port, threadId, auth.cookie, { lastEventId: cursor });
	// Give replay a moment; flag off replays nothing, so don't block on it.
	await new Promise((r) => setTimeout(r, 1500));
	sse2.close();
	const replayedFrames = sse2.frames.filter((f) => f.id !== undefined);
	const messages = await request(port, 'GET', `/rest/instance-ai/threads/${threadId}/messages`, {
		cookie: auth.cookie,
	});
	const nextEventId = messages.body?.data?.nextEventId ?? messages.body?.nextEventId;
	// Flag on: the cursor survives the restart (seq continues from the DB),
	// replayed frames all sit past the cursor, and the startup sweep appends
	// run-finish{interrupted} for the half-run, so the replay carries it.
	// Flag off: the counter resets to 1 and nothing replays (the shipped bug,
	// demonstrated).
	const pass = flagOn
		? nextEventId > cursor &&
			replayedFrames.every((f) => f.id > cursor) &&
			replayedFrames.some((f) => f.data?.type === 'run-finish' && f.data?.payload?.status === 'interrupted')
		: replayedFrames.length === 0 && nextEventId === 1;
	return {
		scenario: 'R2 restart mid-run, reconnect with stale cursor',
		flag: flagOn ? 'on' : 'off',
		cursorBeforeRestart: cursor,
		replayedFactsAfterRestart: replayedFrames.length,
		replayedTypes: replayedFrames.map((f) => f.data?.type),
		nextEventIdAfterRestart: nextEventId,
		pass,
	};
}

async function scenarioKillNineSweep(ctx) {
	// Flag on only: publish run-start + in-flight tool-call (no finish), kill -9,
	// restart, wait for the startup sweep, verify interrupted facts in replay.
	const { port, userFolder } = ctx;
	const { cookie, userId } = ctx.auth;
	const threadId = newThreadId();
	const runId = newRunId();

	await publish(
		port,
		cookie,
		userId,
		threadId,
		[
			runStart(runId, userId),
			{
				type: 'tool-call',
				runId,
				agentId: orchestrator(runId),
				payload: { toolCallId: 'tc_inflight', toolName: 'update-workflow', args: { id: 'w1' } },
			},
		],
		{ ensureThread: true },
	);
	await new Promise((r) => setTimeout(r, 500)); // let the drain persist

	await stopN8n(ctx.proc, 'SIGKILL'); // kill -9
	ctx.proc = await startN8n({ port, userFolder, durableLog: true, label: 'post-crash' });
	ctx.auth = await setupAuth(port);

	// The sweep runs on module init; poll the log via SSE replay from 0.
	let facts = [];
	const deadline = Date.now() + 20_000;
	while (Date.now() < deadline) {
		const sse = openSse(port, threadId, ctx.auth.cookie, { lastEventId: 0 });
		await new Promise((r) => setTimeout(r, 1200));
		sse.close();
		facts = sse.frames.filter((f) => f.id !== undefined).map((f) => f.data);
		if (facts.some((e) => e?.type === 'run-finish')) break;
	}
	const interrupted = facts.find((e) => e?.type === 'tool-interrupted');
	const finish = facts.find((e) => e?.type === 'run-finish');
	const metrics = await request(port, 'GET', '/rest/instance-ai/test/durable-log-metrics', {});
	const sweep = metrics.body?.data?.sweep ?? metrics.body?.sweep;
	return {
		scenario: 'R4 kill -9 mid-run, startup sweep',
		flag: 'on',
		toolInterruptedFact: interrupted?.payload?.toolCallId === 'tc_inflight',
		runFinishStatus: finish?.payload?.status,
		sweepCounters: sweep,
		pass: interrupted !== undefined && finish?.payload?.status === 'interrupted',
	};
}

async function scenarioMidBlockReconnect(port, cookie, userId, flagLabel) {
	// Client sees part of a text segment live, disconnects, reconnects with the
	// cursor of the last durable fact. Flag on: replay carries a text-block
	// that REPLACES the partial deltas; total rendered text must not duplicate.
	const threadId = newThreadId();
	const runId = newRunId();
	const sse1 = openSse(port, threadId, cookie);
	await new Promise((r) => setTimeout(r, 300));
	// One completed step (gives a durable cursor), then a partial open segment.
	await publish(
		port,
		cookie,
		userId,
		threadId,
		[
			runStart(runId, userId),
			...step(runId, 0, { textDeltas: 2, reasoningDeltas: 0 }),
			{ type: 'text-delta', runId, agentId: orchestrator(runId), responseId: 'msg_open', payload: { text: 'AAA' } },
			{ type: 'text-delta', runId, agentId: orchestrator(runId), responseId: 'msg_open', payload: { text: 'BBB' } },
		],
		{ ensureThread: true },
	);
	await sse1.waitFor((f) => f.data?.payload?.text === 'BBB');
	const cursor = [...sse1.frames].reverse().find((f) => f.id !== undefined)?.id;
	const liveEvents = sse1.frames.map((f) => f.data);
	sse1.close();

	// Segment completes + run ends while the client is away.
	await publish(port, cookie, userId, threadId, [
		{ type: 'text-delta', runId, agentId: orchestrator(runId), responseId: 'msg_open', payload: { text: 'CCC' } },
		runFinish(runId),
	]);

	const sse2 = openSse(port, threadId, cookie, { lastEventId: cursor });
	await sse2.waitFor((f) => f.data?.type === 'run-finish');
	sse2.close();
	const replayEvents = sse2.frames.map((f) => f.data);

	// Fold live prefix + replay through the shared reducer semantics: count
	// occurrences of the partial text in the concatenation the client renders.
	// Without replace semantics AAA/BBB would appear twice (once live, once in
	// the replayed block).
	const textOf = (events) =>
		events
			.filter((e) => e?.type === 'text-delta' || e?.type === 'text-block')
			.map((e) => ({ type: e.type, text: e.payload.text, responseId: e.responseId }));
	return {
		scenario: 'R3 reconnect mid-block',
		flag: flagLabel,
		cursor,
		livePartial: textOf(liveEvents).filter((t) => t.responseId === 'msg_open'),
		replayed: textOf(replayEvents).filter((t) => t.responseId === 'msg_open'),
	};
}

async function scenarioFirstEventLatency(port, cookie, userId, flagLabel) {
	const samples = [];
	for (let i = 0; i < 15; i++) {
		const threadId = newThreadId();
		const runId = newRunId();
		const sse = openSse(port, threadId, cookie);
		await new Promise((r) => setTimeout(r, 200));
		const t0 = performance.now();
		await publish(port, cookie, userId, threadId, [runStart(runId, userId)], {
			ensureThread: true,
		});
		const frame = await sse.waitFor((f) => f.data?.type === 'run-start');
		sse.close();
		if (i >= 3) samples.push(frame.at - t0); // warmups excluded
	}
	return { scenario: 'L first-event latency (incl. HTTP publish)', flag: flagLabel, ...percentileStats(samples) };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function runArm(flagOn) {
	const label = flagOn ? 'on' : 'off';
	console.log(`\n=== arm: durableLog=${label} ===`);
	const port = 5700 + Math.floor(Math.random() * 200);
	const userFolder = mkdtempSync(path.join(tmpdir(), `n8n-durable-${label}-`));
	const ctx = { port, userFolder };
	ctx.proc = await startN8n({ port, userFolder, durableLog: flagOn, label: 'boot' });
	try {
		ctx.auth = await setupAuth(port);
		const { cookie, userId } = ctx.auth;

		const latency = await scenarioFirstEventLatency(port, cookie, userId, label);
		console.log('  ', latency.scenario, JSON.stringify(latency));
		recordResult(`behavior.latency.${label}`, latency);

		const r1 = await scenarioReloadMidRun(port, cookie, userId, label);
		console.log('  ', r1.scenario, r1.pass ? 'PASS' : 'FAIL');
		recordResult(`behavior.reloadMidRun.${label}`, r1);

		const r3 = await scenarioMidBlockReconnect(port, cookie, userId, label);
		console.log('  ', r3.scenario, 'recorded');
		recordResult(`behavior.midBlockReconnect.${label}`, r3);

		const r2 = await scenarioRestartMidRun(ctx, flagOn);
		console.log('  ', r2.scenario, 'recorded');
		recordResult(`behavior.restartMidRun.${label}`, r2);

		if (flagOn) {
			const r4 = await scenarioKillNineSweep(ctx);
			console.log('  ', r4.scenario, r4.pass ? 'PASS' : 'FAIL');
			recordResult('behavior.killNineSweep.on', r4);
		}
	} finally {
		await stopN8n(ctx.proc, 'SIGKILL');
		rmSync(userFolder, { recursive: true, force: true });
	}
}

const flagArg = process.argv.includes('--flag')
	? process.argv[process.argv.indexOf('--flag') + 1]
	: 'both';

if (flagArg === 'off' || flagArg === 'both') await runArm(false);
if (flagArg === 'on' || flagArg === 'both') await runArm(true);
console.log(`\nResults written to ${RESULTS_PATH}`);
