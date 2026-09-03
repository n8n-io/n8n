#!/usr/bin/env node
// GitHub keeps Codespaces ports private, so inbound delivery is not available.
import { spawn } from 'node:child_process';
import { resolve as resolvePath, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { codespaceEnv } from '../../scripts/codespace-env.mjs';

const DEQUEUE_URL = process.env.N8N_DEQUEUE_URL;
const TOKEN = process.env.AGENT_WORKER_TOKEN;
const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
// tmux can retain empty identity values, but the Codespaces files stay current.
const GITHUB_USER = codespaceEnv('GITHUB_USER');
const BOX_ID = codespaceEnv('CODESPACE_NAME');
const ROOT = '/workspaces';

const POLL_INTERVAL_MS = 3000;
const SLACK_UPDATE_INTERVAL_MS = 1500;
const SLACK_TEXT_LIMIT = 3900;
const OPENCODE_CONFIG_CONTENT = JSON.stringify({
	provider: { openrouter: { options: { apiKey: '{env:OPENROUTER_API_KEY}' } } },
});

function posNum(name, fallback) {
	const raw = process.env[name];
	if (raw === undefined) return fallback;
	const n = Number(raw);
	if (Number.isFinite(n) && n > 0) return n;
	console.error(`${name} is not a positive number ("${raw}"); using ${fallback}.`);
	return fallback;
}

// This limit expires before n8n's Wait node so that the user receives a specific error.
const TURN_TIMEOUT_MS = posNum('TURN_TIMEOUT_MS', 25 * 60_000);
function turnTimeoutMessage(timeout) {
	const duration = timeout % 60_000 === 0 ? `${timeout / 60_000}-minute` : `${timeout}-millisecond`;
	return `The turn passed the ${duration} limit and stopped. It may have been in a build. Do a smaller step, or run a long build in its own turn.`;
}

export function openCodeEnvironment(environment) {
	const childEnvironment = { ...environment };
	delete childEnvironment.AGENT_WORKER_TOKEN;
	delete childEnvironment.N8N_DEQUEUE_URL;
	delete childEnvironment.SLACK_BOT_TOKEN;
	childEnvironment.OPENCODE_CONFIG_CONTENT = OPENCODE_CONFIG_CONTENT;
	return childEnvironment;
}

// OpenCode does not need the credentials that control the broker.
const TURN_ENV = openCodeEnvironment(process.env);
if (BOX_ID) TURN_ENV.CODESPACE_NAME = BOX_ID;
if (GITHUB_USER) TURN_ENV.GITHUB_USER = GITHUB_USER;

const CODESPACE_DOCS = '.devcontainer/codespaces/README.md';

// The worker has no later turn, so each prompt must define the atomic runtime contract.
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
	} = {},
) {
	const directory = safeCwd(cwd);
	const args = ['run', '--model', 'openrouter/openai/gpt-5.6-sol', '--format', 'json', '--auto'];
	if (sessionId) args.push('--session', sessionId);

	return new Promise((resolve, reject) => {
		const child = spawnProcess('opencode', args, {
			cwd: directory,
			detached: true,
			env: TURN_ENV,
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		let activeSessionId = sessionId ?? '';
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
			onEvent(event);
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
			if (forceTimer) clearTimeout(forceTimer);
			reject(processError);
		});
		child.once('close', (code) => {
			clearTimeout(timer);
			if (forceTimer) clearTimeout(forceTimer);
			consume(buffer);
			if (timedOut) {
				reject(new Error(turnTimeoutMessage(timeout)));
				return;
			}
			if (code !== 0 || error) {
				const failureMessage = error || stderr.trim() || `OpenCode exited with ${code}`;
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
	if (!text.trim()) return null;
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

function progressText(tools) {
	const progress = [...tools.values()].slice(-6).map(({ status, title }) => {
		if (status === 'error') return `Failed: ${title}`;
		return `Done: ${title}`;
	});
	return (progress.length ? progress.join('\n') : 'Flaky is working…').slice(0, SLACK_TEXT_LIMIT);
}

function finalSlackText(text, sessionId, boxId) {
	const metadata = [sessionId && `⟳session:${sessionId}`, boxId && `⟳box:${boxId}`]
		.filter(Boolean)
		.join(' ');
	const suffix = metadata ? `\n\n${metadata}` : '';
	const body = text || 'Flaky completed the turn';
	return `${body.slice(0, SLACK_TEXT_LIMIT - suffix.length)}${suffix}`;
}

const NO_SLACK_PROGRESS = { event() {}, async finish() {} };

export async function startSlackProgress(
	turn,
	{
		callSlack = SLACK_TOKEN ? slackApi : undefined,
		updateInterval = SLACK_UPDATE_INTERVAL_MS,
	} = {},
) {
	const channel = turn.slack?.channel;
	const threadTs = turn.slack?.thread_ts;
	if (!callSlack || typeof channel !== 'string' || typeof threadTs !== 'string')
		return NO_SLACK_PROGRESS;

	let message;
	try {
		message = await callSlack('chat.postMessage', {
			channel,
			thread_ts: threadTs,
			text: 'Flaky is working…',
		});
	} catch (error) {
		console.error(`turn ${turn.turnId}: Slack placeholder failed: ${error.message}`);
		return NO_SLACK_PROGRESS;
	}

	const tools = new Map();
	let timer;
	let inFlight;
	let pending;
	let lastUpdate = 0;
	let stopped = false;

	const update = (text) =>
		callSlack('chat.update', { channel, ts: message.ts, text }).catch((error) =>
			console.error(`turn ${turn.turnId}: Slack update failed: ${error.message}`),
		);
	const flush = () => {
		if (stopped || timer || inFlight || pending === undefined) return;
		const delay = Math.max(0, lastUpdate + updateInterval - Date.now());
		timer = setTimeout(() => {
			timer = undefined;
			const text = pending;
			pending = undefined;
			lastUpdate = Date.now();
			inFlight = update(text).finally(() => {
				inFlight = undefined;
				flush();
			});
		}, delay);
	};
	const schedule = () => {
		pending = progressText(tools);
		flush();
	};

	return {
		event(event) {
			if (!event.part?.id) return;
			if (event.type === 'tool_use') {
				tools.set(event.part.id, {
					status: event.part.state?.status,
					title: event.part.state?.title || event.part.tool,
				});
				schedule();
			}
		},
		async finish(text, sessionId, boxId) {
			stopped = true;
			pending = undefined;
			if (timer) {
				clearTimeout(timer);
				timer = undefined;
			}
			if (inFlight) await inFlight;
			const delay = Math.max(0, lastUpdate + updateInterval - Date.now());
			if (delay) await sleep(delay);
			await update(finalSlackText(text, sessionId, boxId));
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
			output: r.result,
			sessionId: r.session_id,
			boxId: BOX_ID,
		};
	} catch (error) {
		result = {
			turnId: turn.turnId,
			status: 'error',
			output: error.message,
			sessionId: activeSessionId,
			boxId: BOX_ID,
		};
	}
	await progress.finish(result.output, result.sessionId, result.boxId);
	// The resume POST is the delivery contract. Retry transient failures.
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
		OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
		GITHUB_USER,
	})) {
		if (!value) {
			console.error(`Refusing to start: ${key} is not set.`);
			process.exit(1);
		}
	}

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
				continue;
			}
		} catch (error) {
			console.error(`poll error: ${error.message}`);
		}
		await sleep(POLL_INTERVAL_MS);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
