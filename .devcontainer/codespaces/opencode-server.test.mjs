import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createOpenCode } from './opencode-server.mjs';

function fixture(t) {
	const dir = mkdtempSync(join(tmpdir(), 'opencode-server-'));
	mkdirSync(join(dir, 'n8n', 'node_modules'), { recursive: true });
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	const state = { running: false, installFails: false, branchExists: false, sessionStatus: 200 };
	const commands = [];
	const sessions = new Map();
	const prepare = createOpenCode({
		execFileSync: () => '1.18.30',
		spawnSync(command, args, options = {}) {
			commands.push({ command, args });
			if (command === 'git') {
				if (args.includes('show-ref')) return { status: state.branchExists ? 0 : 1 };
				mkdirSync(args.includes('-b') ? args.at(-1) : args.at(-2), { recursive: true });
			}
			if (command === 'pnpm') {
				mkdirSync(join(options.cwd, 'node_modules'), { recursive: true });
				return { status: state.installFails ? 1 : 0 };
			}
			if (command === 'tmux') {
				if (args[0] === 'has-session') return { status: state.running ? 0 : 1 };
				state.running = true;
			}
			return { status: 0 };
		},
		async fetch(url, options) {
			const path = new URL(url).pathname;
			if (path === '/global/health') {
				return Response.json({ healthy: state.running, version: '1.18.30' });
			}
			const credentials = JSON.parse(
				readFileSync(join(dir, '.n8n-opencode', 'server.json'), 'utf8'),
			);
			assert.equal(
				options.headers.authorization,
				`Basic ${Buffer.from(`opencode:${credentials.password}`).toString('base64')}`,
			);
			const directory = decodeURIComponent(options.headers['x-opencode-directory']);
			if (path === '/session' && options.method === 'POST') {
				const id = `ses_${sessions.size + 1}`;
				const session = { id, directory };
				sessions.set(id, session);
				return Response.json(session);
			}
			if (state.sessionStatus !== 200) return Response.json({}, { status: state.sessionStatus });
			const session = sessions.get(path.split('/').at(-1));
			return Response.json(session ?? {}, { status: session ? 200 : 404 });
		},
	});
	return {
		dir,
		state,
		stop: () => {
			state.running = false;
		},
		prepare: (options = {}) => prepare({ workspaces: dir, ...options }),
		commands: () => commands,
	};
}

test(
	'reuses the server and saved conversation, creates separate workspaces, and resumes after restart',
	{ timeout: 15000 },
	async (t) => {
		const f = fixture(t);
		const first = await f.prepare({ name: 'fix-flaky' });
		assert.equal(first.directory, join(f.dir, 'wt-fix-flaky'));
		assert.deepEqual(await f.prepare({ name: 'fix-flaky' }), first);
		const second = await f.prepare({ name: 'another-task' });
		assert.equal(second.port, first.port);
		assert.notEqual(second.sessionID, first.sessionID);
		const fresh = await f.prepare({ name: 'fix-flaky', fresh: true });
		assert.notEqual(fresh.sessionID, first.sessionID);
		assert.equal((await f.prepare({ name: 'fix-flaky' })).sessionID, fresh.sessionID);
		const launcher = readFileSync(join(f.dir, '.n8n-opencode', 'serve.sh'), 'utf8');
		assert.match(launcher, /unset AGENT_WORKER_TOKEN N8N_DEQUEUE_URL SLACK_BOT_TOKEN/);
		assert.ok(launcher.includes(join(f.dir, '.turbo-cache')));
		assert.ok(launcher.includes('"enabled_providers":["openrouter"]'));
		assert.ok(launcher.includes('"apiKey":"{env:OPENROUTER_API_KEY}"'));
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
		rmSync(first.directory, { recursive: true });
		f.state.branchExists = true;
		assert.equal((await f.prepare({ name: 'fix-flaky' })).sessionID, fresh.sessionID);
		const worktree = f
			.commands()
			.filter((entry) => entry.command === 'git' && entry.args.includes('add'))
			.at(-1);
		assert.deepEqual(worktree.args, [
			'-C',
			join(f.dir, 'n8n'),
			'worktree',
			'add',
			first.directory,
			'session/fix-flaky',
		]);
	},
);

test(
	'retries a failed worktree install before starting the server',
	{ timeout: 10000 },
	async (t) => {
		const f = fixture(t);
		f.state.installFails = true;
		await assert.rejects(f.prepare({ name: 'retry' }), /pnpm failed/);
		assert.ok(!f.commands().some((entry) => entry.command === 'tmux'));
		f.state.installFails = false;
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
		f.state.installFails = true;
		await assert.rejects(f.prepare(), /pnpm failed/);
		f.state.installFails = false;
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
		f.state.sessionStatus = 503;
		await assert.rejects(f.prepare(), /Cannot resume OpenCode session \(503\)/);
		const saved = join(f.dir, '.n8n-opencode', 'agent.session.json');
		assert.equal(JSON.parse(readFileSync(saved, 'utf8')).id, first.sessionID);
		f.state.sessionStatus = 200;
		writeFileSync(saved, JSON.stringify({ id: 'ses_missing' }));
		assert.notEqual((await f.prepare()).sessionID, first.sessionID);
		writeFileSync(saved, '{');
		await assert.rejects(f.prepare(), /Cannot read/);
	},
);
