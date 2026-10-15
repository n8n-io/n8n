import { channel } from 'node:diagnostics_channel';
import express from 'express';
import request from 'supertest';
import { get } from 'node:http';
import { once } from 'node:events';

import { createMemoryProfilerMiddleware } from '../memory-profiler';

const requests = channel('n8n.memory-profiler.requests');
let events: unknown[];
const collect = (event: unknown) => events.push(event);

beforeEach(() => {
	events = [];
	requests.subscribe(collect);
});
afterEach(() => {
	requests.unsubscribe(collect);
});

it('records internal and public routes without request values', async () => {
	const app = express();
	app.use(createMemoryProfilerMiddleware('internal', 'public'));
	const router = express.Router({ mergeParams: true });
	router.get('/workflows/:id', (_req, res) => {
		res.status(202).end();
	});
	app.use('/internal/projects/:projectId', router);
	app.post('/public/v1/workflows/:id', (_req, res) => {
		res.status(201).end();
	});
	await request(app)
		.get('/internal/projects/project%2Fvalue/workflows/workflow-value?token=query-value')
		.set('Authorization', 'Bearer header-value');
	await request(app).post('/public/v1/workflows/workflow-value').send({ password: 'body-value' });
	expect(events).toHaveLength(4);
	expect(events[1]).toMatchObject({
		event: 'finish',
		api: 'internal',
		method: 'GET',
		route: '/internal/projects/:projectId/workflows/:id',
		statusCode: 202,
		aborted: false,
		durationMs: expect.any(Number),
	});
	expect(events[3]).toMatchObject({
		event: 'finish',
		api: 'public',
		method: 'POST',
		route: '/public/v1/workflows/:id',
		statusCode: 201,
	});
	expect(JSON.stringify(events)).not.toMatch(
		/project%2Fvalue|project\/value|workflow-value|query-value|header-value|body-value/,
	);
});

it('tracks API prefixes with the same case handling as Express', async () => {
	const app = express();
	app.use(createMemoryProfilerMiddleware('rest', 'api'));
	app.get('/rest/settings', (_req, res) => {
		res.end();
	});
	await request(app).get('/REST/settings');
	expect(events[1]).toMatchObject({ api: 'internal', route: '/rest/settings', statusCode: 200 });
});

it('ignores non-API routes and prefix lookalikes', async () => {
	const app = express();
	app.use(createMemoryProfilerMiddleware('rest', 'api'));
	app.use((_req, res) => {
		res.end();
	});
	for (const path of ['/metrics', '/healthz', '/assets/app.js', '/restart', '/api-other'])
		await request(app).get(path);
	expect(events).toEqual([]);
});

it('records rejected and unmatched calls without their paths', async () => {
	const app = express();
	app.use(createMemoryProfilerMiddleware('rest', 'api'));
	app.use('/api', (_req, res) => {
		res.status(401).end();
	});
	await request(app).get('/api/v1/private-value?key=query-value');
	await request(app).get('/rest/unknown-value');
	expect(events[1]).toMatchObject({ route: '/api/(unmatched)', statusCode: 401 });
	expect(events[3]).toMatchObject({ route: '/rest/(unmatched)', statusCode: 404 });
	expect(JSON.stringify(events)).not.toMatch(/private-value|query-value|unknown-value/);
});

it('records a client disconnect once', async () => {
	const app = express();
	app.use(createMemoryProfilerMiddleware('rest', 'api'));
	let closed: () => void = () => {};
	const disconnected = new Promise<void>((resolve) => {
		closed = resolve;
	});
	app.get('/rest/stream', (_req, res) => {
		res.once('close', closed);
		res.write('started');
	});
	const server = app.listen(0, '127.0.0.1');
	await once(server, 'listening');
	try {
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('Missing test port');
		const client = get(`http://127.0.0.1:${address.port}/rest/stream`, (res) => {
			res.once('data', () => {
				client.destroy();
			});
		});
		client.on('error', () => {});
		await disconnected;
		expect(events).toHaveLength(2);
		expect(events[1]).toMatchObject({ event: 'finish', route: '/rest/stream', aborted: true });
	} finally {
		server.closeAllConnections();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
});
