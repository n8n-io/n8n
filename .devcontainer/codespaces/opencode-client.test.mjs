import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { Server } from 'node:net';
import { join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
	freePort,
	localVersion,
	parseOpenCodeArgs,
	waitForTunnel,
} from '../../scripts/cloud-session-opencode.mjs';

const script = fileURLToPath(new URL('../../scripts/cloud-session.mjs', import.meta.url));
const secret = 'a'.repeat(64);

function fixture(t, env = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'opencode-client-'));
	t.after(() => rmSync(dir, { recursive: true, force: true }));
	const common = `
const fs = require('node:fs');
const args = process.argv.slice(2);
const log = (event) => fs.appendFileSync(process.env.TEST_LOG, JSON.stringify(event) + '\\n');
`;
	const bin = (name, body) =>
		writeFileSync(join(dir, name), `#!${process.execPath}\n${common}\n${body}`, { mode: 0o755 });
	bin(
		'gh',
		`
log({ command: 'gh', args });
if (args[0] === 'codespace' && args[1] === 'list') {
  console.log(JSON.stringify([
    { name: 'dev-box', state: 'Available' },
  ]));
} else if (args.includes('-N')) {
  if (process.env.TEST_TUNNEL_FAIL) process.exit(1);
  const mapping = args[args.indexOf('-L') + 1];
  const port = +mapping.split(':')[1];
  const ssh = require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  log({ event: 'ssh-child', pid: ssh.pid });
  const server = require('node:http').createServer((req, res) => {
    const expected = 'Basic ' + Buffer.from('opencode:' + '${secret}').toString('base64');
    if (req.headers.authorization !== expected) { res.writeHead(401).end(); return; }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ healthy: true, version: process.env.TEST_SERVER_VERSION || '1.18.30' }));
  });
  server.listen(port, '127.0.0.1');
  if (process.env.TEST_TUNNEL_DROP) setTimeout(() => process.exit(1), 500);
  process.on('SIGTERM', () => { log({ event: 'tunnel-stopped' }); server.closeAllConnections(); server.close(() => process.exit(0)); });
} else if (args.at(-1).includes('node --input-type=module')) {
  let source = '';
  process.stdin.on('data', chunk => source += chunk);
  process.stdin.on('end', () => {
    log({ event: 'bootstrap', hasSource: source.includes('prepareOpenCode') });
    if (process.env.TEST_BOOTSTRAP_FAIL) process.exit(1);
    const name = args.at(-1).split(' ').at(-2);
    console.log(JSON.stringify({ port: 4242, password: '${secret}', sessionID: 'ses_saved',
      directory: name === 'agent' ? '/workspaces/n8n' : '/workspaces/wt-' + name }));
  });
}
`,
	);
	bin(
		'opencode',
		`
if (args[0] === '--version') {
  console.log(process.env.TEST_CLIENT_VERSION || '1.18.30');
} else {
  log({ command: 'opencode', args, password: process.env.OPENCODE_SERVER_PASSWORD });
  if (process.env.TEST_CLIENT_WAIT) setInterval(() => {}, 1000);
}
`,
	);
	for (const opener of ['open', 'xdg-open']) bin(opener, `log({ command: 'browser', args });`);
	const logFile = join(dir, 'calls.jsonl');
	writeFileSync(logFile, '');
	const calls = () =>
		readFileSync(logFile, 'utf8')
			.trim()
			.split('\n')
			.filter(Boolean)
			.map((line) => JSON.parse(line));
	return {
		calls,
		start(args) {
			const child = spawn(process.execPath, [script, '--opencode', ...args], {
				env: {
					...process.env,
					PATH: `${dir}:${process.env.PATH}`,
					TEST_LOG: logFile,
					...env,
				},
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			let output = '';
			child.stdout.on('data', (chunk) => {
				output += chunk;
			});
			child.stderr.on('data', (chunk) => {
				output += chunk;
			});
			const done = new Promise((resolve) => child.on('exit', (code) => resolve({ code, output })));
			t.after(() => child.kill('SIGKILL'));
			return { child, done };
		},
	};
}

async function waitFor(check) {
	for (let attempt = 0; attempt < 100; attempt++) {
		const result = check();
		if (result) return result;
		await delay(50);
	}
	throw new Error('Fixture did not become ready.');
}

test('reports a missing local client', () => {
	assert.throws(() => localVersion(() => ({ status: 1 })), /Install OpenCode locally/);
	assert.throws(
		() => localVersion(() => ({ status: 0, stdout: 'unexpected' })),
		/Cannot read the local OpenCode version/,
	);
	assert.equal(
		localVersion(() => ({ status: 0, stdout: '1.18.30\n' })),
		'1.18.30',
	);
});

test('reports authentication failures from the tunnel health check', async () => {
	const controller = new AbortController();
	await assert.rejects(
		waitForTunnel(
			'http://127.0.0.1:4242',
			secret,
			{ finished: false },
			controller.signal,
			async (url, options) => {
				assert.equal(url, 'http://127.0.0.1:4242/global/health');
				assert.equal(
					options.headers.authorization,
					`Basic ${Buffer.from(`opencode:${secret}`).toString('base64')}`,
				);
				return new Response(null, { status: 401 });
			},
		),
		/health check failed \(401\)/,
	);
});

test('selects another tunnel port when the first candidate is the browser port', async (t) => {
	const address = Server.prototype.address;
	let candidates = 0;
	t.mock.method(Server.prototype, 'address', function () {
		const result = address.call(this);
		return ++candidates === 1 ? { ...result, port: 4096 } : result;
	});
	assert.notEqual(await freePort(4096), 4096);
	assert.equal(candidates, 2);
});

test('parses options before or after the workspace and rejects unsupported flags', () => {
	assert.equal(parseOpenCodeArgs(['--web']).port, 4096);
	assert.equal(parseOpenCodeArgs([]).port, 0);
	assert.equal(parseOpenCodeArgs(['--port', '4100', '--web']).port, 4100);
	assert.deepEqual(parseOpenCodeArgs(['--web', 'fix-flaky', '--new', '--port', '4100']), {
		name: 'fix-flaky',
		web: true,
		fresh: true,
		port: 4100,
		help: false,
	});
	for (const args of [
		['--port'],
		['--port', '0'],
		['--port', '65536'],
		['--model', 'test'],
		['a/b'],
		['one', 'two'],
	]) {
		assert.throws(() => parseOpenCodeArgs(args));
	}
});

test(
	'attaches the local TUI to the selected workspace and closes the whole tunnel',
	{ timeout: 15000 },
	async (t) => {
		const f = fixture(t);
		const result = await f.start(['fix-flaky']).done;
		assert.equal(result.code, 0, result.output);
		const calls = f.calls();
		assert.ok(calls.find((call) => call.event === 'bootstrap').hasSource);
		assert.ok(
			calls
				.filter((call) => call.command === 'gh' && call.args[1] === 'ssh')
				.every((call) => call.args[3] === 'dev-box'),
		);
		const tunnel = calls.find((call) => call.command === 'gh' && call.args.includes('-N'));
		assert.match(tunnel.args.at(-1), /^127\.0\.0\.1:\d+:127\.0\.0\.1:4242$/);
		const client = calls.find((call) => call.command === 'opencode');
		assert.deepEqual(client.args.slice(2), [
			'--dir',
			'/workspaces/wt-fix-flaky',
			'--session',
			'ses_saved',
		]);
		assert.equal(client.password, secret);
		assert.ok(!result.output.includes(secret));
		assert.ok(calls.some((call) => call.event === 'tunnel-stopped'));
		const pid = calls.find((call) => call.event === 'ssh-child').pid;
		await waitFor(() => {
			try {
				process.kill(pid, 0);
				return false;
			} catch {
				return true;
			}
		});
	},
);

for (const signal of ['SIGINT', 'SIGHUP']) {
	test(
		`opens the saved web conversation and cleans up on ${signal}`,
		{ timeout: 15000 },
		async (t) => {
			const f = fixture(t);
			const run = f.start(['--web', 'fix-flaky']);
			const browser = await waitFor(() => f.calls().find((call) => call.command === 'browser'));
			const url = new URL(browser.args[0]);
			assert.equal(
				url.pathname,
				`/${Buffer.from('/workspaces/wt-fix-flaky').toString('base64url')}/session/ses_saved`,
			);
			assert.equal(url.password, '');
			const response = await fetch(`${url.origin}/global/health`);
			assert.equal(response.status, 200);
			await response.text();
			run.child.kill(signal);
			const result = await run.done;
			assert.equal(result.code, 0, result.output);
			assert.ok(f.calls().some((call) => call.event === 'tunnel-stopped'));
			await assert.rejects(fetch(url.origin));
		},
	);
}

for (const [label, env, message] of [
	['a version mismatch', { TEST_SERVER_VERSION: '1.14.22' }, /versions differ/],
	['a tunnel startup failure', { TEST_TUNNEL_FAIL: '1' }, /SSH tunnel closed/],
	['a remote preparation failure', { TEST_BOOTSTRAP_FAIL: '1' }, /Could not prepare/],
	['a connection loss', { TEST_CLIENT_WAIT: '1', TEST_TUNNEL_DROP: '1' }, /SSH connection closed/],
]) {
	test(`reports ${label} without printing credentials`, { timeout: 15000 }, async (t) => {
		const f = fixture(t, env);
		const result = await f.start([]).done;
		assert.equal(result.code, 1, result.output);
		assert.match(result.output, message);
		assert.ok(!result.output.includes(secret));
		if (label !== 'a connection loss')
			assert.ok(!f.calls().some((call) => call.command === 'opencode'));
	});
}
