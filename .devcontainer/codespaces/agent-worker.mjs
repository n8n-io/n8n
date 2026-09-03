#!/usr/bin/env node
// Poll worker for per-turn OpenCode conversations on a codespace.
// You cannot reach a codespace from outside. GitHub keeps forwarded ports
// private. So this worker calls out. It polls n8n for a turn addressed to this
// box's owner. It runs one OpenCode turn. It sends the result to the turn's
// resume URL. Every external call is outbound HTTPS. It opens no inbound port.
//
//   AGENT_WORKER_TOKEN=… N8N_DEQUEUE_URL=… node agent-worker.mjs
//
// Env:
//   N8N_DEQUEUE_URL     n8n webhook that hands back one pending turn (required)
//   AGENT_WORKER_TOKEN  shared bearer sent on every dequeue (required)
//   GITHUB_USER         box owner's login; the bootstrap route for a new thread (see codespace-env.mjs)
//   CODESPACE_NAME      stable box id; routes a thread back to the box holding its session (same source)
//   SLACK_BOT_TOKEN     bot token for progress updates (optional; needs chat:write)
//   TURN_TIMEOUT_MS     per-turn limit; keep below the n8n Wait limit (default 25 min)
import { spawn } from 'node:child_process';
import { resolve as resolvePath, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { codespaceEnv } from '../../scripts/codespace-env.mjs';

const DEQUEUE_URL = process.env.N8N_DEQUEUE_URL;
const TOKEN = process.env.AGENT_WORKER_TOKEN;
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
// Read both identities from the codespace. tmux can give an empty copy of either.
const GITHUB_USER = codespaceEnv('GITHUB_USER');
const BOX_ID = codespaceEnv('CODESPACE_NAME');
const ROOT = '/workspaces';

const POLL_INTERVAL_MS = 3000;
const SLACK_UPDATE_INTERVAL_MS = 1500;

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

export function openCodeEnvironment(environment) {
	const childEnvironment = { ...environment };
	delete childEnvironment.AGENT_WORKER_TOKEN;
	delete childEnvironment.N8N_DEQUEUE_URL;
	delete childEnvironment.SLACK_BOT_TOKEN;
	return childEnvironment;
}

// Keep broker credentials out of the agent's shell while preserving its model,
// GitHub, and tool credentials.
const TURN_ENV = openCodeEnvironment(process.env);
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
		'OpenCode session on a GitHub codespace. Your final message is the reply that reaches Slack, so keep',
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

function safeCwd(cwd) {
	const safeCwd = resolvePath(typeof cwd === 'string' && cwd ? cwd : `${ROOT}/n8n`);
	if (safeCwd !== ROOT && !safeCwd.startsWith(ROOT + sep))
		throw new Error(`cwd must be under ${ROOT}`);
	return safeCwd;
}

function stopProcessTree(child, signal) {
	if (!child.pid) return;
	try {
		process.kill(-child.pid, signal);
	} catch {
		child.kill(signal);
	}
}

function eventError(event) {
	return event.error?.data?.message ?? event.error?.message ?? event.error?.name;
}

export function runOpenCode(
	{ message, sessionId, cwd, author },
	onEvent,
	onSession,
	{
		spawnProcess = spawn,
		stopProcess = stopProcessTree,
		timeout = TURN_TIMEOUT_MS,
		killDelay = 5000,
		retryMissingSession = true,
	} = {},
) {
	const directory = safeCwd(cwd);
	const requestedSessionId =
		typeof sessionId === 'string' && sessionId.startsWith('ses_') ? sessionId : '';
	const args = ['run', '--format', 'json', '--auto'];
	if (requestedSessionId) args.push('--session', requestedSessionId);

	return new Promise((resolve, reject) => {
		const child = spawnProcess('opencode', args, {
			cwd: directory,
			detached: true,
			env: TURN_ENV,
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		let activeSessionId = requestedSessionId;
		let buffer = '';
		let stderr = '';
		let error = '';
		const text = [];
		let timedOut = false;
		let forceTimer;
		const timer = setTimeout(() => {
			timedOut = true;
			stopProcess(child, 'SIGTERM');
			forceTimer = setTimeout(() => stopProcess(child, 'SIGKILL'), killDelay);
			forceTimer.unref?.();
		}, timeout);

		const consume = (line) => {
			if (!line.trim()) return;
			let event;
			try {
				event = JSON.parse(line);
			} catch {
				console.error(`OpenCode output ignored: ${line.slice(0, 200)}`);
				return;
			}
			if (!activeSessionId && typeof event.sessionID === 'string') {
				activeSessionId = event.sessionID;
				onSession(activeSessionId);
			}
			if (event.sessionID !== activeSessionId) return;
			onEvent(activeSessionId, event);
			if (event.type === 'text' && typeof event.part?.text === 'string') text.push(event.part.text);
			if (event.type === 'error') error = eventError(event) || 'OpenCode failed';
		};

		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			buffer += chunk;
			const lines = buffer.split(/\r?\n/);
			buffer = lines.pop() ?? '';
			for (const line of lines) consume(line);
		});
		child.stderr.setEncoding('utf8');
		child.stderr.on('data', (chunk) => (stderr = `${stderr}${chunk}`.slice(-4000)));
		child.once('error', (processError) => {
			clearTimeout(timer);
			if (forceTimer && !timedOut) clearTimeout(forceTimer);
			reject(processError);
		});
		child.once('close', (code) => {
			clearTimeout(timer);
			if (forceTimer && !timedOut) clearTimeout(forceTimer);
			consume(buffer);
			if (timedOut) {
				reject(new Error(`OpenCode timed out after ${timeout}ms`));
				return;
			}
			if (code !== 0 || error) {
				const failureMessage = error || stderr.trim() || `OpenCode exited with ${code}`;
				if (
					requestedSessionId &&
					retryMissingSession &&
					/session not found/i.test(failureMessage)
				) {
					runOpenCode({ message, sessionId: '', cwd, author }, onEvent, onSession, {
						spawnProcess,
						stopProcess,
						timeout,
						killDelay,
						retryMissingSession: false,
					}).then(resolve, reject);
					return;
				}
				reject(new Error(failureMessage));
				return;
			}
			if (!activeSessionId) {
				reject(new Error('OpenCode did not return a session id'));
				return;
			}
			resolve({ result: text.join('\n').trim(), session_id: activeSessionId });
		});

		child.stdin.end(
			`${turnContract(typeof author === 'string' ? author : '')}\n\n# Request\n${message}`,
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

async function slackApi(method, body) {
	const res = await fetch(`https://slack.com/api/${method}`, {
		method: 'POST',
		headers: { authorization: `Bearer ${SLACK_TOKEN}`, 'content-type': 'application/json' },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(20_000),
	});
	const result = await res.json();
	if (!res.ok || !result.ok) throw new Error(result.error || `HTTP ${res.status}`);
	return result;
}

function progressText(tools, textParts) {
	const progress = [...tools.values()].slice(-6).map(({ status, title }) => {
		if (status === 'completed') return `Done: ${title}`;
		if (status === 'error') return `Failed: ${title}`;
		return `Working: ${title}`;
	});
	const answer = [...textParts.values()].join('').trim();
	const prefix = progress.length ? progress.join('\n') : 'Flaky is working…';
	const remaining = Math.max(0, 3900 - prefix.length - 2);
	return answer ? `${prefix}\n\n${answer.slice(-remaining)}` : prefix;
}

export async function startSlackProgress(
	turn,
	{ token = SLACK_TOKEN, callSlack = slackApi, updateInterval = SLACK_UPDATE_INTERVAL_MS } = {},
) {
	const channel = turn.slack?.channel;
	const threadTs = turn.slack?.thread_ts;
	if (!token || typeof channel !== 'string' || typeof threadTs !== 'string') {
		return { event() {}, async finish() {} };
	}

	let message;
	try {
		message = await callSlack('chat.postMessage', {
			channel,
			thread_ts: threadTs,
			text: 'Flaky is working…',
		});
	} catch (error) {
		console.error(`turn ${turn.turnId}: Slack placeholder failed: ${error.message}`);
		return { event() {}, async finish() {} };
	}

	const textParts = new Map();
	const tools = new Map();
	let timer;
	let inFlight = Promise.resolve();
	let lastUpdate = 0;
	let stopped = false;

	const update = (text) =>
		callSlack('chat.update', { channel, ts: message.ts, text }).catch((error) =>
			console.error(`turn ${turn.turnId}: Slack update failed: ${error.message}`),
		);
	const schedule = () => {
		if (stopped || timer) return;
		const delay = Math.max(0, lastUpdate + updateInterval - Date.now());
		timer = setTimeout(() => {
			timer = undefined;
			lastUpdate = Date.now();
			inFlight = update(progressText(tools, textParts));
		}, delay);
	};

	return {
		event(sessionId, event) {
			if (event?.sessionID !== sessionId || !event.part?.id) return;
			if (event.type === 'text' && typeof event.part.text === 'string') {
				textParts.set(event.part.id, event.part.text);
				schedule();
			} else if (event.type === 'tool_use') {
				tools.set(event.part.id, {
					status: event.part.state?.status,
					title: event.part.state?.title || event.part.tool,
				});
				schedule();
			}
		},
		async finish(text) {
			stopped = true;
			if (timer) clearTimeout(timer);
			await inFlight;
			const delay = Math.max(0, lastUpdate + updateInterval - Date.now());
			if (delay) await sleep(delay);
			lastUpdate = Date.now();
			await update(text.slice(0, 3900) || 'OpenCode completed the turn');
		},
	};
}

async function handle(turn) {
	let result;
	let activeSessionId = turn.sessionId ?? '';
	const progress = await startSlackProgress(turn);
	try {
		const r = await runOpenCode(turn, progress.event, (sessionId) => (activeSessionId = sessionId));
		result = {
			turnId: turn.turnId,
			status: 'done',
			output: r.result ?? '',
			sessionId: r.session_id ?? activeSessionId,
			boxId: BOX_ID,
		};
	} catch (error) {
		const timedOut = error.message.includes(`timed out after ${TURN_TIMEOUT_MS}ms`);
		result = {
			turnId: turn.turnId,
			status: 'error',
			output: timedOut
				? `The turn passed the ${Math.round(TURN_TIMEOUT_MS / 60_000)}-minute limit and stopped. It may have been in a build. Do a smaller step, or run a long build in its own turn.`
				: error.message,
			sessionId: activeSessionId,
			boxId: BOX_ID,
		};
	}
	await progress.finish(result.output);
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

async function main() {
	for (const [key, value] of Object.entries({
		N8N_DEQUEUE_URL: DEQUEUE_URL,
		AGENT_WORKER_TOKEN: TOKEN,
		GITHUB_USER,
	})) {
		if (!value) {
			console.error(`Refusing to start: ${key} is not set.`);
			process.exit(1);
		}
	}

	// Without a box id, a thread cannot follow the box that holds its session.
	if (!BOX_ID)
		console.error(
			'CODESPACE_NAME did not resolve — box pinning disabled; turns route by githubUser only.',
		);
	if (!SLACK_TOKEN)
		console.error(
			'SLACK_BOT_TOKEN is not set. Turns will complete without Slack progress updates.',
		);

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
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
