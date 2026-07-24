import { Container } from '@n8n/di';

import { ApiKeyScope } from '../api-key-scope';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Get } from '../route';
import type { Controller } from '../types';

describe('@ApiKeyScope Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should store a single scope string', () => {
		class TestController {
			@Get('/')
			@ApiKeyScope('tag:list')
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.apiKeyScope).toBe('tag:list');
	});

	it('should store anyOf and allOf requirements', () => {
		class TestController {
			@Get('/any')
			@ApiKeyScope({ anyOf: ['tag:list', 'tag:read'] })
			async anyOfHandler() {}

			@Get('/all')
			@ApiKeyScope({ allOf: ['tag:list', 'tag:create'] })
			async allOfHandler() {}
		}

		expect(
			controllerRegistryMetadata.getRouteMetadata(TestController as Controller, 'anyOfHandler')
				.apiKeyScope,
		).toEqual({ anyOf: ['tag:list', 'tag:read'] });
		expect(
			controllerRegistryMetadata.getRouteMetadata(TestController as Controller, 'allOfHandler')
				.apiKeyScope,
		).toEqual({ allOf: ['tag:list', 'tag:create'] });
	});

	it('should reject objects that declare both anyOf and allOf', () => {
		const ambiguous = {
			anyOf: ['tag:list' as const],
			allOf: ['tag:create' as const],
		};

		expect(() => {
			class TestController {
				@Get('/')
				@ApiKeyScope(ambiguous as never)
				async handler() {}
			}
			void TestController;
		}).toThrow(/both anyOf and allOf/);
	});
});
