import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { PublicApiController } from '../public-api-controller';
import type { Controller } from '../types';

describe('@PublicApiController Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should set base path and mark as public API', () => {
		@PublicApiController('/tags')
		class TagsPublicController {}

		const metadata = controllerRegistryMetadata.getControllerMetadata(
			TagsPublicController as Controller,
		);
		expect(metadata.basePath).toBe('/tags');
		expect(metadata.isPublicApi).toBe(true);
		expect(metadata.registerOnRootPath).toBe(false);
		expect(Container.has(TagsPublicController)).toBe(true);
	});

	it('should default base path to /', () => {
		@PublicApiController()
		class DefaultPublicController {}

		const metadata = controllerRegistryMetadata.getControllerMetadata(
			DefaultPublicController as Controller,
		);
		expect(metadata.basePath).toBe('/');
		expect(metadata.isPublicApi).toBe(true);
	});
});
