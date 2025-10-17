import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { RestController } from '../rest-controller';
import type { Controller } from '../types';

describe('@RestController Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		jest.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should set default base path when no path provided', () => {
		@RestController()
		class TestController {}

		const metadata = controllerRegistryMetadata.getControllerMetadata(TestController as Controller);
		expect(metadata.basePath).toBe('/');
		expect(metadata.registerOnRootPath).toBe(false);
		expect(Container.has(TestController)).toBe(true);
	});

	it('should set custom base path when provided', () => {
		@RestController('/test')
		class TestController {}

		const metadata = controllerRegistryMetadata.getControllerMetadata(TestController as Controller);
		expect(metadata.basePath).toBe('/test');
		expect(metadata.registerOnRootPath).toBe(false);
		expect(Container.has(TestController)).toBe(true);
	});

	it('should register the controller in the registry', () => {
		@RestController('/users')
		class UsersController {}

		@RestController('/projects')
		class ProjectsController {}

		const controllers = Array.from(controllerRegistryMetadata.controllerClasses);
		expect(controllers).toEqual([UsersController, ProjectsController]);
		expect(Container.has(UsersController)).toBe(true);
		expect(Container.has(ProjectsController)).toBe(true);
		expect(
			controllerRegistryMetadata.getControllerMetadata(UsersController as Controller).basePath,
		).toBe('/users');
		expect(
			controllerRegistryMetadata.getControllerMetadata(ProjectsController as Controller).basePath,
		).toBe('/projects');
	});
});
