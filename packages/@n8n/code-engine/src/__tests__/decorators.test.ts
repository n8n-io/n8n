import 'reflect-metadata';
import { Controller, POST, GET, Callable } from '../decorators';
import { getControllerMetadata, getHttpMethods, getCallables, getClassMetadata } from '../metadata';

describe('Decorators', () => {
	describe('@Controller', () => {
		it('should store base path metadata on the class', () => {
			@Controller('/api')
			class TestClass {}

			const metadata = getControllerMetadata(TestClass);
			expect(metadata).toEqual({ basePath: '/api' });
		});
	});

	describe('@POST', () => {
		it('should store HTTP method metadata on the class', () => {
			@Controller('/api')
			class TestClass {
				@POST('/orders')
				handleOrder() {}
			}

			const methods = getHttpMethods(TestClass);
			expect(methods).toEqual([{ method: 'POST', path: '/orders', propertyKey: 'handleOrder' }]);
		});
	});

	describe('@GET', () => {
		it('should store GET method metadata', () => {
			@Controller('/api')
			class TestClass {
				@GET('/items')
				getItems() {}
			}

			const methods = getHttpMethods(TestClass);
			expect(methods).toEqual([{ method: 'GET', path: '/items', propertyKey: 'getItems' }]);
		});
	});

	describe('@Callable', () => {
		it('should store callable metadata on the class', () => {
			@Controller('/api')
			class TestClass {
				@Callable('Process order')
				processOrder() {}
			}

			const callables = getCallables(TestClass);
			expect(callables).toEqual([{ description: 'Process order', propertyKey: 'processOrder' }]);
		});
	});

	describe('multiple decorators', () => {
		it('should store all decorator metadata correctly', () => {
			@Controller('/api')
			class TestClass {
				@POST('/orders')
				handleOrder() {}

				@Callable('Route by type')
				route() {}

				@Callable('Process order')
				processOrder() {}
			}

			const methods = getHttpMethods(TestClass);
			expect(methods).toHaveLength(1);
			expect(methods[0]).toEqual({
				method: 'POST',
				path: '/orders',
				propertyKey: 'handleOrder',
			});

			const callables = getCallables(TestClass);
			expect(callables).toHaveLength(2);
			expect(callables).toEqual(
				expect.arrayContaining([
					{ description: 'Route by type', propertyKey: 'route' },
					{ description: 'Process order', propertyKey: 'processOrder' },
				]),
			);
		});
	});

	describe('getClassMetadata', () => {
		it('should return combined metadata for decorated class', () => {
			@Controller('/api')
			class TestClass {
				@POST('/orders')
				handleOrder() {}

				@Callable('Process order')
				processOrder() {}
			}

			const metadata = getClassMetadata(TestClass);
			expect(metadata.controller).toEqual({ basePath: '/api' });
			expect(metadata.httpMethods).toHaveLength(1);
			expect(metadata.callables).toHaveLength(1);
		});

		it('should throw if class is not decorated with @Controller', () => {
			class PlainClass {}

			expect(() => getClassMetadata(PlainClass)).toThrow('Class is not decorated with @Controller');
		});
	});
});
