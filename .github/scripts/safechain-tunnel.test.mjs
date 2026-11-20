import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import { promisify } from 'node:util';

const exec = promisify(execFile);

// Stand in for Playwright. Tell the upstream server to reset only after its reply arrives.
const pnpmProbe = `#!/bin/sh
exec "$PROBE_NODE" --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';

const proxy = new URL(process.env.HTTPS_PROXY);
const signal = AbortSignal.timeout(5000);
const connect = request({
	hostname: proxy.hostname,
	port: proxy.port,
	method: 'CONNECT',
	path: process.env.PROBE_TARGET,
	signal,
});
connect.end();
const [response, socket] = await once(connect, 'connect', { signal });
try {
	assert.equal(response.statusCode, 200);
	const reply = once(socket, 'data', { signal });
	socket.resume();
	socket.write('?');
	assert.equal((await reply)[0].toString(), '!');

	const closed = once(socket, 'close', { signal });
	socket.write('.');
	await closed;
} finally {
	socket.destroy();
}
JS
`;

// DEVP-1522. The workflow-script job installs the pinned binary before this test.
// Locally: SAFE_CHAIN_BIN=/path/to/binary node --test .github/scripts/safechain-tunnel.test.mjs
it('keeps upstream resets after CONNECT out of the SafeChain error log', async (t) => {
	if (process.platform === 'win32') return t.skip('The pnpm probe uses a POSIX shell');
	const binary = process.env.SAFE_CHAIN_BIN ?? join(homedir(), '.safe-chain', 'bin', 'safe-chain');
	if (!process.env.SAFE_CHAIN_BIN && !process.env.GITHUB_ACTIONS && !existsSync(binary)) {
		return t.skip('Set SAFE_CHAIN_BIN to the SafeChain binary used in CI');
	}

	const directory = await mkdtemp(join(tmpdir(), 'safechain-tunnel-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const testBinary = join(directory, 'safe-chain');
	// SafeChain reads config relative to the binary. Give the probe its own location.
	await copyFile(binary, testBinary);
	await writeFile(join(directory, 'pnpm'), pnpmProbe, { mode: 0o700 });

	let upstreamSocket;
	let resetAfterReply = false;
	const upstream = createServer((socket) => {
		upstreamSocket = socket;
		socket.once('data', () => {
			socket.once('data', () => {
				resetAfterReply = true;
				socket.resetAndDestroy();
			});
			socket.write('!');
		});
	});
	t.after(() => {
		upstreamSocket?.destroy();
		return new Promise((resolve) => upstream.close(resolve));
	});
	await once(upstream.listen(0, '127.0.0.1'), 'listening');
	const address = upstream.address();
	assert.ok(address && typeof address === 'object');

	const { stdout, stderr } = await exec(
		testBinary,
		['pnpm', '--filter=n8n-playwright', 'test:container:sqlite:e2e'],
		{
			cwd: directory,
			env: {
				CI: 'true',
				HOME: directory,
				TMPDIR: directory,
				PATH: directory,
				SAFE_CHAIN_LOGGING: 'normal',
				PROBE_NODE: process.execPath,
				PROBE_TARGET: `127.0.0.1:${address.port}`,
			},
			timeout: 10000,
			killSignal: 'SIGKILL',
		},
	);

	assert.ok(resetAfterReply, 'The upstream server must reset an established tunnel');
	assert.doesNotMatch(`${stdout}${stderr}`, /Safe-chain: error connecting to/);
});
