import { channel } from 'node:diagnostics_channel';
import express from 'express';
import request from 'supertest';
import { get } from 'node:http';
import { once } from 'node:events';
import type { ServerResponse, ClientRequest } from 'node:http';

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
	Reflect.get(globalThis, Symbol.for('n8n.memory-profiler.capture'))?.clear();
});

function configure(requestDetails: boolean, responseDetails: boolean) {
	Reflect.get(globalThis, Symbol.for('n8n.memory-profiler.capture')).set('test', {
		requestDetails,
		responseDetails,
		state: { expiresAt: Date.now() + 60_000 },
	});
}

it.each([
	[true, false],
	[false, true],
	[true, true],
])(
	'captures request %s and response %s details independently',
	async (requestDetails, responseDetails) => {
		const app = express();
		app.use(createMemoryProfilerMiddleware('rest', 'api'));
		app.use(express.json());
		configure(requestDetails, responseDetails);
		app.post('/rest/echo/:id', (req, res) => {
			res.setHeader('set-cookie', 'session=private-cookie');
			res.setHeader('x-result', 'visible-header');
			res.json({ value: req.body.value, password: 'private-response' });
		});
		const response = await request(app)
			.post('/rest/echo/example?q=visible&token=private-query')
			.set('authorization', 'Bearer private-header')
			.send({ value: 'visible-body', password: 'private-body' });
		expect(response.body).toEqual({ value: 'visible-body', password: 'private-response' });
		const completed = events[1] as Record<string, unknown>;
		expect(Boolean(completed.request)).toBe(requestDetails);
		expect(Boolean(completed.response)).toBe(responseDetails);
		if (requestDetails)
			expect(completed.request).toMatchObject({
				url: '/rest/echo/example?q=visible&token=%5BREDACTED%5D',
				body: { text: '{"value":"visible-body","password":"[REDACTED]"}' },
			});
		if (responseDetails)
			expect(completed.response).toMatchObject({
				body: { text: '{"value":"visible-body","password":"[REDACTED]"}' },
			});
		expect(JSON.stringify(events)).not.toMatch(
			/private-query|private-header|private-body|private-response|private-cookie/,
		);
	},
);

it('omits oversized and binary bodies while preserving responses', async () => {
	const app = express();
	app.use(createMemoryProfilerMiddleware('rest', 'api'));
	app.use(express.json({ limit: '1mb' }));
	configure(true, true);
	app.post('/rest/large', (req, res) => res.json(req.body));
	app.get('/rest/binary', (_req, res) =>
		res.type('application/octet-stream').send(Buffer.alloc(128)),
	);
	const value = 'x'.repeat(70 * 1024);
	expect((await request(app).post('/rest/large').send({ value })).body).toEqual({ value });
	expect(events[1]).toMatchObject({
		request: { body: { omitted: 'size-limit' } },
		response: { body: { omitted: 'size-limit' } },
	});
	expect(JSON.stringify(events).length).toBeLessThan(4096);
	expect((await request(app).get('/rest/binary')).body).toHaveLength(128);
	expect(events[3]).toMatchObject({ response: { body: { omitted: 'content-type' } } });
});

it('captures response chunks without changing write callbacks', async () => {
	const app = express();
	app.use(createMemoryProfilerMiddleware('rest', 'api'));
	configure(false, true);
	const callbacks: string[] = [];
	app.get('/rest/chunks', (_req, res) => {
		res.type('text/plain');
		res.write('first', 'utf8', () => callbacks.push('write'));
		res.end('second', 'utf8', () => callbacks.push('end'));
	});
	expect((await request(app).get('/rest/chunks')).text).toBe('firstsecond');
	expect(events[1]).toMatchObject({ response: { body: { text: 'firstsecond' } } });
	expect(callbacks).toEqual(['write', 'end']);
});

it('leaves response methods unchanged when payload capture is off', async () => {
	const app = express();
	const middleware = createMemoryProfilerMiddleware('rest', 'api');
	app.use((req, res, next) => {
		const write = res.write;
		const end = res.end;
		void middleware(req, res, () => {
			expect(res.write).toBe(write);
			expect(res.end).toBe(end);
			next();
		});
	});
	app.get('/rest/empty', (_req, res) => res.end());
	await request(app).get('/rest/empty');
	expect(events[1]).not.toHaveProperty('request');
	expect(events[1]).not.toHaveProperty('response');
});

it('bounds response buffers across concurrent calls', async () => {
	const app = express();
	app.use(createMemoryProfilerMiddleware('rest', 'api'));
	configure(false, true);
	const responses: ServerResponse[] = [];
	const clients: ClientRequest[] = [];
	app.get('/rest/stream', (_req, res) => {
		responses.push(res);
		res.type('text/plain').write('start');
	});
	const server = app.listen(0, '127.0.0.1');
	await once(server, 'listening');
	try {
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('Missing test port');
		const ended: Array<Promise<void>> = [];
		await Promise.all(
			Array.from(
				{ length: 33 },
				async () =>
					await new Promise<void>((resolve, reject) => {
						const client = get(`http://127.0.0.1:${address.port}/rest/stream`, (res) => {
							ended.push(new Promise<void>((done) => res.once('end', done)));
							res.resume();
							resolve();
						});
						client.on('error', reject);
						clients.push(client);
					}),
			),
		);
		for (const response of responses) response.end('done');
		await Promise.all(ended);
		const completed = events.filter((event) => (event as { event: string }).event === 'finish');
		expect(completed).toHaveLength(33);
		expect(
			completed.filter((event) => JSON.stringify(event).includes('concurrency-limit')),
		).toHaveLength(1);
	} finally {
		for (const client of clients) client.destroy();
		server.closeAllConnections();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
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
