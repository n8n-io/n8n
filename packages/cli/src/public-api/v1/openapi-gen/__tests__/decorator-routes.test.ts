import { Z } from '@n8n/api-types';
import {
	ApiErrorResponse,
	ApiSummary,
	ApiTags,
	Body,
	ControllerRegistryMetadata,
	Get,
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

/**
 * Marks `controllerClass` as a public API controller the same way `@PublicApiController` does,
 * without using the literal decorator - `public-api-controllers.test.ts` asserts every
 * `@PublicApiController` usage lives under `controllers/*.public.controller.ts`, which this
 * inline test fixture deliberately doesn't.
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
			@ApiTags(['Widgets', 'Beta'])
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.tags).toEqual(['Widgets', 'Beta']);
	});

	it('throws when @ApiTags is absent, rather than guessing a tag from the URL', () => {
		class WidgetsPublicController {
			@Get('/')
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		expect(() => getDecoratorGeneratedOperations()).toThrow(UnexpectedError);
		expect(() => getDecoratorGeneratedOperations()).toThrow(
			/WidgetsPublicController\.method has no @ApiTags declared/,
		);
	});

	it('$refs the matching shared response file for a declared @ApiErrorResponse', () => {
		class WidgetsPublicController {
			@Get('/:id')
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
			@ApiTags(['Widgets'])
			@ApiErrorResponse(418)
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		expect(() => getDecoratorGeneratedOperations()).toThrow(UnexpectedError);
		expect(() => getDecoratorGeneratedOperations()).toThrow(/ApiErrorResponse\(418\)/);
	});

	it('includes the request body when @Body is present', () => {
		class WidgetsPublicController {
			@Post('/')
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
});
