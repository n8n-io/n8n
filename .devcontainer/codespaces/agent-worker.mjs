#!/usr/bin/env node
// Outbound poll worker for per-turn Claude Code conversations on a codespace.
// The codespace can't be reached inbound (GitHub port ACL), so this reaches
// OUT: it polls n8n for a pending turn addressed to this box's owner, runs one
// `claude -p`, and POSTs the result to the turn's resume URL. All calls are
// outbound HTTPS to n8n — no inbound, no tunnel, no port to expose.
//
//   AGENT_WORKER_TOKEN=… N8N_DEQUEUE_URL=… node agent-worker.mjs
//
// Env:
//   N8N_DEQUEUE_URL     n8n webhook that hands back one pending turn (required)
//   AGENT_WORKER_TOKEN  shared bearer sent on every dequeue (required)
//   GITHUB_USER         box owner's login; turns are addressed to it (codespaces set this)
//   AGENT_WORKER_ROOT   confine turn cwd under here (default /workspaces)
//   POLL_INTERVAL_MS    delay between empty polls (default 3000)
import { execFile } from 'node:child_process';
import { resolve as resolvePath, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DEQUEUE_URL = process.env.N8N_DEQUEUE_URL;
const TOKEN = process.env.AGENT_WORKER_TOKEN;
const GITHUB_USER = process.env.GITHUB_USER;
const ROOT = resolvePath(process.env.AGENT_WORKER_ROOT ?? '/workspaces');
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 3000);
// Keep this BELOW the n8n Wait-node timeout, so a slow turn is reported by the
// worker (with a real message) before n8n's Wait expires with a generic one.
const TURN_TIMEOUT_MS = Number(process.env.TURN_TIMEOUT_MS ?? 25 * 60_000);

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
								`Turn exceeded the ${Math.round(TURN_TIMEOUT_MS / 60_000)}-minute limit and was stopped (it may have been mid-build). Try a smaller step, or run long builds in their own turn.`,
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
	const res = await post(DEQUEUE_URL, { githubUser: GITHUB_USER, token: TOKEN });
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
		};
	} catch (error) {
		result = {
			turnId: turn.turnId,
			status: 'error',
			output: error.message,
			sessionId: turn.sessionId ?? '',
		};
	}
	// Deliver straight to the turn's resume URL (resumes the waiting n8n execution).
	try {
		await post(turn.resumeUrl, result);
	} catch (error) {
		console.error(`turn ${turn.turnId}: result POST failed: ${error.message}`);
	}
}

console.log(`agent-worker polling as ${GITHUB_USER} every ${POLL_INTERVAL_MS}ms`);
for (;;) {
	try {
		const turn = await dequeue();
		if (turn) {
			console.log(`turn ${turn.turnId}: ${turn.sessionId ? 'resume' : 'new'}`);
			await handle(turn);
			continue; // pull the next turn immediately, no delay
		}
	} catch (error) {
		console.error(`poll error: ${error.message}`);
	}
	await sleep(POLL_INTERVAL_MS);
}
