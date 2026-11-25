import type { AuthenticatedRequest } from '@n8n/db';
import express from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { rememberRawBody } from '@/idempotency/idempotency-request';
import {
	createIdempotencyMiddleware,
	IDEMPOTENCY_KEY_IN_PROGRESS_MESSAGE,
	IDEMPOTENCY_KEY_INVALID_MESSAGE,
	IDEMPOTENCY_KEY_MISMATCH_MESSAGE,
} from '@/idempotency/idempotency.middleware';
import type { IdempotencyStore } from '@/idempotency/idempotency.types';

describe('createIdempotencyMiddleware', () => {
	const store = mock<IdempotencyStore>();
	let calls: number;

	function app(): express.Express {
		const server = express();
		server.use(
			express.json({
				verify: (req, _res, buf) => {
					rememberRawBody(req, buf);
				},
			}),
		);
		server.use((req, _res, next) => {
			(req as AuthenticatedRequest).user = { id: 'user-1' } as AuthenticatedRequest['user'];
			next();
		});

		const idempotency = createIdempotencyMiddleware(store);
		server.get('/api/v1/workflows', idempotency, (_req, res) => {
			calls += 1;
			res.status(200).json({ data: [] });
		});
		server.put('/api/v1/workflows/:workflowId', idempotency, (_req, res) => {
			calls += 1;
			res.status(200).json({ id: 'wf' });
		});
		server.delete('/api/v1/workflows/:workflowId', idempotency, (_req, res) => {
			calls += 1;
			res.status(200).json({ id: 'wf' });
		});
		server.post('/api/v1/workflows', idempotency, (req, res) => {
			calls += 1;
			res.status(200).json({ id: 'wf', name: req.body.name });
		});

		return server;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		calls = 0;
	});

	it.each([
		['get', '/api/v1/workflows'],
		['put', '/api/v1/workflows/wf'],
		['delete', '/api/v1/workflows/wf'],
	] as const)('does not touch the store for %s', async (method, url) => {
		await request(app())[method](url).set('Idempotency-Key', 'abc').expect(200);

		expect(calls).toBe(1);
		expect(store.claim).not.toHaveBeenCalled();
	});

	it('does not touch the store when the header is missing or blank', async () => {
		await request(app()).post('/api/v1/workflows').send({ name: 'A' }).expect(200);
		await request(app())
			.post('/api/v1/workflows')
			.set('Idempotency-Key', '   ')
			.send({ name: 'A' })
			.expect(200);

		expect(calls).toBe(2);
		expect(store.claim).not.toHaveBeenCalled();
	});

	it('returns 400 for a malformed key and does not touch the store', async () => {
		const response = await request(app())
			.post('/api/v1/workflows')
			.set('Idempotency-Key', 'bad key')
			.send({ name: 'A' })
			.expect(400);

		expect(response.body).toEqual({ message: IDEMPOTENCY_KEY_INVALID_MESSAGE });
		expect(calls).toBe(0);
		expect(store.claim).not.toHaveBeenCalled();
	});

	it('returns 409 while the first request is still processing', async () => {
		store.claim.mockResolvedValue({ outcome: 'processing' });

		const response = await request(app())
			.post('/api/v1/workflows')
			.set('Idempotency-Key', 'abc')
			.send({ name: 'A' })
			.expect(409);

		expect(response.body).toEqual({ message: IDEMPOTENCY_KEY_IN_PROGRESS_MESSAGE });
		expect(calls).toBe(0);
	});

	it('returns 422 when the same key is reused with a different request', async () => {
		store.claim.mockResolvedValue({ outcome: 'mismatch' });

		const response = await request(app())
			.post('/api/v1/workflows')
			.set('Idempotency-Key', 'abc')
			.send({ name: 'B' })
			.expect(422);

		expect(response.body).toEqual({ message: IDEMPOTENCY_KEY_MISMATCH_MESSAGE });
		expect(calls).toBe(0);
	});

	it('fingerprints the raw body, path, and query', async () => {
		store.claim.mockResolvedValue({ outcome: 'claimed', id: 'row-1' });

		await request(app())
			.post('/api/v1/workflows?source=api')
			.set('Idempotency-Key', 'abc')
			.send({ name: 'Hello' })
			.expect(200);

		expect(store.claim).toHaveBeenCalledWith({
			userId: 'user-1',
			idempotencyKey: 'abc',
			fingerprint: expect.any(String),
		});

		const first = store.claim.mock.calls[0]?.[0].fingerprint;

		await request(app())
			.post('/api/v1/workflows?source=api')
			.set('Idempotency-Key', 'abc')
			.set('Content-Type', 'application/json')
			.send('{"name":"Hello"}')
			.expect(200);

		expect(store.claim.mock.calls[1]?.[0].fingerprint).toBe(first);

		await request(app())
			.post('/api/v1/workflows?source=api')
			.set('Idempotency-Key', 'abc')
			.send({ name: 'Other' })
			.expect(200);

		expect(store.claim.mock.calls[2]?.[0].fingerprint).not.toBe(first);
	});

	it('fingerprints raw JSON bytes that parse to the same body', async () => {
		store.claim.mockResolvedValue({ outcome: 'claimed', id: 'row-1' });

		await request(app())
			.post('/api/v1/workflows')
			.set('Idempotency-Key', 'abc')
			.set('Content-Type', 'application/json')
			.send('{"name":"Other"}')
			.expect(200);

		await request(app())
			.post('/api/v1/workflows')
			.set('Idempotency-Key', 'abc')
			.set('Content-Type', 'application/json')
			.send('{ "name" : "Other" }')
			.expect(200);

		const compact = store.claim.mock.calls[0]?.[0].fingerprint;
		const spaced = store.claim.mock.calls[1]?.[0].fingerprint;
		expect(spaced).not.toBe(compact);
	});

	it('replays an empty body instead of JSON null', async () => {
		store.claim.mockResolvedValue({
			outcome: 'replay',
			responseStatus: 201,
			responseBody: null,
		});

		const response = await request(app())
			.post('/api/v1/workflows')
			.set('Idempotency-Key', 'abc')
			.send({ name: 'A' })
			.expect(201);

		expect(response.text).toBe('');
		expect(calls).toBe(0);
	});
});
