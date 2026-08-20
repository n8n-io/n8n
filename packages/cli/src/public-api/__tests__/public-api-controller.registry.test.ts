import { Z } from '@n8n/api-types';
import {
	ApiResponse,
	Body,
	ControllerRegistryMetadata,
	Deprecated,
	Get,
	Post,
	Query,
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
		// `is read-only` is a fragment: without the path it has no subject.
		class WidgetBodyDto extends Z.class({
			name: z.string(),
			active: z.undefined({ invalid_type_error: 'is read-only' }),
			nested: z.object({ label: z.string() }).optional(),
		}) {}

		class WidgetQueryDto extends Z.class({ limit: z.coerce.number() }) {}

		function widgetsApp(): express.Express {
			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(200)
				create(_req: express.Request, _res: express.Response, @Body _body: WidgetBodyDto) {
					return { ok: true };
				}

				@Get('/')
				@ApiResponse(200)
				list(_req: express.Request, _res: express.Response, @Query _query: WidgetQueryDto) {
					return { ok: true };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');
			return activate();
		}

		it('names the offending body field', async () => {
			const response = await request(widgetsApp()).post('/widgets').send({ name: 1 }).expect(400);

			expect(response.body.message).toBe('request/body/name Expected string, received number');
		});

		it('gives a fragment message its subject', async () => {
			const response = await request(widgetsApp())
				.post('/widgets')
				.send({ name: 'w', active: false })
				.expect(400);

			expect(response.body.message).toBe('request/body/active is read-only');
		});

		it('joins a nested path with slashes', async () => {
			const response = await request(widgetsApp())
				.post('/widgets')
				.send({ name: 'w', nested: { label: 1 } })
				.expect(400);

			expect(response.body.message).toBe(
				'request/body/nested/label Expected string, received number',
			);
		});

		it('reports the location alone when the issue has no path', async () => {
			const response = await request(widgetsApp()).post('/widgets').send([]).expect(400);

			expect(response.body.message).toBe('request/body Expected object, received array');
		});

		it('names a missing field the way the legacy validator did', async () => {
			const response = await request(widgetsApp()).post('/widgets').send({}).expect(400);

			expect(response.body.message).toBe("request/body must have required property 'name'");
		});

		it('attributes a missing nested field to its parent object', async () => {
			const response = await request(widgetsApp())
				.post('/widgets')
				.send({ name: 'w', nested: {} })
				.expect(400);

			expect(response.body.message).toBe("request/body/nested must have required property 'label'");
		});

		it('names the offending query parameter', async () => {
			const response = await request(widgetsApp())
				.get('/widgets')
				.query({ limit: 'abc' })
				.expect(400);

			expect(response.body.message).toBe('request/query/limit Expected number, received nan');
		});
	});
});
