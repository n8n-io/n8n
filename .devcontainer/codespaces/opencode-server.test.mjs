import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { prepareOpenCode } from './opencode-server.mjs';

function fixture(t) {
	const dir = mkdtempSync(join(tmpdir(), 'opencode-server-'));
	const binDir = join(dir, 'bin');
	mkdirSync(binDir);
	mkdirSync(join(dir, 'n8n', 'node_modules'), { recursive: true });
	const savedEnv = { ...process.env };
	process.env.PATH = `${binDir}:${process.env.PATH}`;
	process.env.TEST_ROOT = dir;
	process.env.AGENT_WORKER_TOKEN = 'test-worker';
	process.env.N8N_DEQUEUE_URL = 'test-queue';
	process.env.SLACK_BOT_TOKEN = 'test-slack';
	const common = `
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const root = process.env.TEST_ROOT;
const file = name => path.join(root, name);
const log = event => fs.appendFileSync(file('commands.jsonl'), JSON.stringify(event) + '\\n');
log({command: path.basename(process.argv[1]), args});
`;
	const bin = (name, body) =>
		writeFileSync(join(binDir, name), `#!${process.execPath}\n${common}\n${body}`, { mode: 0o755 });
	bin(
		'git',
		`
if (args.includes('show-ref')) process.exit(1);
fs.mkdirSync(args.at(-1), { recursive: true });
`,
	);
	bin(
		'pnpm',
		`
fs.mkdirSync(path.join(process.cwd(), 'node_modules'), {recursive:true});
if (process.env.TEST_INSTALL_FAIL) process.exit(1);
`,
	);
	bin(
		'tmux',
		`
if (args[0] === 'has-session') {
  try { process.kill(+fs.readFileSync(file('pid'), 'utf8'), 0); } catch { process.exit(1); }
} else {
  const child = require('node:child_process').spawn('bash', ['-c', args.at(-1)], { detached:true, stdio:'ignore' });
  fs.writeFileSync(file('pid'), String(child.pid)); child.unref();
}
`,
	);
	bin(
		'opencode',
		`
if (args[0] === '--version') { console.log('1.18.30'); process.exit(0); }
fs.writeFileSync(file('server-env.json'), JSON.stringify({
  worker: !!process.env.AGENT_WORKER_TOKEN, queue: !!process.env.N8N_DEQUEUE_URL, slack: !!process.env.SLACK_BOT_TOKEN,
  cache: process.env.TURBO_CACHE_DIR, config: JSON.parse(process.env.OPENCODE_CONFIG_CONTENT),
}));
let sessions = fs.existsSync(file('sessions.json')) ? JSON.parse(fs.readFileSync(file('sessions.json'), 'utf8')) : {};
const server = require('node:http').createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  const expected = 'Basic ' + Buffer.from('opencode:' + process.env.OPENCODE_SERVER_PASSWORD).toString('base64');
  if (req.headers.authorization !== expected) { res.writeHead(401).end('{}'); return; }
  if (req.url === '/global/health') { res.end(JSON.stringify({ healthy:true, version:'1.18.30' })); return; }
  if (req.url === '/project/current') {
    const directory = decodeURIComponent(req.headers['x-opencode-directory']);
    fs.writeFileSync(file('project.json'), JSON.stringify({ worktree: directory }));
    res.end(JSON.stringify({ id:'n8n', worktree:directory })); return;
  }
  if (req.method === 'POST' && req.url === '/session') {
    for await (const chunk of req) {}
    const id = 'ses_' + (Object.keys(sessions).length + 1);
    sessions[id] = { id, directory:decodeURIComponent(req.headers['x-opencode-directory']) };
    fs.writeFileSync(file('sessions.json'), JSON.stringify(sessions));
    res.end(JSON.stringify(sessions[id])); return;
  }
  if (fs.existsSync(file('reject-session'))) { res.writeHead(503).end('{}'); return; }
  const session = sessions[req.url.split('/').at(-1)];
  if (!session) { res.writeHead(404).end('{}'); return; }
  res.end(JSON.stringify(session));
});
server.listen(+args[args.indexOf('--port') + 1], '127.0.0.1');
`,
	);
	const stop = async () => {
		try {
			const pid = +readFileSync(join(dir, 'pid'), 'utf8');
			process.kill(-pid, 'SIGTERM');
			for (let count = 0; count < 100; count++) {
				try {
					process.kill(pid, 0);
				} catch {
					return;
				}
				await delay(20);
			}
			throw new Error('Fixture server did not stop.');
		} catch (error) {
			if (!['ENOENT', 'ESRCH'].includes(error.code)) throw error;
		}
	};
	t.after(async () => {
		await stop();
		for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
		Object.assign(process.env, savedEnv);
		rmSync(dir, { recursive: true, force: true });
	});
	return {
		dir,
		stop,
		prepare: (options = {}) => prepareOpenCode({ workspaces: dir, ...options }),
		commands: () =>
			readFileSync(join(dir, 'commands.jsonl'), 'utf8')
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line)),
	};
}

