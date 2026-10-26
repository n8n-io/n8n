import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Deprecated } from '../deprecated';
import { Get } from '../route';
import type { Controller } from '../types';

describe('@Deprecated Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should set deprecation info on route metadata', () => {
		const since = new Date('2026-07-23T00:00:00Z');

		class TestController {
			@Deprecated({ since })
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.deprecated).toEqual({ since });
	});

	it('should work with different deprecation dates per method', () => {
		const activateSince = new Date('2026-07-23T00:00:00Z');
		const deactivateSince = new Date('2026-08-01T00:00:00Z');

		class TestController {
			@Deprecated({ since: activateSince })
			activateMethod() {}

			@Deprecated({ since: deactivateSince })
			deactivateMethod() {}
		}

		const activateMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'activateMethod',
		);
		expect(activateMetadata.deprecated).toEqual({ since: activateSince });

		const deactivateMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'deactivateMethod',
		);
		expect(deactivateMetadata.deprecated).toEqual({ since: deactivateSince });
	});

	it('should work alongside other decorators regardless of order', () => {
		const since = new Date('2026-07-23T00:00:00Z');

		class TestController {
			@Get('/test')
			@Deprecated({ since })
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.deprecated).toEqual({ since });
		expect(routeMetadata.method).toBe('get');
		expect(routeMetadata.path).toBe('/test');
	});
});
