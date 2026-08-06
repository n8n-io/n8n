import { Container } from '@n8n/di';

import { ApiDescription } from '../api-description';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Get } from '../route';
import type { Controller } from '../types';

describe('@ApiDescription Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should store the description on the route', () => {
		class TestController {
			@Get('/')
			@ApiDescription('Retrieve all widgets from your instance.')
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.description).toBe('Retrieve all widgets from your instance.');
	});
});
