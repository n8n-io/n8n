import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	ControllerRegistryMetadata,
	Get,
	Param,
	Post,
	Query,
} from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import {
	markPublicApiController,
	WidgetBodyDto,
	WidgetQueryDto,
	WidgetResponseDto,
} from '@/public-api/__tests__/public-api-controller-test-utils';

import {
	apiKeyScopesSatisfy,
	resolvePublicApiRoutes,
	resolveRouteArgs,
	scopeRequirementFromString,
	scopeRequirementToString,
	scopesInRequirement,
} from '../public-api-route-resolver';

describe('public-api-route-resolver', () => {
	beforeEach(() => {
		Container.set(ControllerRegistryMetadata, new ControllerRegistryMetadata());
	});

	describe('resolveRouteArgs', () => {
		const resolve = (controllerClass: Controller) => {
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				controllerClass,
				'method',
			);
			return resolveRouteArgs(controllerClass, 'method', args);
		};

		it('passes a param arg through unchanged', () => {
			class TestController {
				method(@Param('id') _id: string) {}
			}

			expect(resolve(TestController as Controller)).toEqual([{ type: 'param', key: 'id' }]);
		});

		it('resolves a body arg to its Zod DTO via design:paramtypes reflection', () => {
			class TestController {
				method(@Body _body: WidgetBodyDto) {}
			}

			expect(resolve(TestController as Controller)).toEqual([{ type: 'body', dto: WidgetBodyDto }]);
		});

		it('resolves a query arg to its Zod DTO via design:paramtypes reflection', () => {
			class TestController {
				method(@Query _query: WidgetQueryDto) {}
			}

			expect(resolve(TestController as Controller)).toEqual([
				{ type: 'query', dto: WidgetQueryDto },
			]);
		});

		it('resolves param/body/query args together, preserving parameter order', () => {
			class TestController {
				method(
					@Param('id') _id: string,
					@Body _body: WidgetBodyDto,
					@Query _query: WidgetQueryDto,
				) {}
			}

			expect(resolve(TestController as Controller)).toEqual([
				{ type: 'param', key: 'id' },
				{ type: 'body', dto: WidgetBodyDto },
				{ type: 'query', dto: WidgetQueryDto },
			]);
		});

		it('skips undecorated leading parameters before the first decorated one', () => {
			class TestController {
				method(_req: unknown, _res: unknown, @Query _query: WidgetQueryDto) {}
			}

			expect(resolve(TestController as Controller)).toEqual([
				{ type: 'query', dto: WidgetQueryDto },
			]);
		});

		it('throws when an undecorated parameter follows a decorated one', () => {
			class TestController {
				method(@Param('id') _id: string, _undecorated: number, @Body _body: WidgetBodyDto) {}
			}

			expect(() => resolve(TestController as Controller)).toThrow(UnexpectedError);
			expect(() => resolve(TestController as Controller)).toThrow(
				'Public API route TestController.method has an undecorated parameter at index 1',
			);
		});

		it('throws when an undecorated parameter trails after the last decorated one', () => {
			class TestController {
				method(@Query _query: WidgetQueryDto, _extra: number) {}
			}

			expect(() => resolve(TestController as Controller)).toThrow(UnexpectedError);
			expect(() => resolve(TestController as Controller)).toThrow(
				'Public API route TestController.method has an undecorated parameter at index 1',
			);
		});

		it('throws when a @Body arg has no resolvable Zod DTO', () => {
			class TestController {
				method(@Body _body: object) {}
			}

			expect(() => resolve(TestController as Controller)).toThrow(UnexpectedError);
			expect(() => resolve(TestController as Controller)).toThrow(
				'Public API route TestController.method is missing a Zod DTO for @body',
			);
		});

		it('throws when a @Query arg has no resolvable Zod DTO', () => {
			class TestController {
				method(@Query _query: string) {}
			}

			expect(() => resolve(TestController as Controller)).toThrow(
				'Public API route TestController.method is missing a Zod DTO for @query',
			);
		});
	});

	describe('scopeRequirementToString', () => {
		it('passes a plain string scope through unchanged', () => {
			expect(scopeRequirementToString('tag:list')).toBe('tag:list');
		});

		it('joins anyOf scopes with a comma', () => {
			expect(scopeRequirementToString({ anyOf: ['workflow:read', 'workflow:list'] })).toBe(
				'workflow:read,workflow:list',
			);
		});

		it('joins allOf scopes with a comma', () => {
			expect(scopeRequirementToString({ allOf: ['project:create', 'project:update'] })).toBe(
				'project:create,project:update',
			);
		});
	});

	describe('apiKeyScopesSatisfy', () => {
		it('requires the exact scope for a plain string requirement', () => {
			expect(apiKeyScopesSatisfy(['tag:list'], 'tag:list')).toBe(true);
			expect(apiKeyScopesSatisfy(['tag:read'], 'tag:list')).toBe(false);
		});

		it('requires only one of an anyOf requirement', () => {
			const requirement = { anyOf: ['project:export', 'workflow:export'] } as const;
			expect(apiKeyScopesSatisfy(['workflow:export'], requirement)).toBe(true);
			expect(apiKeyScopesSatisfy(['tag:list'], requirement)).toBe(false);
		});

		it('requires all of an allOf requirement', () => {
			const requirement = { allOf: ['project:create', 'project:update'] } as const;
			expect(apiKeyScopesSatisfy(['project:create', 'project:update'], requirement)).toBe(true);
			expect(apiKeyScopesSatisfy(['project:create'], requirement)).toBe(false);
		});

		it('never satisfies a requirement when no scopes are granted', () => {
			expect(apiKeyScopesSatisfy(undefined, 'tag:list')).toBe(false);
			expect(apiKeyScopesSatisfy([], { anyOf: ['tag:list'] })).toBe(false);
		});
	});

	describe('scopeRequirementFromString', () => {
		it('returns a plain scope for a single entry', () => {
			expect(scopeRequirementFromString('tag:list')).toBe('tag:list');
		});

		it('reads a comma-joined eov scope string as anyOf', () => {
			expect(scopeRequirementFromString('project:export,workflow:export')).toEqual({
				anyOf: ['project:export', 'workflow:export'],
			});
		});

		it('tolerates surrounding whitespace', () => {
			expect(scopeRequirementFromString('project:export, workflow:export')).toEqual({
				anyOf: ['project:export', 'workflow:export'],
			});
		});

		it('round-trips through scopeRequirementToString', () => {
			const serialized = 'project:export,workflow:export';
			expect(scopeRequirementToString(scopeRequirementFromString(serialized))).toBe(serialized);
		});
	});

	describe('scopesInRequirement', () => {
		it('enumerates every scope regardless of any/all semantics', () => {
			expect(scopesInRequirement('tag:list')).toEqual(['tag:list']);
			expect(scopesInRequirement({ anyOf: ['tag:list', 'tag:read'] })).toEqual([
				'tag:list',
				'tag:read',
			]);
			expect(scopesInRequirement({ allOf: ['tag:list', 'tag:read'] })).toEqual([
				'tag:list',
				'tag:read',
			]);
		});
	});

	describe('resolvePublicApiRoutes', () => {
		it('joins a basePath with the route root path, dropping the trailing slash', () => {
			class WidgetsPublicController {
				@Get('/')
				@ApiResponse(200)
				method() {}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const [route] = resolvePublicApiRoutes();

			expect(route.path).toBe('/widgets');
			expect(route.method).toBe('get');
			expect(route.controllerName).toBe('WidgetsPublicController');
			expect(route.controllerClass).toBe(WidgetsPublicController);
		});

		it('joins a root basePath with a sub-path without doubling the slash', () => {
			class RootPublicController {
				@Get('/widgets')
				@ApiResponse(200)
				method() {}
			}
			markPublicApiController(RootPublicController as Controller, '/');

			const [route] = resolvePublicApiRoutes();

			expect(route.path).toBe('/widgets');
			expect(route.controllerClass).toBe(RootPublicController);
		});

		it('normalizes a param path nested under a basePath', () => {
			class WidgetsPublicController {
				@Get('/:id/history')
				@ApiResponse(200)
				method(@Param('id') _id: string) {}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const [route] = resolvePublicApiRoutes();

			expect(route.path).toBe('/widgets/:id/history');
			expect(route.controllerClass).toBe(WidgetsPublicController);
		});

		it('ignores a controller that is not a @PublicApiController', () => {
			class InternalController {
				@Get('/')
				method() {}
			}
			// Simulates a @RestController sharing the same registry.
			Container.get(ControllerRegistryMetadata).getRouteMetadata(
				InternalController as Controller,
				'method',
			);

			expect(resolvePublicApiRoutes()).toEqual([]);
		});

		it('resolves openapi spec decorator metadata', () => {
			class WidgetsPublicController {
				@Post('/')
				@ApiKeyScope({ anyOf: ['tag:create', 'tag:update'] })
				@ApiSummary('Create a widget')
				@ApiDescription('Create a widget.')
				@ApiTags(['Widgets'])
				@ApiResponse(201, WidgetResponseDto)
				@ApiErrorResponse(409)
				method(@Body _body: WidgetBodyDto, @Query _query: WidgetQueryDto) {}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			const [route] = resolvePublicApiRoutes();

			expect(route.controllerClass).toBe(WidgetsPublicController);
			expect(route.requestBodyDto).toBe(WidgetBodyDto);
			expect(route.requestQueryDto).toBe(WidgetQueryDto);
			expect(route.responseDto).toBe(WidgetResponseDto);
			expect(route.apiKeyScope).toEqual({ anyOf: ['tag:create', 'tag:update'] });
			expect(route.summary).toBe('Create a widget');
			expect(route.tags).toEqual(['Widgets']);
			expect(route.description).toBe('Create a widget.');
			expect(route.errorResponses).toEqual([409]);
			expect(route.successStatus).toBe(201);
		});

		it('throws for a route whose @ApiResponse is missing', () => {
			class WidgetsPublicController {
				@Get('/')
				method() {}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			expect(() => resolvePublicApiRoutes()).toThrow(UnexpectedError);
			expect(() => resolvePublicApiRoutes()).toThrow(
				/WidgetsPublicController\.method does not declare a success status/,
			);
		});

		it('discovers every route across multiple @PublicApiController classes', () => {
			class WidgetsPublicController {
				@Get('/')
				@ApiResponse(200)
				list() {}

				@Get('/:id')
				@ApiResponse(200)
				get(@Param('id') _id: string) {}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			class GadgetsPublicController {
				@Get('/')
				@ApiResponse(200)
				list() {}
			}
			markPublicApiController(GadgetsPublicController as Controller, '/gadgets');

			const routes = resolvePublicApiRoutes();

			expect(routes.map((r) => `${r.method.toUpperCase()} ${r.path}`).sort()).toEqual([
				'GET /gadgets',
				'GET /widgets',
				'GET /widgets/:id',
			]);
			expect(routes.find((r) => r.path === '/widgets')?.controllerClass).toBe(
				WidgetsPublicController,
			);
			expect(routes.find((r) => r.path === '/gadgets')?.controllerClass).toBe(
				GadgetsPublicController,
			);
		});
	});
});
