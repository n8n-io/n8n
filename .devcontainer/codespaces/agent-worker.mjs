#!/usr/bin/env node
// Poll worker for per-turn Claude Code conversations on a codespace.
// You cannot reach a codespace from outside. GitHub keeps forwarded ports
// private. So this worker calls out. It polls n8n for a turn addressed to this
// box's owner. It runs one `claude -p`. It sends the result to the turn's resume
// URL. Every call is outbound HTTPS to n8n. It opens no inbound port.
//
//   AGENT_WORKER_TOKEN=… N8N_DEQUEUE_URL=… node agent-worker.mjs
//
// Env:
//   N8N_DEQUEUE_URL     n8n webhook that hands back one pending turn (required)
//   AGENT_WORKER_TOKEN  shared bearer sent on every dequeue (required)
//   GITHUB_USER         box owner's login; the bootstrap route for a new thread (codespaces set this)
//   CODESPACE_NAME      stable box id; routes a thread back to the box holding its session (codespaces set this)
//   TURN_TIMEOUT_MS     per-turn limit; keep below the n8n Wait limit (default 25 min)
import { execFile } from 'node:child_process';
import { resolve as resolvePath, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEQUEUE_URL = process.env.N8N_DEQUEUE_URL;
const TOKEN = process.env.AGENT_WORKER_TOKEN;
const GITHUB_USER = process.env.GITHUB_USER;
const BOX_ID = process.env.CODESPACE_NAME;
const ROOT = '/workspaces';

const POLL_INTERVAL_MS = 3000;

// Warn and use the default on a bad value, so a config mistake cannot silently
// disable the turn limit.
function posNum(name, fallback) {
	const raw = process.env[name];
	if (raw === undefined) return fallback;
	const n = Number(raw);
	if (Number.isFinite(n) && n > 0) return n;
	console.error(`${name} is not a positive number ("${raw}"); using ${fallback}.`);
	return fallback;
}

// Keep this below the n8n Wait-node limit. Then the worker reports a slow turn
// before n8n's Wait ends with a generic message.
const TURN_TIMEOUT_MS = posNum('TURN_TIMEOUT_MS', 25 * 60_000);

for (const [k, v] of Object.entries({
	N8N_DEQUEUE_URL: DEQUEUE_URL,
	AGENT_WORKER_TOKEN: TOKEN,
	GITHUB_USER,
})) {
	if (!v) {
		console.error(`Refusing to start: ${k} is not set.`);
		process.exit(1);
	}
}

function runClaude({ message, sessionId, cwd }) {
	const safeCwd = resolvePath(typeof cwd === 'string' && cwd ? cwd : `${ROOT}/n8n`);
	if (safeCwd !== ROOT && !safeCwd.startsWith(ROOT + sep))
		throw new Error(`cwd must be under ${ROOT}`);
	const args = ['-p', '--output-format', 'json', '--dangerously-skip-permissions'];
	if (sessionId) args.push('--resume', sessionId);
	args.push(message);
	return new Promise((res, rej) => {
		execFile(
			'claude',
			args,
			{ cwd: safeCwd, timeout: TURN_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
			(err, stdout, stderr) => {
				try {
					res(JSON.parse(stdout));
				} catch {
					if (err?.killed)
						rej(
							new Error(
								`The turn passed the ${Math.round(TURN_TIMEOUT_MS / 60_000)}-minute limit and stopped. It may have been in a build. Do a smaller step, or run a long build in its own turn.`,
							),
						);
					else rej(new Error(stderr?.trim() || err?.message || 'claude produced no output'));
				}
			},
		);
	});
}

async function post(url, body) {
	return fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(20_000),
	});
}

async function dequeue() {
	const res = await post(DEQUEUE_URL, { githubUser: GITHUB_USER, boxId: BOX_ID, token: TOKEN });
	if (!res.ok) throw new Error(`dequeue HTTP ${res.status}`);
	const text = await res.text();
	if (!text.trim()) return null; // no pending turn
	const turn = JSON.parse(text);
	return turn?.turnId ? turn : null;
}

async function handle(turn) {
	let result;
	try {
		const r = await runClaude(turn);
		result = {
			turnId: turn.turnId,
			status: 'done',
			output: r.result ?? '',
			sessionId: r.session_id ?? turn.sessionId ?? '',
			boxId: BOX_ID,
		};
	} catch (error) {
		result = {
			turnId: turn.turnId,
			status: 'error',
			output: error.message,
			sessionId: turn.sessionId ?? '',
			boxId: BOX_ID,
		};
	}
	// Send the result to the turn's resume URL. This continues the waiting n8n
	// execution. Retry on a failed status or a network error, so a transient
	// failure does not drop the result and leave the turn to time out.
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const res = await post(turn.resumeUrl, result);
			if (res.ok) return;
			console.error(`turn ${turn.turnId}: result POST got HTTP ${res.status} (attempt ${attempt})`);
		} catch (error) {
			console.error(
				`turn ${turn.turnId}: result POST failed (attempt ${attempt}): ${error.message}`,
			);
		}
		await sleep(2000 * attempt);
	}
	console.error(`turn ${turn.turnId}: result not delivered after 3 attempts`);
}

console.log(`agent-worker polling as ${GITHUB_USER} every ${POLL_INTERVAL_MS}ms`);
for (;;) {
	try {
		const turn = await dequeue();
		if (turn) {
			console.log(
				`${new Date().toISOString()} turn ${turn.turnId} by ${turn.author ?? 'unknown'}: ${turn.sessionId ? 'resume' : 'new'}`,
			);
			await handle(turn);
			continue; // get the next turn now, with no delay
		}
	} catch (error) {
		console.error(`poll error: ${error.message}`);
	}
	await sleep(POLL_INTERVAL_MS);
}
