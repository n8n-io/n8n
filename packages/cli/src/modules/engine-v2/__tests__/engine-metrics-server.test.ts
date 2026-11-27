import type { Server } from 'node:http';
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

	let server: Server;

	beforeAll(async () => {
		server = await startEngineMetricsServer(registry, { host: '127.0.0.1', port: 0 });
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

	it.each([
		['GET', '/'],
		['GET', '/healthz'],
		['GET', '/metrics/extra'],
		['POST', '/metrics'],
	] as const)('answers 404 to %s %s', async (method, path) => {
		const response = await request(server)[method === 'GET' ? 'get' : 'post'](path);

		expect(response.status).toBe(404);
	});

	it('rejects when it cannot bind the port', async () => {
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('expected a TCP address');

		await expect(
			startEngineMetricsServer(registry, { host: '127.0.0.1', port: address.port }),
		).rejects.toThrow('EADDRINUSE');
	});
});
