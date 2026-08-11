#!/usr/bin/env node
// HTTP broker for per-turn Claude Code conversations on a codespace.
// Each turn is one `claude -p` exec. State persists on disk via --resume, so the
// broker holds nothing between turns and survives a codespace stop/start.
//
//   AGENT_BROKER_TOKEN=… node agent-broker.mjs
//
//   GET  /healthz                              no auth
//   POST /turns { message, sessionId?, cwd?, callbackUrl? }   Bearer auth
//     with callbackUrl: reply 202 { turnId }, then POST the result to callbackUrl.
//     without callbackUrl: hold the connection, reply with the result. Short turns only.
//   GET  /turns/<id>                           Bearer auth. Poll for a held result.
import { execFile } from 'node:child_process';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.AGENT_BROKER_PORT ?? 8787);
const TOKEN = process.env.AGENT_BROKER_TOKEN;
// Confine workdirs to ROOT. Override for local tests outside a codespace.
const ROOT = process.env.AGENT_BROKER_ROOT ?? '/workspaces';
const DEFAULT_CWD = process.env.AGENT_BROKER_CWD ?? `${ROOT}/n8n`;
const TURN_TIMEOUT_MS = 15 * 60_000;
const MAX_TURNS_KEPT = 100;

if (!TOKEN) {
	console.error('Refusing to start: set AGENT_BROKER_TOKEN (the bearer token n8n will send).');
	process.exit(1);
}

const turns = new Map();
// Serialize turns on the same session. Turns on other sessions run in parallel.
const queues = new Map();

function enqueue(key, task) {
	const tail = (queues.get(key) ?? Promise.resolve()).then(task, task);
	queues.set(
		key,
		tail.then(
			() => {},
			() => {},
		),
	);
	return tail;
}

function runClaude({ message, sessionId, cwd }) {
	const args = ['-p', '--output-format', 'json', '--dangerously-skip-permissions'];
	if (sessionId) args.push('--resume', sessionId);
	args.push(message);
	return new Promise((resolve, reject) => {
		execFile(
			'claude',
			args,
			{ cwd, timeout: TURN_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
			(err, stdout, stderr) => {
				try {
					resolve(JSON.parse(stdout));
				} catch {
					reject(new Error(stderr?.trim() || err?.message || 'claude produced no output'));
				}
			},
		);
	});
}

async function executeTurn(id, { message, sessionId, cwd, callbackUrl }) {
	const turn = turns.get(id);
	turn.status = 'running';
	try {
		const result = await enqueue(sessionId ?? id, () => runClaude({ message, sessionId, cwd }));
		Object.assign(turn, { status: 'done', result });
	} catch (error) {
		Object.assign(turn, { status: 'error', error: error.message });
	}
	if (turns.size > MAX_TURNS_KEPT) {
		for (const key of turns.keys()) {
			if (turns.size <= MAX_TURNS_KEPT) break;
			if (turns.get(key).status !== 'running') turns.delete(key);
		}
	}
	if (callbackUrl) {
		try {
			await fetch(callbackUrl, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ turnId: id, ...turn }),
			});
		} catch (error) {
			// The result is still available from GET /turns/<id>.
			console.error(`turn ${id}: callback to ${callbackUrl} failed: ${error.message}`);
		}
	}
}

function authorized(req) {
	const sent = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
	const a = Buffer.from(sent);
	const b = Buffer.from(TOKEN);
	return a.length === b.length && timingSafeEqual(a, b);
}

function json(res, status, body) {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
	const { pathname } = new URL(req.url, 'http://localhost');
	if (req.method === 'GET' && pathname === '/healthz') return json(res, 200, { ok: true });
	if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });

	const turnMatch = pathname.match(/^\/turns\/([\w-]+)$/);
	if (req.method === 'GET' && turnMatch) {
		const turn = turns.get(turnMatch[1]);
		return turn ? json(res, 200, turn) : json(res, 404, { error: 'unknown turn' });
	}

	if (req.method === 'POST' && pathname === '/turns') {
		const chunks = [];
		for await (const chunk of req) chunks.push(chunk);
		let body;
		try {
			body = JSON.parse(Buffer.concat(chunks).toString());
		} catch {
			return json(res, 400, { error: 'body must be JSON' });
		}
		const { message, sessionId, callbackUrl } = body;
		const cwd = body.cwd ?? DEFAULT_CWD;
		if (typeof message !== 'string' || !message.trim())
			return json(res, 400, { error: 'message (string) is required' });
		if (!cwd.startsWith(`${ROOT}/`)) return json(res, 400, { error: `cwd must be under ${ROOT}/` });

		const id = randomUUID();
		turns.set(id, { status: 'queued' });
		const running = executeTurn(id, { message, sessionId, cwd, callbackUrl });
		if (callbackUrl) return json(res, 202, { turnId: id });
		await running;
		const turn = turns.get(id);
		return json(res, turn.status === 'done' ? 200 : 500, { turnId: id, ...turn });
	}

	json(res, 404, { error: 'not found' });
}).listen(PORT, () => console.log(`agent-broker listening on :${PORT}`));
