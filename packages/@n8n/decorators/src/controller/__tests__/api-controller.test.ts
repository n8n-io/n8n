import { Container } from '@n8n/di';

import { ApiController } from '../api-controller';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import type { Controller } from '../types';

describe('@ApiController Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should default base path to "/" when not provided', () => {
		@ApiController()
		class TestController {}

		const metadata = controllerRegistryMetadata.getControllerMetadata(TestController as Controller);
		expect(metadata.basePath).toBe('/');
		expect(metadata.endpointGroup).toBe('api');
		expect(Container.has(TestController)).toBe(true);
	});

	it('should set custom base path and endpoint group when provided', () => {
		@ApiController('/integration')
		class TestApiController {}

		const metadata = controllerRegistryMetadata.getControllerMetadata(
			TestApiController as Controller,
		);

		expect(metadata.basePath).toBe('/integration');
		expect(metadata.endpointGroup).toBe('api');
		expect(Container.has(TestApiController)).toBe(true);
	});

	it('should register the controller in the registry', () => {
		@ApiController('/alpha')
		class AlphaController {}

		@ApiController('/beta')
		class BetaController {}

		const controllers = Array.from(controllerRegistryMetadata.controllerClasses);
		expect(controllers).toEqual([AlphaController, BetaController]);
		expect(Container.has(AlphaController)).toBe(true);
		expect(Container.has(BetaController)).toBe(true);
		expect(
			controllerRegistryMetadata.getControllerMetadata(AlphaController as Controller).basePath,
		).toBe('/alpha');
		expect(
			controllerRegistryMetadata.getControllerMetadata(BetaController as Controller).basePath,
		).toBe('/beta');
	});
});
