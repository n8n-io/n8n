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
//   GITHUB_USER         box owner's login; the bootstrap route for a new thread (see codespace-env.mjs)
//   CODESPACE_NAME      stable box id; routes a thread back to the box holding its session (same source)
//   TURN_TIMEOUT_MS     per-turn limit; keep below the n8n Wait limit (default 25 min)
import { execFile } from 'node:child_process';
import { resolve as resolvePath, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { codespaceEnv } from '../../scripts/codespace-env.mjs';

const DEQUEUE_URL = process.env.N8N_DEQUEUE_URL;
const TOKEN = process.env.AGENT_WORKER_TOKEN;
// Read both identities from the codespace. tmux can give an empty copy of either.
const GITHUB_USER = codespaceEnv('GITHUB_USER');
const BOX_ID = codespaceEnv('CODESPACE_NAME');
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

// Not fatal, but box pinning needs it: without a box id every turn routes by
// owner, so a thread cannot follow the box holding its session.
if (!BOX_ID)
	console.error(
		'CODESPACE_NAME did not resolve — box pinning disabled; turns route by githubUser only.',
	);

// A turn gets a copy of this environment. Put the correct values in it, because
// `pnpm dev:up` and `gh -c $CODESPACE_NAME` in the session need them.
const TURN_ENV = { ...process.env };
if (BOX_ID) TURN_ENV.CODESPACE_NAME = BOX_ID;
if (GITHUB_USER) TURN_ENV.GITHUB_USER = GITHUB_USER;

const CODESPACE_DOCS = '.devcontainer/codespaces/README.md';

// A session cannot be told any of this after its final message, and a system
// prompt is not part of the resumed transcript, so send it on every turn. State
// the turn's hard limits inline: a session that has to read a file to learn them
// can reply before it gets there. Point at the box docs for the rest — they
// already cover dev:up, ports, and build cost, and AGENTS.md does not.
function turnContract(author) {
	return [
		'# Your runtime',
		'You are one turn of a Slack thread, driven by an n8n workflow that runs you as a headless',
		'`claude -p` on a GitHub codespace. Your final message is the reply that reaches Slack, so keep',
		'it short and skip heavy markdown.',
		author ? `You are replying to ${author}.` : '',
		'',
		'# A turn is atomic',
		'The turn ends when you emit your final message, and everything you started ends with it:',
		'background Bash tasks are killed, Monitor events never arrive, PushNotification has nowhere to',
		'go, and ScheduleWakeup never fires. You get no turn of your own afterwards — you cannot speak',
		'again until a human writes again. So run long work (builds, test suites, restarts) in the',
		'foreground of this turn and wait for it, or do not start it at all. Never end a turn promising',
		`to verify, check back, or follow up. Work that will not fit the turn limit of ~${Math.round(
			TURN_TIMEOUT_MS / 60_000,
		)} minutes`,
		'should be split: do the part that fits, then say what to ask for next.',
		'',
		'# This box',
		`You are on codespace ${BOX_ID ?? '(unknown)'}, not a laptop. Before you build, start, or expose`,
		`the app, read ${CODESPACE_DOCS} ("Build and run the app in a session"). It is box-specific and`,
		'the repo AGENTS.md does not cover it.',
	]
		.filter(Boolean)
		.join('\n');
}

function runClaude({ message, sessionId, cwd, author }) {
	const safeCwd = resolvePath(typeof cwd === 'string' && cwd ? cwd : `${ROOT}/n8n`);
	if (safeCwd !== ROOT && !safeCwd.startsWith(ROOT + sep))
		throw new Error(`cwd must be under ${ROOT}`);
	const args = [
		'-p',
		'--output-format',
		'json',
		'--dangerously-skip-permissions',
		'--append-system-prompt',
		turnContract(typeof author === 'string' ? author : ''),
	];
	if (sessionId) args.push('--resume', sessionId);
	args.push(message);
	return new Promise((res, rej) => {
		execFile(
			'claude',
			args,
			{ cwd: safeCwd, env: TURN_ENV, timeout: TURN_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
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
