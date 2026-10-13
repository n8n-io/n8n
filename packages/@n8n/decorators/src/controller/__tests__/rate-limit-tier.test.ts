import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { RateLimitTier } from '../rate-limit-tier';
import { Post } from '../route';
import type { Controller } from '../types';

describe('@RateLimitTier Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should set rateLimitTier on route metadata', () => {
		class TestController {
			@Post('/test')
			@RateLimitTier('read')
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.rateLimitTier).toBe('read');
		expect(routeMetadata.method).toBe('post');
	});

	it('should leave rateLimitTier undefined on a route without the decorator', () => {
		class TestController {
			@Post('/test')
			testMethod() {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.rateLimitTier).toBeUndefined();
	});
});
