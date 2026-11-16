import { GLOBAL_OWNER_ROLE, Person } from '@n8n/db';
import type { HttpMiddlewareV1, HttpRequestV1 } from '@n8n/hooks-api';
import type { RequestHandler } from 'express';
import express from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import type { ControllerRegistry } from '@/controller.registry';

import { PublicHttpService } from '../v1/public-http.service';

const owner = Object.assign(new Person(), {
	id: 'user-1',
	email: 'owner@example.com',
	firstName: 'Jane',
	lastName: 'Doe',
	role: GLOBAL_OWNER_ROLE,
});

describe('PublicHttpService', () => {
	/** Records the order in which middlewares and the handler ran. */
	let calls: string[];

	// Stands in for the registry's middleware chain: session auth sets `req.user`,
	// everything else only records that it ran.
	const authenticate: RequestHandler = (req, _res, next) => {
		calls.push('auth');
		Object.assign(req, { user: owner });
		next();
	};
	const checkScope: RequestHandler = (_req, _res, next) => {
		calls.push('scope');
		next();
	};
	const buildMiddlewares = vi.fn((flags: { skipAuth?: boolean; accessScope?: unknown }) =>
		flags.skipAuth ? [checkScope] : [authenticate],
	);
	const controllerRegistry = { buildMiddlewares } as unknown as ControllerRegistry;

	const createService = () => new PublicHttpService(mock(), controllerRegistry);

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

	beforeEach(() => {
		calls = [];
		buildMiddlewares.mockClear();
		Object.assign(owner, {
			email: 'owner@example.com',
			firstName: 'Jane',
			lastName: 'Doe',
		});
	});

	it('should call the handler with a plain request and send its response as JSON', async () => {
		const service = createService();
		const handler = vi.fn().mockResolvedValue({ status: 201, body: { ok: true } });
		service.registerRoute({
			method: 'post',
			path: '/cloud/admin/users/:userId',
			middlewares: [],
			handler,
		});

		const response = await request(createApp(service))
			.post('/cloud/admin/users/42?tag=a&tag=b&page=2')
			.send({ email: 'jane@example.com' });

		expect(response.status).toBe(201);
		expect(response.body).toEqual({ ok: true });
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'post',
				path: '/cloud/admin/users/42',
				params: { userId: '42' },
				query: { tag: ['a', 'b'], page: '2' },
				body: { email: 'jane@example.com' },
			}),
		);
	});

	it('should omit a body that is not JSON', async () => {
		const service = createService();
		const handler = vi.fn().mockResolvedValue({ status: 204 });
		service.registerRoute({
			method: 'post',
			path: '/cloud/admin/limits',
			middlewares: [],
			handler,
		});

		await request(createApp(service))
			.post('/cloud/admin/limits')
			.set('content-type', 'text/plain')
			.send('hello');

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].body).toBeUndefined();
	});

	it('should omit the empty body the parser inserts when the request has no JSON', async () => {
		const service = createService();
		const handler = vi.fn().mockResolvedValue({ status: 204 });
		service.registerRoute({ method: 'get', path: '/cloud/admin/limits', middlewares: [], handler });

		await request(createApp(service)).get('/cloud/admin/limits');

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].body).toBeUndefined();
	});

	it('should send status 500 if the handler throws', async () => {
		const service = createService();
		service.registerRoute({
			method: 'get',
			path: '/cloud/admin/limits',
			middlewares: [],
			handler: vi.fn().mockRejectedValue(new Error('boom')),
		});

		const response = await request(createApp(service)).get('/cloud/admin/limits');

		expect(response.status).toBe(500);
	});

	it('should send the response headers', async () => {
		const service = createService();
		service.registerRoute({
			method: 'get',
			path: '/cloud/admin/limits',
			middlewares: [],
			handler: vi.fn().mockResolvedValue({
				status: 200,
				headers: { 'x-limits-version': '3' },
				body: { limits: {} },
			}),
		});

		const response = await request(createApp(service)).get('/cloud/admin/limits');

		expect(response.status).toBe(200);
		expect(response.headers['x-limits-version']).toBe('3');
	});

	it('should send no body and no content type when the response has no body', async () => {
		const service = createService();
		service.registerRoute({
			method: 'get',
			path: '/cloud/admin/limits',
			middlewares: [],
			handler: vi.fn().mockResolvedValue({ status: 404 }),
		});

		const response = await request(createApp(service)).get('/cloud/admin/limits');

		expect(response.status).toBe(404);
		expect(response.text).toBe('');
		expect(response.headers['content-type']).toBeUndefined();
	});

	it('should send status 500 if the handler returns no response', async () => {
		const service = createService();
		service.registerRoute({
			method: 'get',
			path: '/cloud/admin/limits',
			middlewares: [],
			handler: vi.fn().mockResolvedValue(undefined),
		});

		const response = await request(createApp(service)).get('/cloud/admin/limits');

		expect(response.status).toBe(500);
	});

	it('should reject a path that does not start with a slash', () => {
		const service = createService();

		expect(() =>
			service.registerRoute({ method: 'get', path: 'limits', middlewares: [], handler: vi.fn() }),
		).toThrow('Route path must start with "/"');
	});

	describe('middlewares', () => {
		it('should run n8n and extension middlewares in array order before the handler', async () => {
			const service = createService();
			const first = vi.fn(async () => {
				calls.push('first');
				return undefined;
			});
			const last = vi.fn(async () => {
				calls.push('last');
				return undefined;
			});
			service.registerRoute({
				method: 'get',
				path: '/cloud/admin/limits',
				middlewares: [first, service.middlewares.sessionAuthentication, last],
				handler: async () => {
					calls.push('handler');
					return { status: 204 };
				},
			});

			const response = await request(createApp(service)).get('/cloud/admin/limits');

			expect(response.status).toBe(204);
			expect(calls).toEqual(['first', 'auth', 'last', 'handler']);
			expect(buildMiddlewares).toHaveBeenCalledWith(
				expect.objectContaining({ skipAuth: false }),
				[],
			);
		});

		it('should end the request with the response an extension middleware returns', async () => {
			const service = createService();
			const handler = vi.fn();
			service.registerRoute({
				method: 'get',
				path: '/cloud/admin/limits',
				middlewares: [async () => ({ status: 401, body: { message: 'no key' } })],
				handler,
			});

			const response = await request(createApp(service)).get('/cloud/admin/limits');

			expect(response.status).toBe(401);
			expect(response.body).toEqual({ message: 'no key' });
			expect(handler).not.toHaveBeenCalled();
		});

		it('should send status 500 if an extension middleware throws', async () => {
			const service = createService();
			const handler = vi.fn();
			service.registerRoute({
				method: 'get',
				path: '/cloud/admin/limits',
				middlewares: [vi.fn().mockRejectedValue(new Error('boom'))],
				handler,
			});

			const response = await request(createApp(service)).get('/cloud/admin/limits');

			expect(response.status).toBe(500);
			expect(handler).not.toHaveBeenCalled();
		});

		it('should pass the authenticated caller as a security context without internal fields', async () => {
			const service = createService();
			let received: HttpRequestV1 | undefined;
			service.registerRoute({
				method: 'get',
				path: '/cloud/admin/whoami',
				middlewares: [service.middlewares.sessionAuthentication],
				handler: async (req) => {
					received = req;
					return { status: 204 };
				},
			});

			await request(createApp(service)).get('/cloud/admin/whoami');

			expect(received?.security).toEqual({
				subject: {
					id: 'user-1',
					type: 'person',
					email: 'owner@example.com',
					firstName: 'Jane',
					lastName: 'Doe',
				},
				authMethod: 'session-cookie',
			});
		});

		it('should omit principal fields the person does not have', async () => {
			const service = createService();
			let received: HttpRequestV1 | undefined;
			service.registerRoute({
				method: 'get',
				path: '/cloud/admin/whoami',
				middlewares: [service.middlewares.sessionAuthentication],
				handler: async (req) => {
					received = req;
					return { status: 204 };
				},
			});
			Object.assign(owner, { email: null, firstName: null, lastName: null });

			await request(createApp(service)).get('/cloud/admin/whoami');

			expect(Object.keys(received?.security?.subject ?? {})).toEqual(['id', 'type']);
		});

		it('should have no security context on a route without session authentication', async () => {
			const service = createService();
			let received: HttpRequestV1 | undefined;
			service.registerRoute({
				method: 'get',
				path: '/cloud/admin/limits',
				middlewares: [],
				handler: async (req) => {
					received = req;
					return { status: 204 };
				},
			});

			await request(createApp(service)).get('/cloud/admin/limits');

			expect(received).toBeDefined();
			expect(received?.security).toBeUndefined();
		});

		it('should map requireGlobalScope to a global scope check after session authentication', async () => {
			const service = createService();
			service.registerRoute({
				method: 'get',
				path: '/cloud/admin/limits',
				middlewares: [
					service.middlewares.sessionAuthentication,
					service.middlewares.requireGlobalScope('workflow:list'),
				],
				handler: async () => ({ status: 204 }),
			});

			const response = await request(createApp(service)).get('/cloud/admin/limits');

			expect(response.status).toBe(204);
			expect(calls).toEqual(['auth', 'scope']);
			expect(buildMiddlewares).toHaveBeenLastCalledWith(
				expect.objectContaining({
					skipAuth: true,
					accessScope: { scope: 'workflow:list', globalOnly: true },
				}),
				[],
			);
		});

		it('should reject an unknown scope when the middleware is created', () => {
			const service = createService();

			expect(() => service.middlewares.requireGlobalScope('workflow:fly')).toThrow(
				'Unknown scope "workflow:fly"',
			);
		});

		it.each([
			[
				'alone',
				(service: PublicHttpService) => [service.middlewares.requireGlobalScope('workflow:list')],
			],
			[
				'before session authentication',
				(service: PublicHttpService) => [
					service.middlewares.requireGlobalScope('workflow:list'),
					service.middlewares.sessionAuthentication,
				],
			],
		])('should reject requireGlobalScope %s', (_, middlewares) => {
			const service = createService();

			expect(() =>
				service.registerRoute({
					method: 'get',
					path: '/cloud/admin/limits',
					middlewares: middlewares(service),
					handler: vi.fn(),
				}),
			).toThrow('requireGlobalScope needs sessionAuthentication before it');
		});

		it('should reject a middleware that did not come from api.http.middlewares', () => {
			const service = createService();
			const forged: HttpMiddlewareV1 = { name: 'sessionAuthentication' };

			expect(() =>
				service.registerRoute({
					method: 'get',
					path: '/cloud/admin/limits',
					middlewares: [forged],
					handler: vi.fn(),
				}),
			).toThrow('Unknown middleware. Use one from api.http.middlewares');
		});
	});
});
