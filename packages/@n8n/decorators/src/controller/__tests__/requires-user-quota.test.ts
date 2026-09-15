import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { RequiresUserQuota } from '../requires-user-quota';
import type { Controller } from '../types';

describe('@RequiresUserQuota Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should set requiresUserQuota on route metadata', () => {
		class TestController {
			@RequiresUserQuota()
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.requiresUserQuota).toBe(true);
	});

	it('should leave requiresUserQuota undefined on a route without the decorator', () => {
		class TestController {
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.requiresUserQuota).toBeUndefined();
	});

	it('should work alongside other decorators', () => {
		const Get = (path: string) => {
			return (target: object, handlerName: string | symbol) => {
				const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
					target.constructor as Controller,
					String(handlerName),
				);
				routeMetadata.method = 'get';
				routeMetadata.path = path;
			};
		};

		class TestController {
			@Get('/test')
			@RequiresUserQuota()
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.requiresUserQuota).toBe(true);
		expect(routeMetadata.method).toBe('get');
		expect(routeMetadata.path).toBe('/test');
	});
});
