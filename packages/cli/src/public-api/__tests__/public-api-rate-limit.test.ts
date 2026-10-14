import type { EventService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
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
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { markPublicApiController } from '@/public-api/__tests__/public-api-controller-test-utils';
import { PublicApiControllerRegistry } from '@/public-api/public-api-controller.registry';
import { PublicApiRateLimitService } from '@/public-api/public-api-rate-limit.service';
import { RateLimitService } from '@/services/rate-limit.service';
import type { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import type { LastActiveAtService } from '@/services/last-active-at.service';

type RateLimitConfig = GlobalConfig['publicApi']['rateLimit'];

const API_KEY_HEADER = 'x-test-api-key-id';

describe('Public API rate limiting', () => {
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
			expect((await send(app, 'get', '/widgets', null)).status).toBe(200);
		}
	});

	it('turns off a layer when its limit is 0', async () => {
		const app = activate({ globalReadLimit: 0, endpointReadLimit: 2 });

		await sendTimes(app, 2, 'get', '/widgets');
		expect((await send(app, 'get', '/widgets')).status).toBe(429);
		await sendTimes(app, 2, 'get', '/widgets/other');
	});

	it('does not count a request that the per-endpoint limit blocks toward the all-endpoints limit', async () => {
		const app = activate({ globalReadLimit: 3, endpointReadLimit: 1 });

		await send(app, 'get', '/widgets');
		expect((await send(app, 'get', '/widgets')).status).toBe(429);
		expect((await send(app, 'get', '/widgets')).status).toBe(429);

		await sendTimes(app, 1, 'get', '/widgets/other');
		await sendTimes(app, 1, 'get', '/widgets/1');
	});

	it('reports the all-endpoints limit in the headers of a successful request', async () => {
		const app = activate({ globalReadLimit: 10, endpointReadLimit: 5 });

		const response = await send(app, 'get', '/widgets');

		expect(response.status).toBe(200);
		expect(response.headers['x-ratelimit-limit']).toBe('10');
		expect(response.headers['x-ratelimit-remaining']).toBe('9');
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
