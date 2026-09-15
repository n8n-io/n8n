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
});
