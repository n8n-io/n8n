import type { Logger } from '@n8n/backend-common';
import type { SsrfProtectionConfig } from '@n8n/config';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import type { AddressInfo, Socket } from 'node:net';
import { join } from 'node:path';
import type { IHttpRequestOptions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { SsrfProtectionService } from '../../ssrf';
import { useCleanProxyEnv } from '../../ssrf/__tests__/mock-ssrf-bridge';
import { OutboundHttp } from '../outbound-http';

interface CountingServer {
	url: string;
	connections: Socket[];
	openConnections: () => number;
	maxConcurrentRequests: () => number;
	close: () => Promise<void>;
}

async function startCountingServer(
	server: http.Server | https.Server,
	scheme: 'http' | 'https',
	responseDelayMs = 0,
): Promise<CountingServer> {
	const connections: Socket[] = [];
	let active = 0;
	let maxActive = 0;

	server.on('connection', (socket: Socket) => connections.push(socket));
	server.on('request', (_req: http.IncomingMessage, res: http.ServerResponse) => {
		active++;
		maxActive = Math.max(maxActive, active);
		setTimeout(() => {
			active--;
			res.setHeader('Content-Type', 'application/json');
			res.end(JSON.stringify({ ok: true }));
		}, responseDelayMs);
	});

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address() as AddressInfo;

	return {
		url: `${scheme}://127.0.0.1:${port}`,
		connections,
		openConnections: () => connections.filter((socket) => !socket.destroyed).length,
		maxConcurrentRequests: () => maxActive,
		close: async () => {
			server.closeAllConnections();
			await new Promise<void>((resolve) => server.close(() => resolve()));
		},
	};
}

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name));

function makeOutboundHttp(): OutboundHttp {
	return new OutboundHttp(
		mock<SsrfProtectionService>(),
		mock<SsrfProtectionConfig>({ enabled: false }),
		mock<Logger>(),
	);
}

async function sendSequentially(request: () => Promise<unknown>, count: number) {
	for (let i = 0; i < count; i++) await request();
}

describe('OutboundHttp.requests with a connection pool', () => {
	useCleanProxyEnv();

	const servers: CountingServer[] = [];
	const start = async (...args: Parameters<typeof startCountingServer>) => {
		const server = await startCountingServer(...args);
		servers.push(server);
		return server;
	};

	afterEach(async () => {
		await Promise.all(servers.splice(0).map(async (server) => await server.close()));
	});

	it('opens a new connection for each request without a pool', async () => {
		const target = await start(http.createServer(), 'http');
		const client = makeOutboundHttp().requests({ useDefaultSsrfPolicy: 'unsafe' });

		await sendSequentially(async () => await client.request({ url: target.url }), 3);

		expect(target.connections).toHaveLength(3);
	});

	it('reuses one connection for sequential HTTP requests', async () => {
		const target = await start(http.createServer(), 'http');
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: { agentOptions: { keepAlive: true } },
		});

		await sendSequentially(async () => await client.request({ url: target.url }), 3);

		expect(target.connections).toHaveLength(1);
		client.close();
	});

	it('keeps connections alive by default', async () => {
		const target = await start(http.createServer(), 'http');
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: {},
		});

		await sendSequentially(async () => await client.request({ url: target.url }), 3);

		expect(target.connections).toHaveLength(1);
		client.close();
	});

	it('rejects a pool with a fixed servername', () => {
		expect(() =>
			makeOutboundHttp().requests({
				useDefaultSsrfPolicy: 'unsafe',
				connectionPool: { agentOptions: { servername: 'example.com' } },
			}),
		).toThrow('servername');
	});

	it('reuses one TLS connection for sequential HTTPS requests', async () => {
		const target = await start(
			https.createServer({
				key: fixture('loopback-test-key.pem'),
				cert: fixture('loopback-test-cert.pem'),
			}),
			'https',
		);
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: { agentOptions: { keepAlive: true }, skipSslCertificateValidation: true },
		});

		await sendSequentially(async () => await client.request({ url: target.url }), 3);

		expect(target.connections).toHaveLength(1);
		client.close();
	});

	it('limits concurrent connections to maxSockets', async () => {
		const target = await start(http.createServer(), 'http', 20);
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: { agentOptions: { keepAlive: true, maxSockets: 1 } },
		});

		await Promise.all(
			Array.from({ length: 5 }, async () => await client.request({ url: target.url })),
		);

		expect(target.connections).toHaveLength(1);
		expect(target.maxConcurrentRequests()).toBe(1);
		client.close();
	});

	it('closes idle connections after the agent timeout', async () => {
		const target = await start(http.createServer(), 'http');
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: { agentOptions: { keepAlive: true, timeout: 100 } },
		});

		await client.request({ url: target.url });

		await vi.waitFor(() => expect(target.openConnections()).toBe(0), { timeout: 2000 });
		client.close();
	});

	it('closes pooled connections on close()', async () => {
		const target = await start(http.createServer(), 'http');
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: { agentOptions: { keepAlive: true } },
		});
		await client.request({ url: target.url });
		expect(target.openConnections()).toBe(1);

		client.close();

		await vi.waitFor(() => expect(target.openConnections()).toBe(0), { timeout: 2000 });
	});

	it('reuses one connection to an explicit proxy', async () => {
		const proxy = await start(http.createServer(), 'http');
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: {
				proxy: { protocol: 'http', host: '127.0.0.1', port: Number(new URL(proxy.url).port) },
				agentOptions: { keepAlive: true },
			},
		});

		await sendSequentially(async () => await client.request({ url: 'http://target.invalid/x' }), 3);

		expect(proxy.connections).toHaveLength(1);
		client.close();
	});

	it('reuses one connection to an environment proxy and closes it on close()', async () => {
		const proxy = await start(http.createServer(), 'http');
		process.env.HTTP_PROXY = proxy.url;
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: { agentOptions: { keepAlive: true } },
		});
		await sendSequentially(async () => await client.request({ url: 'http://target.invalid/x' }), 3);
		expect(proxy.connections).toHaveLength(1);
		expect(proxy.openConnections()).toBe(1);

		client.close();

		await vi.waitFor(() => expect(proxy.openConnections()).toBe(0), { timeout: 2000 });
	});

	it.each<Partial<IHttpRequestOptions>>([
		{ proxy: { host: '127.0.0.1', port: 1 } },
		{ agentOptions: { keepAlive: false } },
		{ skipSslCertificateValidation: true },
	])('rejects a request that sets a pool setting itself: %o', async (requestSettings) => {
		const client = makeOutboundHttp().requests({
			useDefaultSsrfPolicy: 'unsafe',
			connectionPool: { agentOptions: { keepAlive: true } },
		});

		await expect(client.request({ url: 'http://127.0.0.1:1', ...requestSettings })).rejects.toThrow(
			'does not accept',
		);
		client.close();
	});
});
