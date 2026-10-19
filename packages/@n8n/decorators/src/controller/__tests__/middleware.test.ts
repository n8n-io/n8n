import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Middleware } from '../middleware';
import type { Controller } from '../types';

describe('@Middleware Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('registers a middleware that runs after authentication by default', () => {
		class TestController {
			@Middleware()
			afterAuth() {}
		}

		const metadata = controllerRegistryMetadata.getControllerMetadata(TestController as Controller);

		expect(metadata.middlewares).toEqual(['afterAuth']);
		expect(metadata.preAuthMiddlewares).toEqual([]);
	});

	it('registers a middleware that runs before authentication with beforeAuth', () => {
		class TestController {
			@Middleware({ beforeAuth: true })
			gate() {}

			@Middleware()
			afterAuth() {}
		}

		const metadata = controllerRegistryMetadata.getControllerMetadata(TestController as Controller);

		expect(metadata.preAuthMiddlewares).toEqual(['gate']);
		expect(metadata.middlewares).toEqual(['afterAuth']);
	});
});