test(
	'reuses the server and saved conversation, creates separate workspaces, and resumes after restart',
	{ timeout: 15000 },
	async (t) => {
		const f = fixture(t);
		const first = await f.prepare({ name: 'fix-flaky' });
		assert.equal(first.directory, join(f.dir, 'wt-fix-flaky'));
		assert.deepEqual(JSON.parse(readFileSync(join(f.dir, 'project.json'), 'utf8')), {
			worktree: join(f.dir, 'n8n'),
		});
		assert.deepEqual(await f.prepare({ name: 'fix-flaky' }), first);
		const second = await f.prepare({ name: 'another-task' });
		assert.equal(second.port, first.port);
		assert.notEqual(second.sessionID, first.sessionID);
		const fresh = await f.prepare({ name: 'fix-flaky', fresh: true });
		assert.notEqual(fresh.sessionID, first.sessionID);
		assert.equal((await f.prepare({ name: 'fix-flaky' })).sessionID, fresh.sessionID);
		const env = JSON.parse(readFileSync(join(f.dir, 'server-env.json'), 'utf8'));
		assert.deepEqual([env.worker, env.queue, env.slack], [false, false, false]);
		assert.equal(env.cache, join(f.dir, '.turbo-cache'));
		assert.equal(env.config.provider.openrouter.options.apiKey, '{env:OPENROUTER_API_KEY}');
		assert.deepEqual(env.config.enabled_providers, ['openrouter']);
		assert.equal(statSync(join(f.dir, '.n8n-opencode')).mode & 0o777, 0o700);
		for (const file of ['serve.sh', 'server.json', 'fix-flaky.session.json']) {
			assert.equal(statSync(join(f.dir, '.n8n-opencode', file)).mode & 0o777, 0o600);
		}
		assert.ok(!f.commands().some((entry) => JSON.stringify(entry.args).includes(first.password)));
		assert.equal(f.commands().filter((entry) => entry.command === 'pnpm').length, 2);
		await f.stop();
		const restarted = await f.prepare({ name: 'fix-flaky' });
		assert.equal(restarted.sessionID, fresh.sessionID);
		assert.notEqual(restarted.password, first.password);
	},
);

test(
	'retries a failed worktree install before starting the server',
	{ timeout: 10000 },
	async (t) => {
		const f = fixture(t);
		process.env.TEST_INSTALL_FAIL = '1';
		await assert.rejects(f.prepare({ name: 'retry' }), /pnpm failed/);
		assert.ok(!f.commands().some((entry) => entry.command === 'tmux'));
		delete process.env.TEST_INSTALL_FAIL;
		assert.equal((await f.prepare({ name: 'retry' })).directory, join(f.dir, 'wt-retry'));
		assert.equal(f.commands().filter((entry) => entry.command === 'pnpm').length, 2);
	},
);

test(
	'retries a failed main checkout install even when node_modules exists',
	{ timeout: 10000 },
	async (t) => {
		const f = fixture(t);
		rmSync(join(f.dir, 'n8n', 'node_modules'), { recursive: true });
		process.env.TEST_INSTALL_FAIL = '1';
		await assert.rejects(f.prepare(), /pnpm failed/);
		delete process.env.TEST_INSTALL_FAIL;
		assert.equal((await f.prepare()).directory, join(f.dir, 'n8n'));
		assert.equal(f.commands().filter((entry) => entry.command === 'pnpm').length, 2);
	},
);

test(
	'preserves saved sessions on API errors and replaces only missing sessions',
	{ timeout: 10000 },
	async (t) => {
		const f = fixture(t);
		const first = await f.prepare();
		writeFileSync(join(f.dir, 'reject-session'), '');
		await assert.rejects(f.prepare(), /Cannot resume OpenCode session \(503\)/);
		const saved = join(f.dir, '.n8n-opencode', 'agent.session.json');
		assert.equal(JSON.parse(readFileSync(saved, 'utf8')).id, first.sessionID);
		rmSync(join(f.dir, 'reject-session'));
		writeFileSync(saved, JSON.stringify({ id: 'ses_missing' }));
		assert.notEqual((await f.prepare()).sessionID, first.sessionID);
		writeFileSync(saved, '{');
		await assert.rejects(f.prepare(), /Cannot read/);
	},
);
