import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import type { Controller, HandlerName } from '../types';

describe('ControllerRegistryMetadata', () => {
	let registry: ControllerRegistryMetadata;

	const TestController = class TestController {
		async testHandler() {
			return 'test';
		}

		anotherHandler() {}
	} as Controller;

	const AnotherController = class AnotherController {
		async handler() {}
	} as Controller;

	beforeEach(() => {
		registry = new ControllerRegistryMetadata();
	});

	describe('getControllerMetadata', () => {
		it('should create and return default metadata for a new controller', () => {
			const metadata = registry.getControllerMetadata(TestController);

			expect(metadata).toEqual({
				basePath: '/',
				middlewares: [],
				routes: expect.any(Map),
			});
		});

		it('should return existing metadata for a registered controller', () => {
			// Get metadata first time to register
			const initialMetadata = registry.getControllerMetadata(TestController);
			// Update metadata
			initialMetadata.basePath = '/api';
			initialMetadata.middlewares.push('auth');

			// Get metadata second time
			const metadata = registry.getControllerMetadata(TestController);

			expect(metadata).toBe(initialMetadata);
			expect(metadata.basePath).toBe('/api');
			expect(metadata.middlewares).toEqual(['auth']);
		});
	});

	describe('getRouteMetadata', () => {
		it('should create and return default route metadata for a new handler', () => {
			const handlerName: HandlerName = 'testHandler';
			const routeMetadata = registry.getRouteMetadata(TestController, handlerName);

			expect(routeMetadata).toEqual({
				args: [],
			});
		});

		it('should return existing route metadata for a registered handler', () => {
			const handlerName: HandlerName = 'testHandler';

			const initialRouteMetadata = registry.getRouteMetadata(TestController, handlerName);

			initialRouteMetadata.method = 'get';
			initialRouteMetadata.path = '/test';
			initialRouteMetadata.args.push({ type: 'query' });

			const routeMetadata = registry.getRouteMetadata(TestController, handlerName);

			expect(routeMetadata).toBe(initialRouteMetadata);
			expect(routeMetadata.method).toBe('get');
			expect(routeMetadata.path).toBe('/test');
			expect(routeMetadata.args).toEqual([{ type: 'query' }]);
		});
	});

	describe('controllerClasses', () => {
		it('should return an iterator of registered controller classes', () => {
			registry.getControllerMetadata(TestController);
			registry.getControllerMetadata(AnotherController);

			const iteratorClasses = registry.controllerClasses;
			const controllers = Array.from(iteratorClasses);

			expect(controllers).toHaveLength(2);
			expect(controllers).toContain(TestController);
			expect(controllers).toContain(AnotherController);
		});

		it('should return an empty iterator when no controllers are registered', () => {
			const iteratorClasses = registry.controllerClasses;
			const controllers = Array.from(iteratorClasses);

			expect(controllers).toHaveLength(0);
		});
	});

	it('should handle complete controller and routes registration correctly', () => {
		const controllerMetadata = registry.getControllerMetadata(TestController);
		controllerMetadata.basePath = '/test-api';
		controllerMetadata.middlewares = ['global'];

		const route1 = registry.getRouteMetadata(TestController, 'testHandler');
		route1.method = 'get';
		route1.path = '/items';
		route1.args = [{ type: 'query' }];
		route1.middlewares = [() => {}];
		route1.skipAuth = true;

		const route2 = registry.getRouteMetadata(TestController, 'anotherHandler');
		route2.method = 'post';
		route2.path = '/items/:id';
		route2.args = [{ type: 'param', key: 'id' }, { type: 'body' }];

		const retrievedMetadata = registry.getControllerMetadata(TestController);
		expect(retrievedMetadata.basePath).toBe('/test-api');
		expect(retrievedMetadata.middlewares).toEqual(['global']);

		expect(retrievedMetadata.routes.size).toBe(2);

		const retrievedRoute1 = retrievedMetadata.routes.get('testHandler');
		expect(retrievedRoute1?.method).toBe('get');
		expect(retrievedRoute1?.path).toBe('/items');
		expect(retrievedRoute1?.args).toEqual([{ type: 'query' }]);
		expect(retrievedRoute1?.skipAuth).toBe(true);
		expect(retrievedRoute1?.middlewares).toHaveLength(1);

		const retrievedRoute2 = retrievedMetadata.routes.get('anotherHandler');
		expect(retrievedRoute2?.method).toBe('post');
		expect(retrievedRoute2?.path).toBe('/items/:id');
		expect(retrievedRoute2?.args).toEqual([{ type: 'param', key: 'id' }, { type: 'body' }]);
	});
});
