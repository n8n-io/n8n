#!/usr/bin/env node
/**
 * Durable-log crash-resume against a REAL Anthropic model (thinking enabled):
 * boot n8n (flag on), start a real multi-tool orchestrator run, kill -9 once a
 * step checkpoint exists and the run is still going, restart, and verify the
 * startup sweep crash-resumes the run to completion under its original runId.
 * Completion without provider signature/400 errors is the thinking-signature
 * fidelity check: the resumed model call replays the checkpointed message
 * list, thinking blocks and signatures included.
 *
 * Requires ANTHROPIC_API_KEY in the environment (never printed).
 * Usage: node packages/cli/scripts/durable-log-harness/real-crash-resume.mjs
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_DIR = path.resolve(__dirname, '..', '..');
const RESULTS_PATH =
	process.env.DURABLE_LOG_RESULTS ?? path.join(tmpdir(), 'durable-log-behavior.json');
const MODEL = process.env.REAL_CRASH_RESUME_MODEL ?? 'anthropic/claude-sonnet-4-6';

if (!process.env.ANTHROPIC_API_KEY) {
	console.error('ANTHROPIC_API_KEY is not set; aborting.');
	process.exit(2);
}

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
		} catch {
			// start fresh
		}
	}
	all[section] = data;
	writeFileSync(RESULTS_PATH, JSON.stringify(all, null, 1));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function request(port, method, urlPath, { body, cookie, timeoutMs = 20000 } = {}) {
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
		req.on('timeout', () => req.destroy(new Error(`timeout: ${method} ${urlPath}`)));
		if (data) req.write(data);
		req.end();
	});
}

async function startN8n({ port, userFolder, label }) {
	const child = spawn(process.execPath, [path.join(CLI_DIR, 'bin', 'n8n'), 'start'], {
		cwd: CLI_DIR,
		env: {
			...process.env,
			N8N_USER_FOLDER: userFolder,
			N8N_PORT: String(port),
			N8N_RUNNERS_BROKER_PORT: String(port + 1000),
			N8N_LOG_LEVEL: 'info',
			N8N_LOG_SCOPES: 'instance-ai',
			N8N_DIAGNOSTICS_ENABLED: 'false',
			N8N_RUNNERS_ENABLED: 'false',
			E2E_TESTS: 'true',
			NODE_ENV: 'development',
			N8N_ENABLED_MODULES: 'instance-ai',
			N8N_INSTANCE_AI_LOCAL_GATEWAY_DISABLED: 'true',
			N8N_INSTANCE_AI_DURABLE_LOG: 'true',
			N8N_INSTANCE_AI_MODEL: MODEL,
			N8N_INSTANCE_AI_MODEL_API_KEY: process.env.ANTHROPIC_API_KEY,
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
			const res = await request(port, 'GET', '/rest/settings', { timeoutMs: 2000 });
			if (res.status === 200 && typeof res.body === 'object') {
				console.log(`  [${label}] n8n up on :${port}`);
				return { child, getOutput: () => output };
			}
		} catch {
			// still booting
		}
		if (child.exitCode !== null) {
			throw new Error(`n8n exited early (${child.exitCode}):\n${output.slice(-4000)}`);
		}
		await sleep(500);
	}
	child.kill('SIGKILL');
	throw new Error(`n8n did not become healthy:\n${output.slice(-4000)}`);
}

async function stopN8n(proc, signal) {
	if (proc.child.exitCode !== null) return;
	proc.child.kill(signal);
	if (signal === 'SIGKILL') {
		await sleep(300);
		return;
	}
	const deadline = Date.now() + 30_000;
	while (proc.child.exitCode === null && Date.now() < deadline) await sleep(250);
	if (proc.child.exitCode === null) proc.child.kill('SIGKILL');
}

async function setupAuth(port) {
	const setup = await request(port, 'POST', '/rest/owner/setup', { body: OWNER });
	let cookie;
	let userId;
	if (setup.status === 200) {
		cookie = (setup.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]).join('; ');
		userId = setup.body.data?.id ?? setup.body.id;
	} else {
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

function dbPath(userFolder) {
	// N8N_USER_FOLDER holds a .n8n directory with the sqlite DB inside.
	return path.join(userFolder, '.n8n', 'database.sqlite');
}

function sqliteCount(userFolder, query) {
	const db = dbPath(userFolder);
	const out = execFileSync('sqlite3', ['-readonly', db, query], { encoding: 'utf8' });
	return Number(out.trim() || '0');
}

function openSse(port, threadId, cookie, { lastEventId } = {}) {
	const frames = [];
	const req = http.request(
		{
			host: '127.0.0.1',
			port,
			method: 'GET',
			path: `/rest/instance-ai/events/${threadId}${
				lastEventId !== undefined ? `?lastEventId=${lastEventId}` : ''
			}`,
			headers: { accept: 'text/event-stream', cookie },
		},
		(res) => {
			let buffer = '';
			res.on('data', (chunk) => {
				buffer += chunk.toString('utf8');
				let idx;
				while ((idx = buffer.indexOf('\n\n')) >= 0) {
					const raw = buffer.slice(0, idx);
					buffer = buffer.slice(idx + 2);
					if (raw.startsWith(':')) continue;
					const frame = {};
					for (const line of raw.split('\n')) {
						if (line.startsWith('id: ')) frame.id = Number(line.slice(4));
						else if (line.startsWith('data: ')) {
							try {
								frame.data = JSON.parse(line.slice(6));
							} catch {
								frame.data = line.slice(6);
							}
						}
					}
					if (frame.data !== undefined) frames.push(frame);
				}
			});
		},
	);
	req.end();
	return { frames, close: () => req.destroy() };
}

const newThreadId = () =>
	'33333333-3333-4333-8333-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');

const PROMPT =
	'Please do this step by step using your tools: first count how many workflows exist in this ' +
	'instance, then list which credentials exist, then check what data tables exist, and finally ' +
	'summarize everything you found in one short paragraph.';

async function main() {
	const port = 5900 + Math.floor(Math.random() * 90);
	const userFolder = mkdtempSync(path.join(tmpdir(), 'n8n-durable-real-'));
	let proc = await startN8n({ port, userFolder, label: 'boot' });
	let result;
	try {
		let auth = await setupAuth(port);
		let runId;
		let killedMidRun = false;

		for (let attempt = 1; attempt <= 3 && !killedMidRun; attempt++) {
			const threadId = newThreadId();
			await request(port, 'POST', '/rest/instance-ai/test/publish-events', {
				cookie: auth.cookie,
				body: { threadId, userId: auth.userId, ensureThread: true, events: [] },
			});
			const chat = await request(port, 'POST', `/rest/instance-ai/chat/${threadId}`, {
				cookie: auth.cookie,
				body: { message: PROMPT, timeZone: 'Europe/Madrid' },
			});
			runId = chat.body?.data?.runId ?? chat.body?.runId;
			if (!runId) throw new Error(`chat failed: ${JSON.stringify(chat.body).slice(0, 300)}`);
			console.log(`  [attempt ${attempt}] real run started: ${runId}`);

			// Crash window: a step checkpoint exists AND the run has no terminal
			// fact yet. Poll fast; a real model finishes in tens of seconds.
			const deadline = Date.now() + 90_000;
			while (Date.now() < deadline) {
				const checkpoints = sqliteCount(
					userFolder,
					"SELECT COUNT(*) FROM instance_ai_checkpoints WHERE expiredAt IS NULL AND json_extract(state, '$.status') = 'running'",
				);
				const finished = sqliteCount(
					userFolder,
					`SELECT COUNT(*) FROM instance_ai_events WHERE runId='${runId}' AND type='run-finish'`,
				);
				if (finished > 0) break; // too fast, retry with a fresh thread
				if (checkpoints > 0) {
					await sleep(500); // let the next model call take off
					await stopN8n(proc, 'SIGKILL');
					killedMidRun = true;
					console.log('  killed -9 mid-run after the step checkpoint');
					break;
				}
				await sleep(300);
			}
			if (!killedMidRun) {
				const finished = sqliteCount(
					userFolder,
					`SELECT COUNT(*) FROM instance_ai_events WHERE runId='${runId}' AND type='run-finish'`,
				);
				console.log(
					`  [attempt ${attempt}] no crash window (finished=${finished}); retrying with a new thread`,
				);
			}
		}
		if (!killedMidRun) throw new Error('never reached a crash window in 3 attempts');

		// Restart and let the startup sweep claim + crash-resume the run.
		proc = await startN8n({ port, userFolder, label: 'post-crash' });
		auth = await setupAuth(port);

		let sweep;
		const sweepDeadline = Date.now() + 60_000;
		while (Date.now() < sweepDeadline) {
			const metrics = await request(port, 'GET', '/rest/instance-ai/test/durable-log-metrics', {});
			sweep = metrics.body?.data?.sweep ?? metrics.body?.sweep;
			if ((sweep?.runsCrashResumed ?? 0) > 0 || (sweep?.runsMarkedInterrupted ?? 0) > 0) break;
			await sleep(1000);
		}

		// Wait for the resumed run's own terminal fact (real model latency).
		let finish;
		let facts = [];
		const finishDeadline = Date.now() + 180_000;
		while (Date.now() < finishDeadline) {
			const finished = sqliteCount(
				userFolder,
				`SELECT COUNT(*) FROM instance_ai_events WHERE runId='${runId}' AND type='run-finish'`,
			);
			if (finished > 0) break;
			await sleep(1500);
		}
		// Read the run's facts (threadId recovered from the log row).
		const db = dbPath(userFolder);
		const threadId = execFileSync(
			'sqlite3',
			['-readonly', db, `SELECT threadId FROM instance_ai_events WHERE runId='${runId}' LIMIT 1`],
			{ encoding: 'utf8' },
		).trim();
		const sse = openSse(port, threadId, auth.cookie, { lastEventId: 0 });
		await sleep(2500);
		sse.close();
		facts = sse.frames.filter((f) => f.id !== undefined).map((f) => f.data);
		finish = facts.find((e) => e?.type === 'run-finish' && e.runId === runId);
		const resumeMarker = facts.some(
			(e) =>
				e?.type === 'text-block' &&
				typeof e?.payload?.text === 'string' &&
				e.payload.text.includes('Resumed after an unexpected restart'),
		);
		const toolCalls = facts.filter((e) => e?.type === 'tool-call').length;

		const messages = await request(
			port,
			'GET',
			`/rest/instance-ai/threads/${threadId}/messages`,
			{ cookie: auth.cookie },
		);
		const msgs = messages.body?.data?.messages ?? messages.body?.messages ?? [];

		// Thinking-signature fidelity: the resumed call replayed the checkpointed
		// list (thinking blocks + signatures). Any tampering surfaces as a
		// provider 400 mentioning signatures; scan the post-crash process logs.
		const logs = proc.getOutput();
		const signatureErrors = (
			logs.match(/signature|AI_APICallError|invalid_request_error/gi) ?? []
		).length;

		result = {
			scenario: 'R6 real crash-resume (REAL Anthropic model, thinking enabled)',
			model: MODEL,
			runId,
			sweepCounters: sweep,
			runFinishStatus: finish?.payload?.status,
			resumeMarkerSeen: resumeMarker,
			realToolCallsInLog: toolCalls,
			assistantMessages: msgs.filter((m) => m.role === 'assistant').length,
			providerSignatureErrorsInLogs: signatureErrors,
			pass:
				(sweep?.runsCrashResumed ?? 0) >= 1 &&
				finish?.payload?.status === 'completed' &&
				resumeMarker &&
				signatureErrors === 0,
		};
		console.log('  RESULT:', JSON.stringify(result));
		recordResult('behavior.realCrashResumeAnthropic.on', result);
	} finally {
		await stopN8n(proc, 'SIGKILL');
		rmSync(userFolder, { recursive: true, force: true });
	}
	if (!result?.pass) process.exit(1);
}

await main();
