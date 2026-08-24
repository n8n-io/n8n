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

import type { EventService } from '@/events/event.service';
import {
	markPublicApiController,
	WidgetBodyDto,
} from '@/public-api/__tests__/public-api-controller-test-utils';
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

	describe('request media type', () => {
		function registerBodyRoute() {
			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(200)
				method(_req: unknown, _res: unknown, @Body body: WidgetBodyDto) {
					return body;
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');
		}

		it('accepts application/json', async () => {
			registerBodyRoute();

			await request(activate())
				.post('/widgets')
				.set('Content-Type', 'application/json')
				.send({ name: 'a' })
				.expect(200);
		});

		it('accepts application/json with parameters', async () => {
			registerBodyRoute();

			await request(activate())
				.post('/widgets')
				.set('Content-Type', 'application/json; charset=utf-8')
				.send({ name: 'a' })
				.expect(200);
		});

		it('rejects a form-encoded body with 415', async () => {
			registerBodyRoute();

			const response = await request(activate())
				.post('/widgets')
				.set('Content-Type', 'application/x-www-form-urlencoded')
				.send('name=a')
				.expect(415);

			expect(response.body.message).toBe(
				'unsupported media type application/x-www-form-urlencoded',
			);
		});

		it.each(['application/xml', 'text/plain', 'application/octet-stream'])(
			'rejects %s with 415',
			async (contentType) => {
				registerBodyRoute();

				const response = await request(activate())
					.post('/widgets')
					.set('Content-Type', contentType)
					.send('a')
					.expect(415);

				expect(response.body.message).toBe(`unsupported media type ${contentType}`);
			},
		);

		it('rejects a non-JSON media type even when no body follows', async () => {
			registerBodyRoute();

			await request(activate())
				.post('/widgets')
				.set('Content-Type', 'application/x-www-form-urlencoded')
				.expect(415);
		});
	});
});
