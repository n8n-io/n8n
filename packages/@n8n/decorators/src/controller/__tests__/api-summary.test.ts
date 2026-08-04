import { Container } from '@n8n/di';

import { ApiSummary } from '../api-summary';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Get } from '../route';
import type { Controller } from '../types';

describe('@ApiSummary Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should store the summary on the route', () => {
		class TestController {
			@Get('/')
			@ApiSummary('Retrieve all widgets')
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.summary).toBe('Retrieve all widgets');
	});
});
