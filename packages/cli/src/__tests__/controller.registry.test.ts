jest.mock('@n8n/backend-common', () => {
	return {
		...jest.requireActual('@n8n/backend-common'),
		inProduction: true,
	};
});

import type { GlobalConfig } from '@n8n/config';
import {
	ControllerRegistryMetadata,
	Param,
	Get,
	Post,
	Body,
	Licensed,
	RestController,
	RootLevelController,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import express, { json } from 'express';
import { mock } from 'jest-mock-extended';
import { agent as testAgent } from 'supertest';

import type { AuthService } from '@/auth/auth.service';
import { ControllerRegistry } from '@/controller.registry';
import type { License } from '@/license';
import type { LastActiveAtService } from '@/services/last-active-at.service';
import { RateLimitService } from '@/services/rate-limit.service';
import type { SuperAgentTest } from '@test-integration/types';

describe('ControllerRegistry', () => {
	const license = mock<License>();
	const authService = mock<AuthService>();
	const globalConfig = mock<GlobalConfig>({ endpoints: { rest: 'rest' } });
	const metadata = Container.get(ControllerRegistryMetadata);
	const lastActiveAtService = mock<LastActiveAtService>();
	let agent: SuperAgentTest;
	const authMiddleware = jest.fn().mockImplementation(async (_req, _res, next) => next());

	beforeEach(() => {
		jest.resetAllMocks();
		const app = express();
		app.use(json());
		authService.createAuthMiddleware.mockImplementation(() => authMiddleware);
		new ControllerRegistry(
			license,
			authService,
			globalConfig,
			metadata,
			lastActiveAtService,
			new RateLimitService(mock()),
		).activate(app);
		agent = testAgent(app);
	});

	describe('IP-based rate limiting', () => {
		@RestController('/test')
		// @ts-expect-error tsc complains about unused class
		class TestController {
			@Get('/unlimited')
			unlimited() {
				return { ok: true };
			}

			@Get('/rate-limited', { ipRateLimit: true })
			rateLimited() {
				return { ok: true };
			}
		}

		beforeEach(() => {
			authMiddleware.mockImplementation(async (_req, _res, next) => next());
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});

		it('should not rate-limit by default', async () => {
			for (let i = 0; i < 6; i++) {
				await agent.get('/rest/test/unlimited').expect(200);
			}
		});

		it('should rate-limit when configured', async () => {
			for (let i = 0; i < 5; i++) {
				await agent.get('/rest/test/rate-limited').expect(200);
			}
			await agent.get('/rest/test/rate-limited').expect(429);
		});
	});

	describe('Body-based keyed rate limiting', () => {
		@RestController('/test')
		// @ts-expect-error tsc complains about unused class
		class TestController {
			@Post('/body-keyed', {
				skipAuth: true,
				keyedRateLimit: {
					limit: 3,
					windowMs: 60_000,
					source: 'body',
					field: 'email',
				},
			})
			bodyKeyed(@Body _body: { email: string }) {
				return { ok: true };
			}
		}

		beforeAll(() => {
			authMiddleware.mockImplementation(async (_req, _res, next) => next());
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});

		test.each([null, undefined, [''], {}])(
			'should not rate limit when keyed value is %s',
			async (identifier) => {
				for (let i = 0; i < 5; i++) {
					await agent.post('/rest/test/body-keyed').send({ email: identifier }).expect(200);
				}
			},
		);

		it('should apply keyed rate limiting based on request body field', async () => {
			const email = 'test@example.com';

			for (let i = 0; i < 3; i++) {
				await agent.post('/rest/test/body-keyed').send({ email }).expect(200);
			}

			await agent.post('/rest/test/body-keyed').send({ email }).expect(429);

			await agent.post('/rest/test/body-keyed').send({ email: 'other@example.com' }).expect(200);
		});
	});

	describe('User-based keyed rate limiting', () => {
		@RestController('/test')
		// @ts-expect-error tsc complains about unused class
		class TestController {
			@Post('/user-keyed', {
				keyedRateLimit: {
					limit: 3,
					windowMs: 60_000,
					source: 'user',
				},
			})
			bodyKeyed(@Body _body: { email: string }) {
				return { ok: true };
			}
		}

		beforeEach(() => {
			authMiddleware.mockImplementation(async (req, _res, next) => {
				req.user = { id: 'user-1' };
				next();
			});
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});

		it('should apply keyed rate limiting based on user id', async () => {
			for (let i = 0; i < 3; i++) {
				await agent.post('/rest/test/user-keyed').send({}).expect(200);
			}

			await agent.post('/rest/test/user-keyed').send({}).expect(429);

			authMiddleware.mockImplementation(async (req, _res, next) => {
				req.user = { id: 'user-2' };
				next();
			});

			await agent.post('/rest/test/user-keyed').send({}).expect(200);
		});
	});

	describe('Authorization', () => {
		@RestController('/test')
		// @ts-expect-error tsc complains about unused class
		class TestController {
			@Get('/no-auth', { skipAuth: true })
			noAuth() {
				return { ok: true };
			}

			@Get('/auth')
			auth() {
				return { ok: true };
			}
		}

		it('should not require auth if configured to skip', async () => {
			await agent.get('/rest/test/no-auth').expect(200);
			expect(authMiddleware).not.toHaveBeenCalled();
		});

		it('should require auth by default', async () => {
			authMiddleware.mockImplementation(async (_req, res) => {
				res.status(401).send();
			});
			await agent.get('/rest/test/auth').expect(401);
			expect(authMiddleware).toHaveBeenCalled();
		});
	});

	describe('License checks', () => {
		@RestController('/test')
		// @ts-expect-error tsc complains about unused class
		class TestController {
			@Get('/with-sharing')
			@Licensed('feat:sharing')
			sharing() {
				return { ok: true };
			}
		}

		beforeEach(() => {
			authMiddleware.mockImplementation(async (_req, _res, next) => next());
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});

		it('should disallow when feature is missing', async () => {
			license.isLicensed.calledWith('feat:sharing').mockReturnValue(false);
			await agent.get('/rest/test/with-sharing').expect(403);
			expect(license.isLicensed).toHaveBeenCalled();
		});

		it('should allow when feature is available', async () => {
			license.isLicensed.calledWith('feat:sharing').mockReturnValue(true);
			await agent.get('/rest/test/with-sharing').expect(200);
			expect(license.isLicensed).toHaveBeenCalled();
		});
	});

	describe('Args', () => {
		@RestController('/test')
		// @ts-expect-error tsc complains about unused class
		class TestController {
			@Get('/args/:id')
			args(req: express.Request, res: express.Response, @Param('id') id: string) {
				res.setHeader('Testing', 'true');
				return { url: req.url, id };
			}
		}

		beforeEach(() => {
			authMiddleware.mockImplementation(async (_req, _res, next) => next());
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});

		it('should pass in correct args to the route handler', async () => {
			const { headers, body } = await agent.get('/rest/test/args/1234').expect(200);
			expect(headers.testing).toBe('true');
			expect(body.data).toEqual({ url: '/args/1234', id: '1234' });
		});
	});

	describe('Root-level controllers', () => {
		@RootLevelController('/public')
		// @ts-expect-error tsc complains about unused class
		class PublicController {
			@Get('/info')
			info() {
				return { ok: true };
			}
		}

		@RootLevelController()
		// @ts-expect-error tsc complains about unused class
		class RootController {
			@Get('/ping')
			ping() {
				return { ok: true };
			}
		}

		beforeEach(() => {
			authMiddleware.mockImplementation(async (_req, _res, next) => next());
			lastActiveAtService.middleware.mockImplementation(async (_req, _res, next) => next());
		});

		it('should mount controller without rest prefix', async () => {
			const { body } = await agent.get('/public/info').expect(200);
			expect(body.data).toEqual({ ok: true });
			await agent.get('/rest/public/info').expect(404);
		});

		it('should mount default controller at root path', async () => {
			const { body } = await agent.get('/ping').expect(200);
			expect(body.data).toEqual({ ok: true });
		});
	});
});
