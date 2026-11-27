import { mockLogger } from '@n8n/backend-test-utils';
import type { Server } from 'node:http';
import { connect } from 'node:net';
import { Gauge, Registry } from 'prom-client';
import request from 'supertest';

import { startEngineMetricsServer } from '../engine-metrics-server';

const close = async (server: Server) =>
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);

describe('startEngineMetricsServer', () => {
	const registry = new Registry();
	new Gauge({ name: 'test_gauge', help: 'A gauge for the test.', registers: [registry] }).set(7);
	const logger = mockLogger();

	let server: Server;

	const port = () => {
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('expected a TCP address');
		return address.port;
	};

	beforeAll(async () => {
		server = await startEngineMetricsServer(registry, { host: '127.0.0.1', port: 0, logger });
	});

	afterAll(async () => {
		await close(server);
	});

	it('serves the registry on GET /metrics', async () => {
		const response = await request(server).get('/metrics');

		expect(response.status).toBe(200);
		expect(response.headers['content-type']).toBe(registry.contentType);
		expect(response.text).toContain('test_gauge 7');
	});

	it('ignores the query string of a scrape', async () => {
		const response = await request(server).get('/metrics?x=1');

		expect(response.status).toBe(200);
	});

	it('listens on the host it is given', () => {
		expect(server.address()).toMatchObject({ address: '127.0.0.1' });
	});

	it.each([
		['GET', '/'],
		['GET', '/healthz'],
		['GET', '/metrics/extra'],
		['POST', '/metrics'],
	] as const)('answers 404 to %s %s', async (method, path) => {
		const response = await request(server)[method === 'GET' ? 'get' : 'post'](path);

		expect(response.status).toBe(404);
	});

	it('answers 404 to a request target that is not a path', async () => {
		const statusLine = await new Promise<string>((resolve, reject) => {
			const socket = connect(port(), '127.0.0.1', () => {
				socket.write('GET http://[ HTTP/1.1\r\nHost: x\r\n\r\n');
			});
			socket.once('data', (data) => {
				resolve(data.toString().split('\r\n')[0]);
				socket.destroy();
			});
			socket.once('error', reject);
		});

		expect(statusLine).toBe('HTTP/1.1 404 Not Found');
	});

	it('answers 500 and logs the error when a metric fails to collect', async () => {
		const failing = new Registry();
		new Gauge({
			name: 'failing_gauge',
			help: 'A gauge that fails to collect.',
			registers: [failing],
			collect() {
				throw new Error('collect failed');
			},
		});
		const failingServer = await startEngineMetricsServer(failing, {
			host: '127.0.0.1',
			port: 0,
			logger,
		});

		try {
			const response = await request(failingServer).get('/metrics');

			expect(response.status).toBe(500);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to collect the engine metrics',
				expect.objectContaining({ error: expect.any(Error) }),
			);
		} finally {
			await close(failingServer);
		}
	});

	it('logs a server error after it bound, instead of crashing', () => {
		const error = new Error('accept failed');

		expect(() => {
			server.emit('error', error);
			server.emit('error', error);
		}).not.toThrow();
		expect(logger.error).toHaveBeenCalledWith('Engine metrics server error', { error });
	});

	it('rejects when it cannot bind the port', async () => {
		await expect(
			startEngineMetricsServer(registry, { host: '127.0.0.1', port: port(), logger }),
		).rejects.toThrow('EADDRINUSE');
	});
});
