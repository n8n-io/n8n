import { Z } from '@n8n/api-types';
import {
	ApiResponse,
	Body,
	ControllerRegistryMetadata,
	Deprecated,
	Get,
	Post,
} from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import express from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { EventService } from '@/events/event.service';
import { markPublicApiController } from '@/public-api/__tests__/public-api-controller-test-utils';
import { PublicApiControllerRegistry } from '@/public-api/public-api-controller.registry';
import type { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import type { LastActiveAtService } from '@/services/last-active-at.service';

describe('PublicApiControllerRegistry', () => {
	const authStrategyRegistry = mock<AuthStrategyRegistry>();
	const lastActiveAtService = mock<LastActiveAtService>();
	const eventService = mock<EventService>();

	function activate(): express.Express {
		const app = express();
		app.use(express.json());
		const router = express.Router({ mergeParams: true });
		new PublicApiControllerRegistry(
			Container.get(ControllerRegistryMetadata),
			authStrategyRegistry,
			lastActiveAtService,
			eventService,
		).activate(router, 'v1');
		app.use(router);
		return app;
	}

	beforeEach(() => {
		vi.resetAllMocks();
		authStrategyRegistry.authenticate.mockResolvedValue(true);
		Container.set(ControllerRegistryMetadata, new ControllerRegistryMetadata());
	});

	it('emits the Deprecation header for a route marked @Deprecated', async () => {
		const since = new Date('2026-07-23T00:00:00Z');

		@Service()
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@Deprecated({ since })
			method() {
				return { ok: true };
			}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const response = await request(activate()).get('/widgets').expect(200);

		expect(response.headers.deprecation).toBe(`@${Math.floor(since.getTime() / 1000)}`);
	});

	it('emits the Deprecation header even when authentication fails', async () => {
		const since = new Date('2026-07-23T00:00:00Z');
		authStrategyRegistry.authenticate.mockResolvedValue(false);

		@Service()
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@Deprecated({ since })
			method() {
				return { ok: true };
			}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const response = await request(activate()).get('/widgets').expect(401);

		expect(response.headers.deprecation).toBe(`@${Math.floor(since.getTime() / 1000)}`);
	});

	it('omits the Deprecation header when @Deprecated is absent', async () => {
		@Service()
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			method() {
				return { ok: true };
			}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const response = await request(activate()).get('/widgets').expect(200);

		expect(response.headers.deprecation).toBeUndefined();
	});

	describe('validation failures', () => {
		class WidgetBodyDto extends Z.class({
			name: z.string(),
			active: z.undefined({ invalid_type_error: 'is read-only' }),
		}) {}

		it('returns the formatted message as a 400', async () => {
			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(200)
				create(_req: express.Request, _res: express.Response, @Body _body: WidgetBodyDto) {
					return { ok: true };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate())
				.post('/widgets')
				.send({ name: 'w', active: false })
				.expect(400);

			expect(response.body.message).toBe('request/body/active is read-only');
		});
	});
});
