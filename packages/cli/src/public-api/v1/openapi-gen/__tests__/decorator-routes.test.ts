import {
	ApiErrorResponse,
	ApiSummary,
	ApiTags,
	ControllerRegistryMetadata,
	Get,
} from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { getDecoratorGeneratedOperations } from '../decorator-routes';

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
});
