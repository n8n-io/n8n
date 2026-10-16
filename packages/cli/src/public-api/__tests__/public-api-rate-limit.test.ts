import type { EventService } from '@n8n/backend-services';
import type { AuthStrategyRegistry } from '@n8n/backend-services/auth';
import type { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import {
	ApiResponse,
	ControllerRegistryMetadata,
	Get,
	Param,
	Post,
	RateLimitAccess,
} from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import express from 'express';
import type { Request, RequestHandler, Response } from 'express';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { markPublicApiController } from '@/public-api/__tests__/public-api-controller-test-utils';
import { PublicApiControllerRegistry } from '@/public-api/public-api-controller.registry';
import { PublicApiRateLimitService } from '@/public-api/public-api-rate-limit.service';
import { RateLimitService } from '@/services/rate-limit.service';
import type { LastActiveAtService } from '@/services/last-active-at.service';

type RateLimitConfig = GlobalConfig['publicApi']['rateLimit'];

const API_KEY_HEADER = 'x-test-api-key-id';

describe('Public API rate limiting', () => {
	let slowHandlerRuns = 0;

	const authStrategyRegistry = mock<AuthStrategyRegistry>();
	const lastActiveAtService = mock<LastActiveAtService>();
	const authenticatedUser = mock<User>({ id: 'user-1' });

	function activate(rateLimit: Partial<RateLimitConfig> = {}): express.Express {
		const globalConfig = mock<GlobalConfig>({
			publicApi: {
				rateLimit: {
					enabled: true,
					globalReadLimit: 100,
					globalReadWindowSeconds: 60,
					globalWriteLimit: 100,
					globalWriteWindowSeconds: 60,
					endpointReadLimit: 100,
					endpointReadWindowSeconds: 60,
					endpointWriteLimit: 100,
					endpointWriteWindowSeconds: 60,
					...rateLimit,
				},
			},
		});

		const app = express();
		const router = express.Router({ mergeParams: true });
		new PublicApiControllerRegistry(
			Container.get(ControllerRegistryMetadata),
			authStrategyRegistry,
			lastActiveAtService,
			mock<EventService>(),
			new PublicApiRateLimitService(globalConfig, new RateLimitService()),
		).activate(router, 'v1');
		app.use('/api/v1', router);
		return app;
	}

	function registerWidgets() {
		@Service()
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			list() {
				return { ok: true };
			}

			@Get('/other')
			@ApiResponse(200)
			other() {
				return { ok: true };
			}

			@Get('/:id')
			@ApiResponse(200)
			get(_req: unknown, _res: unknown, @Param('id') id: string) {
				return { id };
			}

			@Post('/')
			@ApiResponse(200)
			create() {
				return { ok: true };
			}

			@Post('/slow')
			@ApiResponse(200)
			async slow() {
				slowHandlerRuns++;
				await sleep(200);
				return { ok: true };
			}

			@Post('/search')
			@ApiResponse(200)
			@RateLimitAccess('read')
			search() {
				return { ok: true };
			}
		}

		markPublicApiController(WidgetsPublicController as Controller, '/widgets');
	}

	async function send(
		app: express.Express,
		method: 'get' | 'head' | 'post',
		path: string,
		apiKeyId: string | null = 'key-1',
	) {
		const req = request(app)[method](`/api/v1${path}`);
		return await (apiKeyId === null ? req : req.set(API_KEY_HEADER, apiKeyId));
	}

	async function sendTimes(
		app: express.Express,
		times: number,
		method: 'get' | 'post',
		path: string,
	) {
		for (let i = 0; i < times; i++) {
			expect((await send(app, method, path)).status).toBe(200);
		}
	}

	beforeEach(() => {
		vi.resetAllMocks();
		slowHandlerRuns = 0;
		authStrategyRegistry.authenticate.mockImplementation(async (req: AuthenticatedRequest) => {
			req.user = authenticatedUser;
			const apiKeyId = req.headers[API_KEY_HEADER];
			req.tokenGrant = {
				scopes: [],
				subject: authenticatedUser,
				...(typeof apiKeyId === 'string' && { apiKeyId }),
			};
			return true;
		});
		lastActiveAtService.updateLastActiveIfStale.mockResolvedValue(undefined);
		Container.set(ControllerRegistryMetadata, new ControllerRegistryMetadata());
		registerWidgets();
	});

	it('does not limit requests when rate limiting is off', async () => {
		const app = activate({ enabled: false, globalReadLimit: 1, endpointReadLimit: 1 });

		await sendTimes(app, 3, 'get', '/widgets');
	});

	it('returns 429 with rate-limit headers when the all-endpoints read limit is reached', async () => {
		const app = activate({ globalReadLimit: 2 });

		await send(app, 'get', '/widgets');
		await send(app, 'get', '/widgets/other');
		const response = await send(app, 'get', '/widgets/1');

		expect(response.status).toBe(429);
		expect(response.body).toEqual({ message: 'Too many requests' });
		expect(response.headers['retry-after']).toBeDefined();
		expect(response.headers['x-ratelimit-limit']).toBe('2');
		expect(response.headers['x-ratelimit-remaining']).toBe('0');
		expect(response.headers['x-ratelimit-reset']).toBeDefined();
	});

	it('limits one endpoint without blocking the other endpoints', async () => {
		const app = activate({ endpointReadLimit: 2 });

		await sendTimes(app, 2, 'get', '/widgets');
		const blocked = await send(app, 'get', '/widgets');

		expect(blocked.status).toBe(429);
		expect(blocked.headers['x-ratelimit-limit']).toBe('2');
		expect(blocked.headers['x-ratelimit-remaining']).toBe('0');
		expect(blocked.headers['retry-after']).toBeDefined();
		expect((await send(app, 'get', '/widgets/other')).status).toBe(200);
	});

	it('counts two path values of one route template as one endpoint', async () => {
		const app = activate({ endpointReadLimit: 2 });

		await send(app, 'get', '/widgets/1');
		await send(app, 'get', '/widgets/2');

		expect((await send(app, 'get', '/widgets/3')).status).toBe(429);
	});

	it('counts reads and writes apart', async () => {
		const app = activate({ globalReadLimit: 1, globalWriteLimit: 1 });

		await sendTimes(app, 1, 'get', '/widgets');
		await sendTimes(app, 1, 'post', '/widgets');

		expect((await send(app, 'get', '/widgets')).status).toBe(429);
		expect((await send(app, 'post', '/widgets')).status).toBe(429);
	});

	it('counts each API key apart', async () => {
		const app = activate({ globalReadLimit: 1 });

		expect((await send(app, 'get', '/widgets', 'key-1')).status).toBe(200);
		expect((await send(app, 'get', '/widgets', 'key-2')).status).toBe(200);
		expect((await send(app, 'get', '/widgets', 'key-1')).status).toBe(429);
	});

	it('does not limit a request without an API key ID', async () => {
		const app = activate({ globalReadLimit: 1, endpointReadLimit: 1 });

		for (let i = 0; i < 3; i++) {
			const response = await send(app, 'get', '/widgets', null);
			expect(response.status).toBe(200);
			expect(response.headers['x-ratelimit-limit']).toBeUndefined();
		}
	});

	it('turns off a layer when its limit is 0', async () => {
		const app = activate({ globalReadLimit: 0, endpointReadLimit: 2 });

		await sendTimes(app, 2, 'get', '/widgets');
		expect((await send(app, 'get', '/widgets')).status).toBe(429);
		await sendTimes(app, 2, 'get', '/widgets/other');
	});

	it.each([
		{ layer: 'per-endpoint', globalReadLimit: 0, endpointReadLimit: 3 },
		{ layer: 'all-endpoints', globalReadLimit: 3, endpointReadLimit: 0 },
	])(
		'reports the $layer limit in the headers when it is the only active limit',
		async ({ globalReadLimit, endpointReadLimit }) => {
			const app = activate({ globalReadLimit, endpointReadLimit });

			const response = await send(app, 'get', '/widgets');

			expect(response.status).toBe(200);
			expect(response.headers['x-ratelimit-limit']).toBe('3');
			expect(response.headers['x-ratelimit-remaining']).toBe('2');
		},
	);

	it('does not count a request that the per-endpoint limit blocks toward the all-endpoints limit', async () => {
		const app = activate({ globalReadLimit: 3, endpointReadLimit: 1 });

		await send(app, 'get', '/widgets');
		expect((await send(app, 'get', '/widgets')).status).toBe(429);
		expect((await send(app, 'get', '/widgets')).status).toBe(429);

		await sendTimes(app, 1, 'get', '/widgets/other');
		await sendTimes(app, 1, 'get', '/widgets/1');
	});

	it('does not count a request that the all-endpoints limit blocks toward the per-endpoint limit', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		try {
			const app = activate({
				globalReadLimit: 3,
				globalReadWindowSeconds: 5,
				endpointReadLimit: 5,
				endpointReadWindowSeconds: 60,
			});

			await sendTimes(app, 3, 'get', '/widgets');
			expect((await send(app, 'get', '/widgets')).status).toBe(429);
			expect((await send(app, 'get', '/widgets')).status).toBe(429);

			vi.advanceTimersByTime(6 * Time.seconds.toMilliseconds);

			await sendTimes(app, 2, 'get', '/widgets');
		} finally {
			vi.useRealTimers();
		}
	});

	it('reports the per-endpoint limit when it has fewer requests left', async () => {
		const app = activate({ globalReadLimit: 10, endpointReadLimit: 2 });

		const response = await send(app, 'get', '/widgets');

		expect(response.status).toBe(200);
		expect(response.headers['x-ratelimit-limit']).toBe('2');
		expect(response.headers['x-ratelimit-remaining']).toBe('1');
		expect(response.headers['x-ratelimit-reset']).toBeDefined();
	});

	it('reports the all-endpoints limit when it has fewer requests left', async () => {
		const app = activate({ globalReadLimit: 5, endpointReadLimit: 10 });

		await sendTimes(app, 3, 'get', '/widgets/other');
		const response = await send(app, 'get', '/widgets');

		expect(response.status).toBe(200);
		expect(response.headers['x-ratelimit-limit']).toBe('5');
		expect(response.headers['x-ratelimit-remaining']).toBe('1');
	});

	it('takes back the count of a blocked request before its response ends', async () => {
		// The response never ends, so this fails if the count comes back only when it does. Until
		// then, parallel requests would see the blocked request in the all-endpoints count.
		const service = new PublicApiRateLimitService(
			mock<GlobalConfig>({
				publicApi: {
					rateLimit: {
						enabled: true,
						globalReadLimit: 2,
						globalReadWindowSeconds: 60,
						endpointReadLimit: 1,
						endpointReadWindowSeconds: 60,
					},
				},
			}),
			new RateLimitService(),
		);
		const widgets = service.createRouteLimiters('get');
		const others = service.createRouteLimiters('get');

		const runRoute = async (handlers: RequestHandler[]) => {
			const req = { tokenGrant: { apiKeyId: 'key-1' }, ip: '127.0.0.1', headers: {} };
			const res = mock<Response>({ headersSent: false, writableEnded: false });
			res.status.mockReturnValue(res);
			for (const handler of handlers) {
				let passed = false;
				await handler(req as unknown as Request, res, () => {
					passed = true;
				});
				if (!passed) return res.status.mock.calls[0]?.[0];
			}
			return 200;
		};

		expect(await runRoute(widgets)).toBe(200);
		expect(await runRoute(widgets)).toBe(429);
		expect(await runRoute(others)).toBe(200);
	});

	it('still counts a request whose client disconnects before the response', async () => {
		const app = activate({ globalWriteLimit: 1 });
		const server = app.listen(0);
		const { port } = server.address() as AddressInfo;

		try {
			for (let i = 0; i < 3; i++) {
				const req = httpRequest({
					port,
					method: 'POST',
					path: '/api/v1/widgets/slow',
					headers: { [API_KEY_HEADER]: 'key-1' },
				});
				req.on('error', () => {});
				req.end();
				await sleep(50);
				req.destroy();
			}
			await sleep(300);

			expect(slowHandlerRuns).toBe(1);
			expect((await send(app, 'post', '/widgets')).status).toBe(429);
		} finally {
			server.close();
		}
	});

	describe('when both limits run out at the same time', () => {
		const now = new Date('2026-01-01T00:00:00Z');
		const nowSeconds = now.getTime() / Time.seconds.toMilliseconds;

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(now);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('reports the limit that resets later', async () => {
			const app = activate({
				globalReadLimit: 1,
				globalReadWindowSeconds: 60,
				endpointReadLimit: 1,
				endpointReadWindowSeconds: 10,
			});

			const response = await send(app, 'get', '/widgets');

			expect(response.status).toBe(200);
			expect(response.headers['x-ratelimit-remaining']).toBe('0');
			expect(response.headers['x-ratelimit-reset']).toBe(String(nowSeconds + 60));
		});

		it('tells a blocked client to wait until both limits reset', async () => {
			const app = activate({
				globalReadLimit: 1,
				globalReadWindowSeconds: 60,
				endpointReadLimit: 1,
				endpointReadWindowSeconds: 10,
			});

			await sendTimes(app, 1, 'get', '/widgets');
			const blocked = await send(app, 'get', '/widgets');

			expect(blocked.status).toBe(429);
			expect(blocked.headers['retry-after']).toBe('60');
			expect(blocked.headers['x-ratelimit-limit']).toBe('1');
			expect(blocked.headers['x-ratelimit-reset']).toBe(String(nowSeconds + 60));
		});

		it('reports only the exceeded limit when the other limit is exactly used up', async () => {
			const app = activate({
				globalReadLimit: 2,
				globalReadWindowSeconds: 60,
				endpointReadLimit: 1,
				endpointReadWindowSeconds: 10,
			});

			await sendTimes(app, 1, 'get', '/widgets');
			const blocked = await send(app, 'get', '/widgets');

			expect(blocked.status).toBe(429);
			expect(blocked.headers['retry-after']).toBe('10');
			expect(blocked.headers['x-ratelimit-limit']).toBe('1');

			vi.advanceTimersByTime(11 * Time.seconds.toMilliseconds);

			await sendTimes(app, 1, 'get', '/widgets');
		});
	});

	it('does not count a HEAD request, which the registry rejects with 405', async () => {
		const app = activate({ globalReadLimit: 1, endpointReadLimit: 1 });

		expect((await send(app, 'head', '/widgets')).status).toBe(405);
		expect((await send(app, 'head', '/widgets')).status).toBe(405);

		expect((await send(app, 'get', '/widgets')).status).toBe(200);
	});

	it('uses the access from @RateLimitAccess over the HTTP method', async () => {
		const app = activate({ globalReadLimit: 1, globalWriteLimit: 100 });

		await sendTimes(app, 1, 'post', '/widgets/search');

		expect((await send(app, 'get', '/widgets')).status).toBe(429);
		expect((await send(app, 'post', '/widgets')).status).toBe(200);
	});
});
