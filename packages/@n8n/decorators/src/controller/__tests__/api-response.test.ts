import { Z } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { ApiResponse } from '../api-response';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Get } from '../route';
import type { Controller } from '../types';

const ExampleDto = Z.class({
	id: z.string(),
	name: z.string(),
});

describe('@ApiResponse Decorator', () => {
	let controllerRegistryMetadata: ControllerRegistryMetadata;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.reset();

		controllerRegistryMetadata = new ControllerRegistryMetadata();
		Container.set(ControllerRegistryMetadata, controllerRegistryMetadata);
	});

	it('should store the response DTO and status code on the route', () => {
		class TestController {
			@Get('/')
			@ApiResponse(200, ExampleDto)
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.responseDto).toBe(ExampleDto);
		expect(route.successStatus).toBe(200);
	});

	it('should reject a handler with more than one @ApiResponse', () => {
		expect(() => {
			class TestController {
				@Get('/')
				@ApiResponse(204)
				@ApiResponse(200, ExampleDto)
				async handler() {}
			}
			void TestController;
		}).toThrow('declares more than one @ApiResponse');
	});

	it('should store a bare success status with no response DTO when none are provided', () => {
		class TestController {
			@Get('/')
			@ApiResponse(204)
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.successStatus).toBe(204);
		expect(route.responseDto).toBeUndefined();
	});

	describe('options', () => {
		it('stores a DTO together with options (description)', () => {
			class TestController {
				@Get('/')
				@ApiResponse(200, ExampleDto, { description: 'A custom description.' })
				async handler() {}
			}

			const route = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'handler',
			);
			expect(route.responseDto).toBe(ExampleDto);
			expect(route.successStatus).toBe(200);
			expect(route.successResponse).toEqual({ description: 'A custom description.' });
		});

		it('stores options with no DTO (binary body + headers)', () => {
			class TestController {
				@Get('/')
				@ApiResponse(200, {
					binaryMediaType: 'application/gzip',
					headers: { 'X-N8n-Export-Counts': { description: 'Per-entity export counts.' } },
				})
				async handler() {}
			}

			const route = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'handler',
			);
			expect(route.responseDto).toBeUndefined();
			expect(route.successStatus).toBe(200);
			expect(route.successResponse).toEqual({
				binaryMediaType: 'application/gzip',
				headers: { 'X-N8n-Export-Counts': { description: 'Per-entity export counts.' } },
			});
		});

		it('leaves successResponse unset when no options are given', () => {
			class TestController {
				@Get('/')
				@ApiResponse(200, ExampleDto)
				async handler() {}
			}

			const route = controllerRegistryMetadata.getRouteMetadata(
				TestController as Controller,
				'handler',
			);
			expect(route.successResponse).toBeUndefined();
		});

		it('rejects binaryMediaType declared together with a response DTO', () => {
			expect(() => {
				class TestController {
					@Get('/')
					@ApiResponse(200, ExampleDto, { binaryMediaType: 'application/gzip' })
					async handler() {}
				}
				void TestController;
			}).toThrow('both a response DTO and binaryMediaType');
		});

		it('rejects binaryMediaType declared on a 204', () => {
			expect(() => {
				class TestController {
					@Get('/')
					@ApiResponse(204, { binaryMediaType: 'application/gzip' })
					async handler() {}
				}
				void TestController;
			}).toThrow('204 @ApiResponse with binaryMediaType');
		});

		it('rejects an application/json binaryMediaType', () => {
			expect(() => {
				class TestController {
					@Get('/')
					@ApiResponse(200, { binaryMediaType: 'application/json' })
					async handler() {}
				}
				void TestController;
			}).toThrow('use a response DTO for a JSON body instead');
		});

		it('rejects an application/json binaryMediaType with parameters', () => {
			expect(() => {
				class TestController {
					@Get('/')
					@ApiResponse(200, { binaryMediaType: 'application/json; charset=utf-8' })
					async handler() {}
				}
				void TestController;
			}).toThrow('use a response DTO for a JSON body instead');
		});
	});
});
