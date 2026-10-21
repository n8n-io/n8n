import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { RateLimitAccess } from '../rate-limit-access';
import { Post } from '../route';
import type { Controller } from '../types';

describe('@RateLimitAccess Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should set rateLimitAccess on route metadata', () => {
		class TestController {
			@Post('/test')
			@RateLimitAccess('read')
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.rateLimitAccess).toBe('read');
		expect(routeMetadata.method).toBe('post');
	});

	it('should leave rateLimitAccess undefined on a route without the decorator', () => {
		class TestController {
			@Post('/test')
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.rateLimitAccess).toBeUndefined();
	});
});
