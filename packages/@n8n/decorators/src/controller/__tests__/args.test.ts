import { Container } from '@n8n/di';

import { Body, Query, Param } from '../args';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import type { Controller } from '../types';

describe('Args Decorators', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	describe.each([
		{ decorator: Body, type: 'Body', expectedArg: { type: 'body' } },
		{ decorator: Query, type: 'Query', expectedArg: { type: 'query' } },
	])('@$type decorator', ({ decorator, type, expectedArg }) => {
		it(`should set ${type} arg at correct parameter index`, () => {
			class TestController {
				testMethod(@decorator _parameter: unknown) {}
			}

			const parameterIndex = 0;
			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'testMethod',
			);

			expect(routeMetadata.args[parameterIndex]).toEqual(expectedArg);
		});

		it(`should handle multiple parameters with ${type}`, () => {
			class TestController {
				testMethod(_first: string, @decorator _second: unknown, _third: number) {}
			}

			const parameterIndex = 1;
			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'testMethod',
			);

			expect(routeMetadata.args[parameterIndex]).toEqual(expectedArg);
		});
	});

	describe('@Param decorator', () => {
		it('should set param arg with key at correct parameter index', () => {
			class TestController {
				testMethod(@Param('id') _id: string) {}
			}

			const parameterIndex = 0;
			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'testMethod',
			);

			expect(routeMetadata.args[parameterIndex]).toEqual({ type: 'param', key: 'id' });
		});

		it('should handle multiple Param decorators with different keys', () => {
			class TestController {
				testMethod(@Param('id') _id: string, @Param('userId') _userId: string) {}
			}

			const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'testMethod',
			);

			expect(routeMetadata.args[0]).toEqual({ type: 'param', key: 'id' });
			expect(routeMetadata.args[1]).toEqual({ type: 'param', key: 'userId' });
		});
	});

	it('should work with all decorators combined', () => {
		class TestController {
			testMethod(@Body _body: unknown, @Query _query: unknown, @Param('id') _id: string) {}
		}

		const routeMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'testMethod',
		);

		expect(routeMetadata.args[0]).toEqual({ type: 'body' });
		expect(routeMetadata.args[1]).toEqual({ type: 'query' });
		expect(routeMetadata.args[2]).toEqual({ type: 'param', key: 'id' });
	});

	it('should work with complex parameter combinations', () => {
		class TestController {
			simpleMethod(@Body _body: unknown) {}

			queryMethod(@Query _query: unknown) {}

			mixedMethod(
				@Param('id') _id: string,
				_undecorated: number,
				@Body _body: unknown,
				@Query _query: unknown,
			) {}
		}

		const simpleRouteMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'simpleMethod',
		);

		const queryRouteMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'queryMethod',
		);

		const mixedRouteMetadata = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'mixedMethod',
		);

		expect(simpleRouteMetadata.args[0]).toEqual({ type: 'body' });

		expect(queryRouteMetadata.args[0]).toEqual({ type: 'query' });

		expect(mixedRouteMetadata.args[0]).toEqual({ type: 'param', key: 'id' });
		expect(mixedRouteMetadata.args[1]).toBeUndefined(); // undecorated parameter
		expect(mixedRouteMetadata.args[2]).toEqual({ type: 'body' });
		expect(mixedRouteMetadata.args[3]).toEqual({ type: 'query' });
	});
});
