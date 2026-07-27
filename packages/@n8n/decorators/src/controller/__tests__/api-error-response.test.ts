import { Container } from '@n8n/di';

import { ApiErrorResponse } from '../api-error-response';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Get } from '../route';
import type { Controller } from '../types';

describe('@ApiErrorResponse Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should store a single status code on the route', () => {
		class TestController {
			@Get('/:id')
			@ApiErrorResponse(404)
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.errorResponses).toEqual([404]);
	});

	it('should accumulate multiple stacked status codes on the route', () => {
		class TestController {
			@Get('/')
			@ApiErrorResponse(404)
			@ApiErrorResponse(409)
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.errorResponses).toEqual([409, 404]);
	});
});
