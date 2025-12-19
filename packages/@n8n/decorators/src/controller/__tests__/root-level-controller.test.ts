import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { RootLevelController } from '../root-level-controller';
import type { Controller } from '../types';

describe('@RootLevelController Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		jest.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should default to root path and register on root', () => {
		@RootLevelController()
		class TestController {}

		const metadata = controllerRegistryMetadata.getControllerMetadata(TestController as Controller);
		expect(metadata.basePath).toBe('/');
		expect(metadata.registerOnRootPath).toBe(true);
		expect(Container.has(TestController)).toBe(true);
	});

	it('should accept custom base path', () => {
		@RootLevelController('/foo')
		class FooController {}

		const metadata = controllerRegistryMetadata.getControllerMetadata(FooController as Controller);
		expect(metadata.basePath).toBe('/foo');
		expect(metadata.registerOnRootPath).toBe(true);
		expect(Container.has(FooController)).toBe(true);
	});

	it('should register multiple controllers with their metadata', () => {
		@RootLevelController('/users')
		class UsersController {}

		@RootLevelController('/projects')
		class ProjectsController {}

		const controllers = Array.from(controllerRegistryMetadata.controllerClasses);
		expect(controllers).toEqual([UsersController, ProjectsController]);
		expect(
			controllerRegistryMetadata.getControllerMetadata(UsersController as Controller)
				.registerOnRootPath,
		).toBe(true);
		expect(
			controllerRegistryMetadata.getControllerMetadata(ProjectsController as Controller).basePath,
		).toBe('/projects');
	});
});
