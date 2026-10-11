import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { test } from 'node:test';

import { openCodeProxy } from '../../scripts/cloud-session-opencode-proxy.mjs';

test('proxies uploads and event streams with authentication and rejects other origins', async (t) => {
	const requests = [];
	const backend = createServer(async (req, res) => {
		requests.push(req.headers);
		res.writeHead(200, { 'content-type': 'text/event-stream' });
		for await (const chunk of req) res.write(chunk);
		res.end();
	});
	await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
	t.after(() => {
		backend.closeAllConnections();
		backend.close();
	});
	const proxy = await openCodeProxy({ password: 'test-secret' });
	proxy.targetPort = backend.address().port;
	t.after(proxy.close);
	const response = await fetch(`${proxy.origin}/session`, {
		method: 'POST',
		body: 'data: attached image\n\n',
		headers: { origin: proxy.origin },
	});
	assert.equal(response.status, 200);
	assert.equal(await response.text(), 'data: attached image\n\n');
	assert.equal(
		requests[0].authorization,
		`Basic ${Buffer.from('opencode:test-secret').toString('base64')}`,
	);
	assert.ok(!proxy.origin.includes('test-secret'));
	for (const headers of [
		{ origin: 'https://example.com' },
		{ host: 'example.com' },
		{ 'sec-fetch-site': 'cross-site' },
	]) {
		const status = await new Promise((resolve, reject) => {
			const req = request(proxy.origin, { headers }, (response) => {
				response.resume();
				resolve(response.statusCode);
			});
			req.on('error', reject);
			req.end();
		});
		assert.equal(status, 403);
	}
	assert.equal(requests.length, 1);
});

test('forwards WebSocket upgrades and closes their sockets', async (t) => {
	const peers = new Set();
	const backend = createServer();
	backend.on('upgrade', (req, socket) => {
		assert.equal(
			req.headers.authorization,
			`Basic ${Buffer.from('opencode:test-secret').toString('base64')}`,
		);
		peers.add(socket);
		socket.on('close', () => peers.delete(socket));
		socket.write(
			'HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
		);
		socket.pipe(socket);
	});
	await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
	t.after(() => {
		for (const peer of peers) peer.destroy();
		backend.close();
	});
	const proxy = await openCodeProxy({ password: 'test-secret' });
	proxy.targetPort = backend.address().port;
	t.after(proxy.close);
	const socket = await new Promise((resolve, reject) => {
		const req = request(`${proxy.origin}/pty/test/connect`, {
			headers: { origin: proxy.origin, connection: 'Upgrade', upgrade: 'websocket' },
		});
		req.on('upgrade', (_response, peer) => resolve(peer));
		req.on('error', reject);
		req.end();
	});
	t.after(() => socket.destroy());
	const echoed = new Promise((resolve) => socket.once('data', (data) => resolve(data.toString())));
	socket.write('terminal input');
	assert.equal(await echoed, 'terminal input');
	const closed = new Promise((resolve) => socket.once('close', resolve));
	proxy.close();
	await closed;
});

test(
	'closes the browser response when the upstream stream disconnects',
	{ timeout: 5000 },
	async (t) => {
		const backend = createServer((_req, res) => {
			res.writeHead(200, { 'content-type': 'text/event-stream' });
			res.write('data: partial\n\n');
			setTimeout(() => res.destroy(), 50);
		});
		await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
		t.after(() => {
			backend.closeAllConnections();
			backend.close();
		});
		const proxy = await openCodeProxy({ password: 'test' });
		proxy.targetPort = backend.address().port;
		t.after(proxy.close);
		const signal = AbortSignal.timeout(3000);
		const response = await fetch(proxy.origin, { signal });
		await assert.rejects(response.text());
		assert.equal(
			signal.aborted,
			false,
			'The proxy must close the response before the client times out.',
		);
	},
);

test('rejects an occupied browser port and reports a missing or closed upstream', async (t) => {
	const proxy = await openCodeProxy({ password: 'test' });
	t.after(proxy.close);
	await assert.rejects(openCodeProxy({ password: 'test', port: +new URL(proxy.origin).port }), {
		code: 'EADDRINUSE',
	});
	const waiting = await fetch(proxy.origin);
	assert.equal(waiting.status, 503);
	await waiting.text();
	proxy.targetPort = 1;
	const response = await fetch(proxy.origin);
	assert.equal(response.status, 502);
	await response.text();
	const rejection = await new Promise((resolve) => {
		const socket = connect(+new URL(proxy.origin).port, '127.0.0.1', () => {
			socket.write(
				'GET /pty/test/connect HTTP/1.1\r\nHost: example.com\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
			);
		});
		socket.once('data', (data) => {
			socket.destroy();
			resolve(data.toString());
		});
	});
	assert.match(rejection, /403 Forbidden/);
});
