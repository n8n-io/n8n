import { publicApiUploadedFileSchema, Z } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import {
	ApiKeyScope,
	ApiResponse,
	Body,
	ControllerRegistryMetadata,
	Deprecated,
	Get,
	Param,
	Post,
	RequiresUserQuota,
} from '@n8n/decorators';
import type { Controller, MultipartUploadLimits } from '@n8n/decorators';
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

class WidgetImportBodyDto extends Z.class(
	{ name: z.string(), package: publicApiUploadedFileSchema },
	{ strict: true },
) {}

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

	describe('@RequiresUserQuota', () => {
		const licenseState = mock<LicenseState>();

		beforeEach(() => {
			Container.set(LicenseState, licenseState);
		});

		function registerGatedRoute() {
			@Service()
			class WidgetsPublicController {
				@Get('/')
				@ApiResponse(200)
				@RequiresUserQuota()
				method() {
					return { ok: true };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');
		}

		it('runs the handler when the instance is within its users quota', async () => {
			licenseState.getMaxUsers.mockReturnValue(UNLIMITED_LICENSE_QUOTA);
			registerGatedRoute();

			const response = await request(activate()).get('/api/v1/widgets').expect(200);

			expect(response.body).toEqual({ ok: true });
		});

		it('returns 403 with the legacy license message when over quota, without running the handler', async () => {
			licenseState.getMaxUsers.mockReturnValue(5);
			const handler = vi.fn(() => ({ ok: true }));

			@Service()
			class WidgetsPublicController {
				@Get('/')
				@ApiResponse(200)
				@RequiresUserQuota()
				method() {
					return handler();
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate()).get('/api/v1/widgets').expect(403);

			expect(response.body).toEqual({
				message: '/users path can only be used with a valid license. See https://n8n.io/pricing/',
			});
			expect(handler).not.toHaveBeenCalled();
		});

		it('leaves a route without the decorator unaffected when over quota', async () => {
			licenseState.getMaxUsers.mockReturnValue(5);

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

			expect(response.body).toEqual({ ok: true });
		});

		it('returns the scope Forbidden response when both @ApiKeyScope and @RequiresUserQuota fail', async () => {
			licenseState.getMaxUsers.mockReturnValue(5);
			authStrategyRegistry.authenticate.mockImplementation(async (req: AuthenticatedRequest) => {
				req.user = authenticatedUser;
				req.tokenGrant = {
					scopes: [],
					apiKeyScopes: ['workflow:read'],
					subject: authenticatedUser,
				};
				return true;
			});

			@Service()
			class WidgetsPublicController {
				@Get('/')
				@ApiResponse(200)
				@ApiKeyScope('workflow:create')
				@RequiresUserQuota()
				method() {
					return { ok: true };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate()).get('/api/v1/widgets').expect(403);

			expect(response.body).toEqual({ message: 'Forbidden' });
		});
	});

	describe('multipart bodies', () => {
		function registerMultipartRoute(uploadLimits: () => MultipartUploadLimits = () => ({})) {
			const handler = vi.fn((body: WidgetImportBodyDto) => ({
				name: body.name,
				originalname: body.package.originalname,
				content: Buffer.from(body.package.buffer).toString('utf8'),
			}));

			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(200)
				method(
					_req: unknown,
					_res: unknown,
					@Body({ mediaType: 'multipart/form-data', uploadLimits }) body: WidgetImportBodyDto,
				) {
					return handler(body);
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			return handler;
		}

		it('hands the text fields and the uploaded file to the handler through the DTO', async () => {
			registerMultipartRoute();

			const response = await request(activate())
				.post('/api/v1/widgets')
				.field('name', 'my-widget')
				.attach('package', Buffer.from('package bytes'), 'export.n8np')
				.expect(200);

			expect(response.body).toEqual({
				name: 'my-widget',
				originalname: 'export.n8np',
				content: 'package bytes',
			});
		});

		it('rejects application/json on a multipart route with 415', async () => {
			registerMultipartRoute();

			const response = await request(activate())
				.post('/api/v1/widgets')
				.set('Content-Type', 'application/json')
				.send({ name: 'a' })
				.expect(415);

			expect(response.body.message).toBe('unsupported media type application/json');
		});

		it('rejects a request with no Content-Type when the multipart body is required', async () => {
			registerMultipartRoute();

			const response = await request(activate()).post('/api/v1/widgets').expect(415);

			expect(response.body.message).toBe('unsupported media type undefined');
		});

		it('rejects a missing file part with the eov-style required-property message', async () => {
			registerMultipartRoute();

			const response = await request(activate())
				.post('/api/v1/widgets')
				.field('name', 'my-widget')
				.expect(400);

			expect(response.body.message).toBe("request/body must have required property 'package'");
		});

		it('rejects an unrecognized text field on the strict DTO', async () => {
			registerMultipartRoute();

			const response = await request(activate())
				.post('/api/v1/widgets')
				.field('name', 'my-widget')
				.field('unexpected', 'value')
				.attach('package', Buffer.from('package bytes'), 'export.n8np')
				.expect(400);

			expect(response.body.message).toBe(
				"request/body Unrecognized key(s) in object: 'unexpected'",
			);
		});

		it("returns 413 with multer's message when the file exceeds fileSize", async () => {
			registerMultipartRoute(() => ({ fileSize: 4 }));

			const response = await request(activate())
				.post('/api/v1/widgets')
				.field('name', 'my-widget')
				.attach('package', Buffer.from('package bytes'), 'export.n8np')
				.expect(413);

			expect(response.body.message).toBe('File too large');
		});

		it("returns 413 with multer's message when a second file exceeds the files limit", async () => {
			registerMultipartRoute(() => ({ files: 1 }));

			const response = await request(activate())
				.post('/api/v1/widgets')
				.field('name', 'my-widget')
				.attach('package', Buffer.from('one'), 'one.n8np')
				.attach('package', Buffer.from('two'), 'two.n8np')
				.expect(413);

			expect(response.body.message).toBe('Too many files');
		});

		it("returns 400 with multer's message when a text field exceeds fieldSize", async () => {
			registerMultipartRoute(() => ({ fieldSize: 2 }));

			const response = await request(activate())
				.post('/api/v1/widgets')
				.field('name', 'a-name-longer-than-two-bytes')
				.attach('package', Buffer.from('package bytes'), 'export.n8np')
				.expect(400);

			expect(response.body.message).toBe('Field value too long');
		});

		it('returns 401 and never runs the parser or the handler when unauthenticated', async () => {
			authStrategyRegistry.authenticate.mockResolvedValue(false);
			const handler = registerMultipartRoute();

			await request(activate())
				.post('/api/v1/widgets')
				.field('name', 'my-widget')
				.attach('package', Buffer.from('package bytes'), 'export.n8np')
				.expect(401);

			expect(handler).not.toHaveBeenCalled();
		});

		it('returns 403 before parsing when the API-key scope is missing', async () => {
			authStrategyRegistry.authenticate.mockImplementation(async (req: AuthenticatedRequest) => {
				req.user = authenticatedUser;
				req.tokenGrant = { scopes: [], apiKeyScopes: [], subject: authenticatedUser };
				return true;
			});

			const handler = vi.fn((body: WidgetImportBodyDto) => body);

			@Service()
			class WidgetsPublicController {
				@Post('/')
				@ApiResponse(200)
				@ApiKeyScope('workflow:create')
				method(
					_req: unknown,
					_res: unknown,
					@Body({ mediaType: 'multipart/form-data', uploadLimits: () => ({}) })
					body: WidgetImportBodyDto,
				) {
					return handler(body);
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate())
				.post('/api/v1/widgets')
				.field('name', 'my-widget')
				.attach('package', Buffer.from('package bytes'), 'export.n8np')
				.expect(403);

			expect(response.body).toEqual({ message: 'Forbidden' });
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('binary responses', () => {
		it('streams the bytes and headers the handler writes, unchanged', async () => {
			@Service()
			class WidgetsPublicController {
				@Get('/')
				@ApiResponse(200, {
					binaryMediaType: 'application/gzip',
					headers: { 'X-Widget-Count': { description: 'Number of widgets.' } },
				})
				method(_req: express.Request, res: express.Response) {
					res.status(200).set('X-Widget-Count', '3').send(Buffer.from('gzip bytes'));
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate()).get('/api/v1/widgets').expect(200);

			expect(response.headers['x-widget-count']).toBe('3');
			expect(response.body).toEqual(Buffer.from('gzip bytes'));
		});

		it('returns 500 when the handler declares a binary response but sends nothing', async () => {
			@Service()
			class WidgetsPublicController {
				@Get('/')
				@ApiResponse(200, { binaryMediaType: 'application/gzip' })
				method() {
					// Bug: never writes to `res`.
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate()).get('/api/v1/widgets').expect(500);

			expect(response.body.message).toBe('Internal server error');
		});
	});
});
