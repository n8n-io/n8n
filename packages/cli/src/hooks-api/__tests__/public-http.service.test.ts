import express from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { PublicHttpService } from '../v1/public-http.service';

describe('PublicHttpService', () => {
	const createApp = (service: PublicHttpService) => {
		const app = express();
		app.use(express.json());
		app.use((req, _res, next) => {
			const header = req.headers['content-type'];
			if (typeof header === 'string') req.contentType = header.split(';')[0]?.trim();
			if (req.contentType === 'application/json' && req.body !== undefined) {
				req.rawBody = Buffer.from(JSON.stringify(req.body));
			}
			req.body ??= {};
			next();
		});
		app.use(service.router);
		return app;
	};

	it('should call the handler with a plain request and send its response as JSON', async () => {
		const service = new PublicHttpService(mock());
		const handler = vi.fn().mockResolvedValue({ status: 201, body: { ok: true } });
		service.registerRoute({ method: 'post', path: '/cloud/admin/users/:userId', handler });

		const response = await request(createApp(service))
			.post('/cloud/admin/users/42?tag=a&tag=b')
			.send({ email: 'jane@example.com' });

		expect(response.status).toBe(201);
		expect(response.body).toEqual({ ok: true });
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'post',
				path: '/cloud/admin/users/42',
				params: { userId: '42' },
				query: { tag: ['a', 'b'] },
				body: { email: 'jane@example.com' },
			}),
		);
	});

	it('should omit a body that is not JSON', async () => {
		const service = new PublicHttpService(mock());
		const handler = vi.fn().mockResolvedValue({ status: 204 });
		service.registerRoute({ method: 'post', path: '/cloud/admin/limits', handler });

		await request(createApp(service))
			.post('/cloud/admin/limits')
			.set('content-type', 'text/plain')
			.send('hello');

		expect(handler).toHaveBeenCalledWith(expect.objectContaining({ body: undefined }));
	});

	it('should omit the empty body the parser inserts when the request has no JSON', async () => {
		const service = new PublicHttpService(mock());
		const handler = vi.fn().mockResolvedValue({ status: 204 });
		service.registerRoute({ method: 'get', path: '/cloud/admin/limits', handler });

		await request(createApp(service)).get('/cloud/admin/limits');

		expect(handler).toHaveBeenCalledWith(expect.objectContaining({ body: undefined }));
	});

	it('should send status 500 if the handler throws', async () => {
		const service = new PublicHttpService(mock());
		service.registerRoute({
			method: 'get',
			path: '/cloud/admin/limits',
			handler: vi.fn().mockRejectedValue(new Error('boom')),
		});

		const response = await request(createApp(service)).get('/cloud/admin/limits');

		expect(response.status).toBe(500);
	});

	it('should reject a path that does not start with a slash', () => {
		const service = new PublicHttpService(mock());

		expect(() =>
			service.registerRoute({ method: 'get', path: 'limits', handler: vi.fn() }),
		).toThrow('Route path must start with "/"');
	});
});
