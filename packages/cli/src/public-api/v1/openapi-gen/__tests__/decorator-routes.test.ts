import { Z } from '@n8n/api-types';
import {
	ApiErrorResponse,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	ControllerRegistryMetadata,
	Delete,
	Get,
	Param,
	Post,
	Query,
} from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import { getDecoratorGeneratedOperations } from '../decorator-routes';

class WidgetBodyDto extends Z.class({ name: z.string() }) {}
class WidgetQueryDto extends Z.class({ q: z.string().optional() }) {}
class WidgetDto extends Z.class({ id: z.string() }) {}

/**
 * Marks `controllerClass` as a public API controller the same way `@PublicApiController` does,
 * without using the literal decorator.
 */
function markPublicApiController(controllerClass: Controller, basePath: `/${string}`) {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(controllerClass);
	metadata.basePath = basePath;
	metadata.isPublicApi = true;
}

describe('getDecoratorGeneratedOperations', () => {
	beforeEach(() => {
		Container.set(ControllerRegistryMetadata, new ControllerRegistryMetadata());
	});

	it('includes the summary when @ApiSummary is present', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiSummary('List widgets')
			@ApiTags(['Widgets'])
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.summary).toBe('List widgets');
	});

	it('omits summary when @ApiSummary is absent', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiTags(['Widgets'])
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.summary).toBeUndefined();
	});

	it('uses the tags declared via @ApiTags', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiTags(['Widgets', 'Beta'])
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.tags).toEqual(['Widgets', 'Beta']);
	});

	it('omits tags when @ApiTags is absent, rather than guessing a tag from the URL', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.tags).toBeUndefined();
	});

	it('$refs the matching shared response file for a declared @ApiErrorResponse', () => {
		class WidgetsPublicController {
			@Get('/:id')
			@ApiResponse(200)
			@ApiTags(['Widgets'])
			@ApiErrorResponse(404)
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.responses[404]).toEqual({
			$ref: '../../../../shared/spec/responses/notFound.yml',
		});
	});

	it('$refs a shared response file for each stacked @ApiErrorResponse', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiTags(['Widgets'])
			@ApiErrorResponse(404)
			@ApiErrorResponse(409)
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.responses[404]).toEqual({
			$ref: '../../../../shared/spec/responses/notFound.yml',
		});
		expect(operation.config.responses[409]).toEqual({
			$ref: '../../../../shared/spec/responses/conflict.yml',
		});
	});

	it('throws for an @ApiErrorResponse status with no shared response file mapped', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiTags(['Widgets'])
			@ApiErrorResponse(418)
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		expect(() => getDecoratorGeneratedOperations()).toThrow(UnexpectedError);
		expect(() => getDecoratorGeneratedOperations()).toThrow(/ApiErrorResponse\(418\)/);
	});

	it('documents the success response under the status @ApiResponse declares, with its DTO schema', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiTags(['Widgets'])
			@ApiResponse(200, WidgetDto)
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.responses[200]).toEqual({
			description: 'Operation successful.',
			content: { 'application/json': { schema: WidgetDto.schema } },
		});
		expect(operation.config.responses[201]).toBeUndefined();
	});

	it('throws for a route that declares no success status at all', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiTags(['Widgets'])
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		expect(() => getDecoratorGeneratedOperations()).toThrow(UnexpectedError);
		expect(() => getDecoratorGeneratedOperations()).toThrow(/does not declare a success status/);
	});

	it('documents a non-200 success status under that status, leaving 200 absent', () => {
		class WidgetsPublicController {
			@Post('/')
			@ApiTags(['Widgets'])
			@ApiResponse(201, WidgetDto)
			method(@Body _body: WidgetBodyDto) {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.responses[200]).toBeUndefined();
		expect(operation.config.responses[201]).toEqual({
			description: 'Operation successful.',
			content: { 'application/json': { schema: WidgetDto.schema } },
		});
	});

	it('documents a bare @ApiResponse status with no response content', () => {
		class WidgetsPublicController {
			@Delete('/:id')
			@ApiTags(['Widgets'])
			@ApiResponse(204)
			method(@Param('id') _id: string) {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.responses[204]).toEqual({ description: 'Operation successful.' });
		expect(operation.config.responses[200]).toBeUndefined();
	});

	it('includes the request body when @Body is present', () => {
		class WidgetsPublicController {
			@Post('/')
			@ApiResponse(201)
			@ApiTags(['Widgets'])
			method(@Body _body: WidgetBodyDto) {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.request?.body).toEqual({
			content: {
				'application/json': {
					schema: WidgetBodyDto.schema,
				},
			},
		});
	});

	it('omits the request body when @Body is absent', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiTags(['Widgets'])
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.request).toBeUndefined();
	});

	it('includes both the request body and query when a route declares both', () => {
		class WidgetsPublicController {
			@Post('/')
			@ApiResponse(201)
			@ApiTags(['Widgets'])
			method(@Body _body: WidgetBodyDto, @Query _query: WidgetQueryDto) {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.request?.body).toEqual({
			content: {
				'application/json': {
					schema: WidgetBodyDto.schema,
				},
			},
		});
		// A prior version of this merge overwrote one with the other - assert both survive.
		expect(operation.config.request?.query).toBeDefined();
	});

	it('routes each @Param through request.params, named to match the route path segment', () => {
		class WidgetsPublicController {
			@Get('/:id')
			@ApiResponse(200)
			@ApiTags(['Widgets'])
			method(@Param('id') _id: string) {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.pathKey).toBe('/widgets/{id}');
		// zod-to-openapi turns request.params into `in: path` parameters; the key must match `{id}`.
		const params = operation.config.request?.params as z.AnyZodObject | undefined;
		expect(params?.shape).toHaveProperty('id');
	});
});
