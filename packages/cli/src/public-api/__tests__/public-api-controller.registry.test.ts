import { ListTagsQueryDto, publicApiUploadedFileSchema, Z } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import {
	ApiKeyScope,
	ApiResponse,
	Body,
	ControllerRegistryMetadata,
	Deprecated,
	Get,
	Middleware,
	Param,
	Post,
	ProjectScope,
	Query,
	RequiresUserQuota,
} from '@n8n/decorators';
import type { Controller, MultipartUploadLimits } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import express from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { NotFoundError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';
import {
	markPublicApiController,
	OptionalWidgetBodyDto,
	WidgetBodyDto,
} from '@/public-api/__tests__/public-api-controller-test-utils';
import { PublicApiControllerRegistry } from '@/public-api/public-api-controller.registry';
import type { AuthStrategyRegistry } from '@/services/auth-strategy.registry';
import type { LastActiveAtService } from '@/services/last-active-at.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

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

		it.each(['0', '-1'])('rejects a query limit of %s with a 400', async (limit) => {
			@Service()
			class WidgetsPublicController {
				@Get('/')
				@ApiResponse(200)
				list(_req: express.Request, _res: express.Response, @Query _query: ListTagsQueryDto) {
					return { ok: true };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const response = await request(activate()).get(`/api/v1/widgets?limit=${limit}`).expect(400);

			expect(response.body.message).toBe(
				'request/query/limit Param `limit` must be a positive integer',
			);
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

	describe('path parameter validation order', () => {
		const widgetIdSchema = z.string().regex(/^(?!0+$)\d+$/, 'must be a positive integer');

		function registerScopedRoute() {
			@Service()
			class ScopedWidgetsPublicController {
				@Get('/:widgetId')
				@ProjectScope('workflow:read')
				@ApiResponse(200)
				get(
					_req: express.Request,
					_res: express.Response,
					@Param('widgetId', widgetIdSchema) widgetId: string,
				) {
					return { widgetId };
				}
			}
			markPublicApiController(ScopedWidgetsPublicController as Controller, '/widgets');
		}

		it('rejects a malformed parameter with 400 before the scope check looks it up', async () => {
			// A scope check resolves access by looking the id up, and reports an id it cannot find as
			// a 404. Validation runs first, so the status does not depend on the caller's access.
			vi.mocked(userHasScopes).mockRejectedValue(new NotFoundError('Widget not found'));
			registerScopedRoute();

			const response = await request(activate()).get('/api/v1/widgets/abc').expect(400);

			expect(response.body.message).toBe('request/params/widgetId must be a positive integer');
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('runs the scope check once the parameter is valid', async () => {
			vi.mocked(userHasScopes).mockRejectedValue(new NotFoundError('Widget not found'));
			registerScopedRoute();

			await request(activate()).get('/api/v1/widgets/12').expect(404);

			expect(userHasScopes).toHaveBeenCalled();
		});

		it('refuses a valid parameter when the scope check denies access', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);
			registerScopedRoute();

			await request(activate()).get('/api/v1/widgets/12').expect(403);
		});

		it('hands the parsed value to the handler when the scope check passes', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);
			registerScopedRoute();

			const response = await request(activate()).get('/api/v1/widgets/12').expect(200);

			expect(response.body).toEqual({ widgetId: '12' });
		});

		it('keeps 401 ahead of parameter validation for an unauthenticated caller', async () => {
			authStrategyRegistry.authenticate.mockResolvedValue(false);
			registerScopedRoute();

			await request(activate()).get('/api/v1/widgets/abc').expect(401);
		});
	});

	describe('request media type', () => {
		const namesNoMediaType: Array<[string, string | undefined]> = [
			['a request with no Content-Type', undefined],
			['a request with an empty Content-Type', ''],
			['a request with a whitespace Content-Type', ' '],
		];

		function postWithContentType(header: string | undefined, path: string) {
			const pending = request(activate()).post(`/api/v1/widgets/${path}`);

			return header === undefined ? pending : pending.set('Content-Type', header);
		}

		class PackageBodyDto extends Z.class(
			{ package: publicApiUploadedFileSchema, workflowConflictPolicy: z.string() },
			{ strict: true },
		) {}

		function registerWidgetsController() {
			@Service()
			class WidgetsPublicController {
				@Post('/required')
				@ApiResponse(200)
				required(_req: unknown, _res: unknown, @Body body: WidgetBodyDto) {
					return body;
				}

				@Post('/optional')
				@ApiResponse(200)
				optional(_req: unknown, _res: unknown, @Body body: OptionalWidgetBodyDto) {
					return body;
				}

				@Post('/required-optional')
				@ApiResponse(200)
				requiredOptional(
					_req: unknown,
					_res: unknown,
					@Body({ required: true }) body: OptionalWidgetBodyDto,
				) {
					return body;
				}

				@Post('/upload')
				@ApiResponse(200)
				upload(
					_req: unknown,
					_res: unknown,
					@Body({ mediaType: 'multipart/form-data', uploadLimits: () => ({}) })
					body: PackageBodyDto,
				) {
					return { workflowConflictPolicy: body.workflowConflictPolicy, size: body.package.size };
				}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');
		}

		beforeEach(() => {
			registerWidgetsController();
		});

		it('accepts application/json', async () => {
			await request(activate())
				.post('/api/v1/widgets/required')
				.set('Content-Type', 'application/json')
				.send({ name: 'a' })
				.expect(200);
		});

		it('accepts application/json with parameters', async () => {
			await request(activate())
				.post('/api/v1/widgets/required')
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
			const response = await request(activate())
				.post('/api/v1/widgets/required')
				.set('Content-Type', sent)
				.send('a')
				.expect(415);

			expect(response.body.message).toBe(`unsupported media type ${reported}`);
		});

		it('rejects a non-JSON media type when no body follows', async () => {
			const response = await request(activate())
				.post('/api/v1/widgets/required')
				.set('Content-Type', 'application/x-www-form-urlencoded')
				.expect(415);

			expect(response.body.message).toBe(
				'unsupported media type application/x-www-form-urlencoded',
			);
		});

		it.each(namesNoMediaType)(
			'accepts %s when every body field is optional',
			async (_label, header) => {
				await postWithContentType(header, 'optional').expect(200);
			},
		);

		it.each(namesNoMediaType)('rejects %s when the body is required', async (_label, header) => {
			const response = await postWithContentType(header, 'required').expect(415);

			expect(response.body.message).toBe('unsupported media type undefined');
		});

		it.each(namesNoMediaType)(
			'rejects %s when @Body({ required: true }) overrides an otherwise-optional DTO',
			async (_label, header) => {
				const response = await postWithContentType(header, 'required-optional').expect(415);

				expect(response.body.message).toBe('unsupported media type undefined');
			},
		);

		it('accepts application/json with an empty object when @Body({ required: true }) is set', async () => {
			await request(activate())
				.post('/api/v1/widgets/required-optional')
				.set('Content-Type', 'application/json')
				.send({})
				.expect(200);
		});

		it('accepts application/json carrying an unrelated parameter', async () => {
			await request(activate())
				.post('/api/v1/widgets/required')
				.set('Content-Type', 'application/json; Foo=BAR')
				.send({ name: 'a' })
				.expect(200);
		});

		describe('multipart request bodies', () => {
			it('parses a multipart body, merging the uploaded file with text fields', async () => {
				const response = await request(activate())
					.post('/api/v1/widgets/upload')
					.field('workflowConflictPolicy', 'new-version')
					.attach('package', Buffer.from('hello'), 'export.n8np')
					.expect(200);

				expect(response.body).toEqual({ workflowConflictPolicy: 'new-version', size: 5 });
			});

			it('rejects a JSON body with 415 for a multipart-only route', async () => {
				const response = await request(activate())
					.post('/api/v1/widgets/upload')
					.set('Content-Type', 'application/json')
					.send({ workflowConflictPolicy: 'new-version' })
					.expect(415);

				expect(response.body.message).toBe('unsupported media type application/json');
			});

			it('rejects a request missing the required file with 400', async () => {
				const response = await request(activate())
					.post('/api/v1/widgets/upload')
					.field('workflowConflictPolicy', 'new-version')
					.expect(400);

				expect(response.body.message).toBe("request/body must have required property 'package'");
			});

			it('rejects an unknown form field with 400', async () => {
				const response = await request(activate())
					.post('/api/v1/widgets/upload')
					.field('workflowConflictPolicy', 'new-version')
					.field('evil', 'x')
					.attach('package', Buffer.from('hello'), 'export.n8np')
					.expect(400);

				expect(response.body.message).toBe('Unexpected form field "evil"');
			});

			function registerUploadLimitedRoute(uploadLimits: () => MultipartUploadLimits) {
				@Service()
				class WidgetsUploadLimitedPublicController {
					@Post('/upload-limited')
					@ApiResponse(200)
					method(
						_req: unknown,
						_res: unknown,
						@Body({ mediaType: 'multipart/form-data', uploadLimits }) body: PackageBodyDto,
					) {
						return { workflowConflictPolicy: body.workflowConflictPolicy, size: body.package.size };
					}
				}
				markPublicApiController(WidgetsUploadLimitedPublicController as Controller, '/widgets');
			}

			it('rejects an oversized file with 413', async () => {
				registerUploadLimitedRoute(() => ({ fileSize: 2 }));

				const response = await request(activate())
					.post('/api/v1/widgets/upload-limited')
					.field('workflowConflictPolicy', 'new-version')
					.attach('package', Buffer.from('hello'), 'export.n8np')
					.expect(413);

				expect(response.body.message).toBe('File too large');
			});

			it('keeps 401 ahead of multipart parsing for an unauthenticated caller', async () => {
				authStrategyRegistry.authenticate.mockResolvedValue(false);
				registerUploadLimitedRoute(() => ({ fileSize: 2 }));

				// The file is bigger than the configured limit; a 413 here would mean the body was
				// parsed before authentication ran.
				await request(activate())
					.post('/api/v1/widgets/upload-limited')
					.field('workflowConflictPolicy', 'new-version')
					.attach('package', Buffer.from('hello'), 'export.n8np')
					.expect(401);
			});

			it('keeps the scope check ahead of multipart parsing', async () => {
				authStrategyRegistry.authenticate.mockImplementation(async (req: AuthenticatedRequest) => {
					req.user = authenticatedUser;
					req.tokenGrant = { scopes: [], apiKeyScopes: [], subject: authenticatedUser };
					return true;
				});

				@Service()
				class WidgetsUploadScopedPublicController {
					@Post('/upload-scoped')
					@ApiResponse(200)
					@ApiKeyScope('workflow:import')
					method(
						_req: unknown,
						_res: unknown,
						@Body({ mediaType: 'multipart/form-data', uploadLimits: () => ({ fileSize: 2 }) })
						body: PackageBodyDto,
					) {
						return body;
					}
				}
				markPublicApiController(WidgetsUploadScopedPublicController as Controller, '/widgets');

				// Same oversized file as above: a 413 here would mean the body was parsed before the
				// scope check ran.
				const response = await request(activate())
					.post('/api/v1/widgets/upload-scoped')
					.field('workflowConflictPolicy', 'new-version')
					.attach('package', Buffer.from('hello'), 'export.n8np')
					.expect(403);

				expect(response.body).toEqual({ message: 'Forbidden' });
			});

			it('hands the parsed body to a controller middleware, not only to the handler', async () => {
				const middlewareSaw: unknown[] = [];

				@Service()
				class WidgetsUploadMiddlewarePublicController {
					@Middleware()
					capture(req: express.Request, _res: express.Response, next: express.NextFunction) {
						middlewareSaw.push(req.body);
						next();
					}

					@Post('/upload-middleware')
					@ApiResponse(200)
					method(
						_req: unknown,
						_res: unknown,
						@Body({ mediaType: 'multipart/form-data', uploadLimits: () => ({}) })
						body: PackageBodyDto,
					) {
						return { ok: true, size: body.package.size };
					}
				}
				markPublicApiController(WidgetsUploadMiddlewarePublicController as Controller, '/widgets');

				await request(activate())
					.post('/api/v1/widgets/upload-middleware')
					.field('workflowConflictPolicy', 'new-version')
					.attach('package', Buffer.from('hello'), 'export.n8np')
					.expect(200);

				expect(middlewareSaw).toHaveLength(1);
				expect(middlewareSaw[0]).toMatchObject({ workflowConflictPolicy: 'new-version' });
			});
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
});
