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

	it('should store the response DTO on the route', () => {
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
	});

	it('should store both the DTO and the success status when given together', () => {
		class TestController {
			@Get('/')
			@ApiResponse(201, ExampleDto)
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.responseDto).toBe(ExampleDto);
		expect(route.successStatus).toBe(201);
	});

	it('should clear a DTO left by a lower stacked @ApiResponse, so a 204 keeps no body', () => {
		// Decorators evaluate bottom-up: without a full overwrite the 200's DTO survived onto the 204,
		// which the generator would then document as a 204 carrying JSON.
		class TestController {
			@Get('/')
			@ApiResponse(204)
			@ApiResponse(200, ExampleDto)
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.successStatus).toBe(204);
		expect(route.responseDto).toBeUndefined();
	});

	it('should store a bare success status with no DTO', () => {
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
