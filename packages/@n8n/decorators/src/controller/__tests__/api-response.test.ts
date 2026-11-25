import { Z } from '@n8n/api-types';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { ApiResponse } from '../api-response';
import { ControllerRegistryMetadata } from '../controller-registry-metadata';
import { Get } from '../route';
import type { BinaryResponse, Controller } from '../types';

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

	it('should store binary response metadata and leave responseDto undefined', () => {
		const binaryOptions: BinaryResponse = {
			mediaType: 'application/gzip',
			description: 'Compressed archive',
			headers: {
				'X-Archive-Size': { description: 'Size of the archive' },
			},
		};

		class TestController {
			@Get('/')
			@ApiResponse(200, binaryOptions)
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.binaryResponse).toEqual(binaryOptions);
		expect(route.successStatus).toBe(200);
		expect(route.responseDto).toBeUndefined();
	});

	it('should reject a binary response with an unsupported media type', () => {
		expect(() => {
			class TestController {
				@Get('/')
				@ApiResponse(200, { mediaType: 'text/csv' } as never)
				async handler() {}
			}
			void TestController;
		}).toThrow('unsupported binary media type "text/csv"');
	});

	it('should reject a body that is neither a response DTO nor binary options', () => {
		expect(() => {
			class TestController {
				@Get('/')
				@ApiResponse(200, {} as never)
				async handler() {}
			}
			void TestController;
		}).toThrow('neither a response DTO nor binary options');
	});

	it('should reject 204 with binary response', () => {
		expect(() => {
			const binaryOptions = { mediaType: 'application/gzip' } as never;
			class TestController {
				@Get('/')
				@ApiResponse(204, binaryOptions)
				async handler() {}
			}
			void TestController;
		}).toThrow('declares a 204 @ApiResponse with a binary body');
	});
});
