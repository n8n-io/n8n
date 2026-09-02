import { Container } from '@n8n/di';

import { ApiTags } from '../api-tags';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Get } from '../route';
import type { Controller } from '../types';

describe('@ApiTags Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should store the tags on the route', () => {
		class TestController {
			@Get('/')
			@ApiTags(['Widget'])
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.tags).toEqual(['Widget']);
	});

	it('should store multiple tags on the route in alphabetical order', () => {
		class TestController {
			@Get('/')
			@ApiTags(['Widget', 'Gadget'])
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.tags).toEqual(['Gadget', 'Widget']);
	});
});
