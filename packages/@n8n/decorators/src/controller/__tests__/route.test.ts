import { Container } from '@n8n/di';

import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Get, Post, Put, Patch, Delete } from '../route';
import type { Controller } from '../types';

describe('Route Decorators', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	describe.each([
		{ decorator: Get, method: 'Get' },
		{ decorator: Post, method: 'Post' },
		{ decorator: Put, method: 'Put' },
		{ decorator: Patch, method: 'Patch' },
		{ decorator: Delete, method: 'Delete' },
	])('@$method decorator', ({ decorator, method }) => {
		it('should set correct metadata with default options', () => {
			class TestController {
				@decorator('/test')
				testMethod() {}
			}

			const handlerName = 'testMethod';
			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				handlerName,
			);

			expect(routeMetadata.method).toBe(method.toLowerCase());
			expect(routeMetadata.path).toBe('/test');
			expect(routeMetadata.middlewares).toEqual([]);
			expect(routeMetadata.usesTemplates).toBe(false);
			expect(routeMetadata.skipAuth).toBe(false);
			expect(routeMetadata.rateLimit).toBeUndefined();
		});

		it('should accept and apply route options', () => {
			const middleware = () => {};

			class TestController {
				@decorator('/test', {
					middlewares: [middleware],
					usesTemplates: true,
					skipAuth: true,
					rateLimit: { limit: 10, windowMs: 60000 },
				})
				testMethod() {}
			}

			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'testMethod',
			);

			expect(routeMetadata.middlewares).toEqual([middleware]);
			expect(routeMetadata.usesTemplates).toBe(true);
			expect(routeMetadata.skipAuth).toBe(true);
			expect(routeMetadata.rateLimit).toEqual({ limit: 10, windowMs: 60000 });
		});

		it('should work with boolean rateLimit option', () => {
			class TestController {
				@decorator('/test', { rateLimit: true })
				testMethod() {}
			}

			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'testMethod',
			);

			expect(routeMetadata.rateLimit).toBe(true);
		});

		it('should work with multiple routes on the same controller', () => {
			class TestController {
				@decorator('/first')
				firstMethod() {}

				@decorator('/second', { skipAuth: true })
				secondMethod() {}
			}

			const firstRouteMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'firstMethod',
			);

			const secondRouteMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'secondMethod',
			);

			expect(firstRouteMetadata.method).toBe(method.toLowerCase());
			expect(firstRouteMetadata.path).toBe('/first');
			expect(firstRouteMetadata.skipAuth).toBe(false);

			expect(secondRouteMetadata.method).toBe(method.toLowerCase());
			expect(secondRouteMetadata.path).toBe('/second');
			expect(secondRouteMetadata.skipAuth).toBe(true);
		});
	});

	it('should allow different HTTP methods on the same controller', () => {
		class TestController {
			@Get('/users')
			getUsers() {}

			@Post('/users')
			createUser() {}

			@Put('/users/:id')
			updateUser() {}

			@Delete('/users/:id')
			deleteUser() {}
		}

		const getMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'getUsers',
		);

		const postMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'createUser',
		);

		const putMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'updateUser',
		);

		const deleteMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'deleteUser',
		);

		expect(getMetadata.method).toBe('get');
		expect(getMetadata.path).toBe('/users');

		expect(postMetadata.method).toBe('post');
		expect(postMetadata.path).toBe('/users');

		expect(putMetadata.method).toBe('put');
		expect(putMetadata.path).toBe('/users/:id');

		expect(deleteMetadata.method).toBe('delete');
		expect(deleteMetadata.path).toBe('/users/:id');
	});
});
