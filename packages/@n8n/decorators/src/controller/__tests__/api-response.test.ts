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
			@ApiResponse(ExampleDto)
			async handler() {}
		}

		const route = controllerRegistryMetadata.getRouteMetadata(
			TestController as Controller,
			'handler',
		);
		expect(route.responseDto).toBe(ExampleDto);
	});
});
