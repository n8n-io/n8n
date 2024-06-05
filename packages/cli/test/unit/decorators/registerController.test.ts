jest.mock('@/constants', () => ({
	inProduction: true,
}));

import express from 'express';
import { agent as testAgent } from 'supertest';

import { Get, RestController, registerController } from '@/decorators';
import { AuthService } from '@/auth/auth.service';
import { mockInstance } from '../../shared/mocking';

describe('registerController', () => {
	@RestController('/test')
	class TestController {
		@Get('/unlimited', { skipAuth: true })
		@Get('/rate-limited', { skipAuth: true, rateLimit: {} })
		endpoint() {
			return { ok: true };
		}
	}

	mockInstance(AuthService);
	const app = express();
	registerController(app, TestController);
	const agent = testAgent(app);

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
