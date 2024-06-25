jest.mock('@/constants', () => ({
	inProduction: true,
}));

import express from 'express';
import { agent as testAgent } from 'supertest';
import { mock } from 'jest-mock-extended';

import { ControllerRegistry, Get, Licensed, RestController } from '@/decorators';
import type { AuthService } from '@/auth/auth.service';
import type { License } from '@/License';
import type { SuperAgentTest } from '@test-integration/types';

describe('ControllerRegistry', () => {
	const license = mock<License>();
	const authService = mock<AuthService>();
	let agent: SuperAgentTest;

	beforeEach(() => {
		jest.resetAllMocks();
		const app = express();
		new ControllerRegistry(license, authService).activate(app);
		agent = testAgent(app);
	});

	describe('Rate limiting', () => {
		@RestController('/test')
		// @ts-expect-error tsc complains about unused class
		class TestController {
			@Get('/unlimited')
			unlimited() {
				return { ok: true };
			}

			@Get('/rate-limited', { rateLimit: true })
			rateLimited() {
				return { ok: true };
			}
		}

		beforeEach(() => {
			authService.authMiddleware.mockImplementation(async (_req, _res, next) => next());
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
			expect(authService.authMiddleware).not.toHaveBeenCalled();
		});

		it('should require auth by default', async () => {
			authService.authMiddleware.mockImplementation(async (_req, res) => {
				res.status(401).send();
			});
			await agent.get('/rest/test/auth').expect(401);
			expect(authService.authMiddleware).toHaveBeenCalled();
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
			authService.authMiddleware.mockImplementation(async (_req, _res, next) => next());
		});

		it('should disallow when feature is missing', async () => {
			license.isFeatureEnabled.calledWith('feat:sharing').mockReturnValue(false);
			await agent.get('/rest/test/with-sharing').expect(403);
			expect(license.isFeatureEnabled).toHaveBeenCalled();
		});

		it('should allow when feature is available', async () => {
			license.isFeatureEnabled.calledWith('feat:sharing').mockReturnValue(true);
			await agent.get('/rest/test/with-sharing').expect(200);
			expect(license.isFeatureEnabled).toHaveBeenCalled();
		});
	});
});
