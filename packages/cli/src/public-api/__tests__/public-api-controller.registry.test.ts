import { Z } from '@n8n/api-types';
import type { AuthenticatedRequest, User } from '@n8n/db';
import {
	ApiResponse,
	Body,
	ControllerRegistryMetadata,
	Deprecated,
	Get,
	Param,
	Post,
} from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import express from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { EventService } from '@/events/event.service';
import {
	markPublicApiController,
	OptionalWidgetBodyDto,
	WidgetBodyDto,
} from '@/public-api/__tests__/public-api-controller-test-utils';
import { PublicApiControllerRegistry } from '@/public-api/public-api-controller.registry';
import type { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import type { LastActiveAtService } from '@/services/last-active-at.service';

describe('PublicApiControllerRegistry', () => {
	const authStrategyRegistry = mock<AuthStrategyRegistry>();
	const lastActiveAtService = mock<LastActiveAtService>();
	const eventService = mock<EventService>();
	const authenticatedUser = mock<User>({ id: 'user-1' });

	function activate(): express.Express {
		const app = express();
		app.use(express.json());
		// mirrors the app-wide bodyParser, which defaults an absent body to `{}`
		app.use((req, _res, next) => {
			req.body ??= {};
			next();
		});
		const router = express.Router({ mergeParams: true });
		new PublicApiControllerRegistry(
			Container.get(ControllerRegistryMetadata),
			authStrategyRegistry,
			lastActiveAtService,
			eventService,
		).activate(router, 'v1');
		// mirrors the production mount, `apiController.use('/api/v1', ..., controllerRouter)`
		app.use('/api/v1', router);
		return app;
	}

	beforeEach(() => {
		vi.resetAllMocks();
		// mirrors the real strategies, which set `req.user` on success
		authStrategyRegistry.authenticate.mockImplementation(async (req: AuthenticatedRequest) => {
			req.user = authenticatedUser;
			return true;
		});
		lastActiveAtService.updateLastActiveIfStale.mockResolvedValue(undefined);
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

		const response = await request(activate()).get('/api/v1/widgets').expect(200);

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

		const response = await request(activate()).get('/api/v1/widgets').expect(401);

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

		const response = await request(activate()).get('/api/v1/widgets').expect(200);

		expect(response.headers.deprecation).toBeUndefined();
		expect(eventService.emit).toHaveBeenCalledWith(
			'public-api-invoked',
			expect.objectContaining({ method: 'GET', path: '/widgets' }),
		);
	});

	it('reports the version-less route path for a sub-path route', async () => {
		@Service()
		class WidgetsPublicController {
			@Get('/:widgetId')
			@ApiResponse(200)
			method() {
				return { ok: true };
			}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		await request(activate()).get('/api/v1/widgets/w-1').expect(200);

		expect(eventService.emit).toHaveBeenCalledWith(
			'public-api-invoked',
			expect.objectContaining({ method: 'GET', path: '/widgets/w-1' }),
		);
	});

	describe('success response without a DTO', () => {
		it('sends an empty body without a content-type when the handler returns nothing', async () => {
			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(201)
				create() {}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate()).post('/api/v1/widgets').expect(201);

			expect(response.text).toBe('');
			expect(response.headers['content-type']).toBeUndefined();
		});
	});

	describe('validation failures', () => {
		class WidgetValidationDto extends Z.class({
			name: z.string(),
			active: z.undefined({ invalid_type_error: 'is read-only' }),
		}) {}

		it('returns the formatted message as a 400', async () => {
			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(200)
				create(_req: express.Request, _res: express.Response, @Body _body: WidgetValidationDto) {
					return { ok: true };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate())
				.post('/api/v1/widgets')
				.send({ name: 'w', active: false })
				.expect(400);

			expect(response.body.message).toBe('request/body/active is read-only');
		});
	});

	describe('path parameter validation', () => {
		const widgetIdSchema = z.string().regex(/^(?!0+$)\d+$/, 'must be a positive integer');

		function registerValidatedRoute() {
			@Service()
			class WidgetsPublicController {
				@Get('/:widgetId')
				@ApiResponse(200)
				get(
					_req: express.Request,
					_res: express.Response,
					@Param('widgetId', widgetIdSchema) widgetId: string,
				) {
					return { widgetId };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');
		}

		it('rejects a value that fails its schema with a 400 naming the parameter', async () => {
			registerValidatedRoute();

			const response = await request(activate()).get('/api/v1/widgets/abc').expect(400);

			expect(response.body.message).toBe('request/params/widgetId must be a positive integer');
		});

		it('hands a passing value to the handler as a string', async () => {
			registerValidatedRoute();

			const response = await request(activate()).get('/api/v1/widgets/12').expect(200);

			expect(response.body).toEqual({ widgetId: '12' });
		});

		it('hands the raw value through when the @Param declares no schema', async () => {
			@Service()
			class WidgetsPublicController {
				@Get('/:widgetId')
				@ApiResponse(200)
				get(_req: express.Request, _res: express.Response, @Param('widgetId') widgetId: string) {
					return { widgetId };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate()).get('/api/v1/widgets/abc').expect(200);

			expect(response.body).toEqual({ widgetId: 'abc' });
		});
	});

	describe('request media type', () => {
		function registerOptionalBodyRoute() {
			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(200)
				method(_req: unknown, _res: unknown, @Body body: OptionalWidgetBodyDto) {
					return body;
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');
		}

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

		function registerRequiredOptionalBodyRoute() {
			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(200)
				method(
					_req: unknown,
					_res: unknown,
					@Body({ required: true }) body: OptionalWidgetBodyDto,
				) {
					return body;
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');
		}

		it('accepts application/json', async () => {
			registerBodyRoute();

			await request(activate())
				.post('/api/v1/widgets')
				.set('Content-Type', 'application/json')
				.send({ name: 'a' })
				.expect(200);
		});

		it('accepts application/json with parameters', async () => {
			registerBodyRoute();

			await request(activate())
				.post('/api/v1/widgets')
				.set('Content-Type', 'application/json; charset=utf-8')
				.send({ name: 'a' })
				.expect(200);
		});

		it.each([
			['application/x-www-form-urlencoded', 'application/x-www-form-urlencoded'],
			['application/xml', 'application/xml'],
			['text/plain', 'text/plain'],
			['application/octet-stream', 'application/octet-stream'],
			['text/PlAiN; charset=UTF-8', 'text/plain; charset=utf-8'],
			['multipart/form-data; boundary=XYZ', 'multipart/form-data'],
		])('rejects %s with 415', async (sent, reported) => {
			registerBodyRoute();

			const response = await request(activate())
				.post('/api/v1/widgets')
				.set('Content-Type', sent)
				.send('a')
				.expect(415);

			expect(response.body.message).toBe(`unsupported media type ${reported}`);
		});

		it('rejects a non-JSON media type when no body follows', async () => {
			registerBodyRoute();

			const response = await request(activate())
				.post('/api/v1/widgets')
				.set('Content-Type', 'application/x-www-form-urlencoded')
				.expect(415);

			expect(response.body.message).toBe(
				'unsupported media type application/x-www-form-urlencoded',
			);
		});

		const namesNoMediaType: Array<[string, string | undefined]> = [
			['a request with no Content-Type', undefined],
			['a request with an empty Content-Type', ''],
			['a request with a whitespace Content-Type', ' '],
		];

		function postWithContentType(header: string | undefined) {
			const pending = request(activate()).post('/api/v1/widgets');

			return header === undefined ? pending : pending.set('Content-Type', header);
		}

		it.each(namesNoMediaType)(
			'accepts %s when every body field is optional',
			async (_label, header) => {
				registerOptionalBodyRoute();

				await postWithContentType(header).expect(200);
			},
		);

		it.each(namesNoMediaType)('rejects %s when the body is required', async (_label, header) => {
			registerBodyRoute();

			const response = await postWithContentType(header).expect(415);

			expect(response.body.message).toBe('unsupported media type undefined');
		});

		it.each(namesNoMediaType)(
			'rejects %s when @Body({ required: true }) overrides an otherwise-optional DTO',
			async (_label, header) => {
				registerRequiredOptionalBodyRoute();

				const response = await postWithContentType(header).expect(415);

				expect(response.body.message).toBe('unsupported media type undefined');
			},
		);

		it('accepts application/json with an empty object when @Body({ required: true }) is set', async () => {
			registerRequiredOptionalBodyRoute();

			await request(activate())
				.post('/api/v1/widgets')
				.set('Content-Type', 'application/json')
				.send({})
				.expect(200);
		});

		it('accepts application/json carrying an unrelated parameter', async () => {
			registerBodyRoute();

			await request(activate())
				.post('/api/v1/widgets')
				.set('Content-Type', 'application/json; Foo=BAR')
				.send({ name: 'a' })
				.expect(200);
		});
	});
});
