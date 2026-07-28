import { Z } from '@n8n/api-types';
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
import { z } from 'zod';

import {
	resolvePublicApiRoutes,
	resolveRouteArgs,
	scopeRequirementToString,
} from '../public-api-route-resolver';

class WidgetBodyDto extends Z.class({ id: z.string() }) {}
class WidgetQueryDto extends Z.class({ q: z.string().optional() }) {}
class WidgetResponseDto extends Z.class({ id: z.string() }) {}

/**
 * Marks `controllerClass` as a public API controller the same way `@PublicApiController` does,
 * without using the literal decorator - `public-api-controllers.test.ts` asserts every
 * `@PublicApiController` usage lives under `controllers/*.public.controller.ts`, which these
 * inline test fixtures deliberately don't.
 */
function markPublicApiController(controllerClass: Controller, basePath: `/${string}`) {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(controllerClass);
	metadata.basePath = basePath;
	metadata.isPublicApi = true;
}

describe('public-api-route-resolver', () => {
	beforeEach(() => {
		Container.set(ControllerRegistryMetadata, new ControllerRegistryMetadata());
	});

	describe('resolveRouteArgs', () => {
		it('passes a param arg through unchanged', () => {
			class TestController {
				method(@Param('id') _id: string) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			const resolved = resolveRouteArgs(TestController as Controller, 'method', args);

			expect(resolved).toEqual([{ type: 'param', key: 'id' }]);
		});

		it('resolves a body arg to its Zod DTO via design:paramtypes reflection', () => {
			class TestController {
				method(@Body _body: WidgetBodyDto) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			const resolved = resolveRouteArgs(TestController as Controller, 'method', args);

			expect(resolved).toEqual([{ type: 'body', dto: WidgetBodyDto }]);
		});

		it('resolves a query arg to its Zod DTO via design:paramtypes reflection', () => {
			class TestController {
				method(@Query _query: WidgetQueryDto) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			const resolved = resolveRouteArgs(TestController as Controller, 'method', args);

			expect(resolved).toEqual([{ type: 'query', dto: WidgetQueryDto }]);
		});

		it('resolves param/body/query args together, preserving parameter order', () => {
			class TestController {
				method(
					@Param('id') _id: string,
					@Body _body: WidgetBodyDto,
					@Query _query: WidgetQueryDto,
				) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			const resolved = resolveRouteArgs(TestController as Controller, 'method', args);

			expect(resolved).toEqual([
				{ type: 'param', key: 'id' },
				{ type: 'body', dto: WidgetBodyDto },
				{ type: 'query', dto: WidgetQueryDto },
			]);
		});

		it('skips undecorated leading parameters (e.g. req, res) before the first decorated one', () => {
			class TestController {
				method(_req: unknown, _res: unknown, @Query _query: WidgetQueryDto) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			const resolved = resolveRouteArgs(TestController as Controller, 'method', args);

			expect(resolved).toEqual([{ type: 'query', dto: WidgetQueryDto }]);
		});

		it('throws when an undecorated parameter follows an already-decorated one', () => {
			// PublicApiControllerRegistry invokes the handler with a compacted, gap-free argument
			// list - an undecorated parameter here would silently receive the next decorated arg's
			// value instead of its own, so this must fail loudly rather than skip the gap.
			class TestController {
				method(@Param('id') _id: string, _undecorated: number, @Body _body: WidgetBodyDto) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			expect(() => resolveRouteArgs(TestController as Controller, 'method', args)).toThrow(
				UnexpectedError,
			);
			expect(() => resolveRouteArgs(TestController as Controller, 'method', args)).toThrow(
				'Public API route TestController.method has an undecorated parameter at index 1',
			);
		});

		it('throws when an undecorated parameter trails after the last decorated one', () => {
			// Unlike a mid-sequence gap, a trailing undecorated parameter never gets a `route.args`
			// index assigned at all - it's not a hole in the sparse array, it's past its end. Only
			// `design:paramtypes` (which has one entry per actual declared parameter) can reveal it.
			class TestController {
				method(@Query _query: WidgetQueryDto, _extra: number) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			expect(() => resolveRouteArgs(TestController as Controller, 'method', args)).toThrow(
				UnexpectedError,
			);
			expect(() => resolveRouteArgs(TestController as Controller, 'method', args)).toThrow(
				'Public API route TestController.method has an undecorated parameter at index 1',
			);
		});

		it('throws when a @Body arg has no resolvable Zod DTO', () => {
			class TestController {
				// Typed as a plain builtin, not a Zod DTO - simulates a developer forgetting one.
				method(@Body _body: object) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			expect(() => resolveRouteArgs(TestController as Controller, 'method', args)).toThrow(
				UnexpectedError,
			);
			expect(() => resolveRouteArgs(TestController as Controller, 'method', args)).toThrow(
				'Public API route TestController.method is missing a Zod DTO for @body',
			);
		});

		it('throws when a @Query arg has no resolvable Zod DTO', () => {
			class TestController {
				method(@Query _query: string) {}
			}
			const { args } = Container.get(ControllerRegistryMetadata).getRouteMetadata(
				TestController as Controller,
				'method',
			);

			expect(() => resolveRouteArgs(TestController as Controller, 'method', args)).toThrow(
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

	describe('resolvePublicApiRoutes', () => {
		it('joins a basePath with the route root path, dropping the trailing slash', () => {
			class WidgetsPublicController {
				@Get('/')
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
			// Registers route metadata without ever marking isPublicApi - simulates an internal
			// @RestController sharing the same registry.
			Container.get(ControllerRegistryMetadata).getRouteMetadata(
				InternalController as Controller,
				'method',
			);

			expect(resolvePublicApiRoutes()).toEqual([]);
		});

		it('resolves request/response DTOs, scope, summary, description, tags, and error responses from decorator metadata', () => {
			class WidgetsPublicController {
				@Post('/')
				@ApiKeyScope({ anyOf: ['tag:create', 'tag:update'] })
				@ApiSummary('Create a widget')
				@ApiDescription('Create a widget.')
				@ApiTags(['Widgets'])
				@ApiResponse(WidgetResponseDto)
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
		});

		it('discovers every route across multiple @PublicApiController classes', () => {
			class WidgetsPublicController {
				@Get('/')
				list() {}

				@Get('/:id')
				get(@Param('id') _id: string) {}
			}
			markPublicApiController(WidgetsPublicController as Controller, '/widgets');

			class GadgetsPublicController {
				@Get('/')
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
