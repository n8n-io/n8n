import type { Logger } from '@n8n/backend-common';
import { request } from 'node:http';
import { connect, createServer, type AddressInfo, type Server, type Socket } from 'node:net';
import { mock } from 'vitest-mock-extended';

import { isSimHost, parseSimGateway, SimEgressProxy } from '../sim-egress-proxy';

/** A TCP server that records the first bytes each connection sends. */
async function startRecorder(): Promise<{ server: Server; port: number; received: string[] }> {
	const received: string[] = [];
	const server = createServer((socket) => {
		socket.once('data', (chunk) => {
			received.push(chunk.toString());
			socket.end();
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	return { server, port: (server.address() as AddressInfo).port, received };
}

/** Sends a CONNECT through the proxy, then `payload` through the tunnel; resolves the proxy's status line. */
async function tunnel(proxyUrl: string, target: string, payload: string): Promise<string> {
	const { port } = new URL(proxyUrl);
	return await new Promise<string>((resolve, reject) => {
		const socket: Socket = connect(Number(port), '127.0.0.1', () => {
			socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`);
		});
		socket.once('data', (chunk) => {
			const status = chunk.toString().split('\r\n')[0];
			if (status.includes(' 200 ')) socket.write(payload);
			setTimeout(() => {
				socket.destroy();
				resolve(status);
			}, 50);
		});
		socket.on('error', reject);
	});
}

describe('isSimHost', () => {
	it('matches exact hosts, wildcards and templates, and nothing else', () => {
		const patterns = [
			'slack.com',
			'*.myshopify.com',
			'{subdomain}.zendesk.com',
			'*-aiplatform.googleapis.com',
		];

		expect(isSimHost('Slack.com', patterns)).toBe(true);
		expect(isSimHost('acme.myshopify.com', patterns)).toBe(true);
		expect(isSimHost('acme.zendesk.com', patterns)).toBe(true);
		expect(isSimHost('us-central1-aiplatform.googleapis.com', patterns)).toBe(true);
		expect(isSimHost('api.example.com', patterns)).toBe(false);
		expect(isSimHost('evil.com.zendesk.com.example.com', patterns)).toBe(false);
		expect(isSimHost('a.b.zendesk.com', patterns)).toBe(false);
	});

	it('never lets a malformed template match other hosts', () => {
		expect(isSimHost('api.example.com', ['{broken.example.com'])).toBe(false);
		expect(isSimHost('api.example.com', ['{name}'])).toBe(false);
		expect(isSimHost('localhost', ['{name}'])).toBe(false);
	});
});

describe('parseSimGateway', () => {
	it('reads host:port, and rejects anything else', () => {
		expect(parseSimGateway('sim-server:443')).toEqual({ host: 'sim-server', port: 443 });
		expect(parseSimGateway('127.0.0.1:8443')).toEqual({ host: '127.0.0.1', port: 8443 });
		expect(parseSimGateway('sim-server')).toBeUndefined();
		expect(parseSimGateway('')).toBeUndefined();
	});
});

describe('SimEgressProxy', () => {
	const servers: Server[] = [];
	let proxy: SimEgressProxy | undefined;

	afterEach(async () => {
		await proxy?.stop();
		proxy = undefined;
		await Promise.all(
			servers.splice(0).map(async (s) => await new Promise<void>((r) => s.close(() => r()))),
		);
	});

	it('tunnels a served host to the gateway unchanged', async () => {
		const gateway = await startRecorder();
		servers.push(gateway.server);
		proxy = new SimEgressProxy(
			{ host: '127.0.0.1', port: gateway.port },
			['slack.com'],
			[],
			mock<Logger>(),
		);
		const proxyUrl = await proxy.start();

		const status = await tunnel(proxyUrl, 'slack.com:443', 'tls-client-hello');

		expect(status).toContain(' 200 ');
		await vi.waitFor(() => expect(gateway.received).toEqual(['tls-client-hello']));
		expect(proxy.refusedHosts.size).toBe(0);
	});

	it("reaches the instance's own loopback port directly", async () => {
		const local = await startRecorder();
		servers.push(local.server);
		proxy = new SimEgressProxy({ host: '127.0.0.1', port: 1 }, [], [local.port], mock<Logger>());
		const proxyUrl = await proxy.start();

		const status = await tunnel(proxyUrl, `127.0.0.1:${local.port}`, 'to-the-instance');

		expect(status).toContain(' 200 ');
		await vi.waitFor(() => expect(local.received).toEqual(['to-the-instance']));
	});

	it('refuses any other loopback port', async () => {
		const other = await startRecorder();
		servers.push(other.server);
		proxy = new SimEgressProxy({ host: '127.0.0.1', port: 1 }, [], [5678], mock<Logger>());
		const proxyUrl = await proxy.start();

		const status = await tunnel(proxyUrl, `127.0.0.1:${other.port}`, 'never-sent');

		expect(status).toContain(' 502 ');
		expect(other.received).toEqual([]);
		expect([...proxy.refusedHosts]).toEqual([`127.0.0.1:${other.port}`]);
	});

	it('refuses and records a host the simulation does not serve', async () => {
		proxy = new SimEgressProxy({ host: '127.0.0.1', port: 1 }, ['slack.com'], [], mock<Logger>());
		const proxyUrl = await proxy.start();

		const status = await tunnel(proxyUrl, 'api.example.com:443', 'never-sent');

		expect(status).toContain(' 502 ');
		expect([...proxy.refusedHosts]).toEqual(['api.example.com']);
	});

	it('refuses an AI SDK call to a host the simulation does not serve', async () => {
		proxy = new SimEgressProxy(
			{ host: '127.0.0.1', port: 1 },
			['api.openai.com'],
			[],
			mock<Logger>(),
		);
		const proxyUrl = await proxy.start();

		const status = await new Promise<number>((resolve) => {
			request(
				`${proxyUrl}/sim/api.example.com:8443/v1/chat/completions`,
				{ method: 'POST' },
				(res) => resolve(res.statusCode ?? 0),
			).end();
		});

		expect(status).toBe(502);
		expect([...proxy.refusedHosts]).toEqual(['api.example.com']);
	});
});
