import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	ControllerRegistryMetadata,
	Deprecated,
	Get,
	Param,
	Post,
	Query,
} from '@n8n/decorators';
import type { Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import {
	markPublicApiController,
	WidgetBodyDto,
	WidgetPaginationQueryDto,
	WidgetQueryDto,
} from '@/public-api/__tests__/public-api-controller-test-utils';

import { getDecoratorGeneratedOperations } from '../decorator-routes';

describe('getDecoratorGeneratedOperations', () => {
	beforeEach(() => {
		Container.set(ControllerRegistryMetadata, new ControllerRegistryMetadata());
	});

	it('includes tags when @ApiTags is present', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiTags(['Widgets', 'Beta'])
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.tags).toEqual(['Beta', 'Widgets']);
	});

	it('includes the summary when @ApiSummary is present', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiSummary('List widgets')
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.summary).toBe('List widgets');
	});

	it('includes the description when @ApiDescription is present', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiDescription('Returns a list of widgets.')
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.description).toBe('Returns a list of widgets.');
	});

	it('documents the required scope when @ApiKeyScope is present', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiKeyScope('workflow:read')
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config['x-required-scope']).toBe('workflow:read');
	});

	it('marks the operation deprecated when @Deprecated is present', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@Deprecated({ since: new Date('2026-07-23T00:00:00Z') })
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.deprecated).toBe(true);
	});

	it('includes shared pagination parameters when the query DTO declares them', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			method(@Query _query: WidgetPaginationQueryDto) {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.parameters).toEqual([
			{ $ref: '../../../../shared/spec/parameters/limit.yml' },
		]);
	});

	it('includes request params, query, and body together when a route declares all three', () => {
		class WidgetsPublicController {
			@Post('/:id')
			@ApiResponse(201)
			method(@Param('id') _id: string, @Body _body: WidgetBodyDto, @Query _query: WidgetQueryDto) {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		const params = operation.config.request?.params as z.AnyZodObject | undefined;
		expect(params?.shape).toHaveProperty('id');
		expect(operation.config.request?.query).toBeDefined();
		expect(operation.config.request?.body).toEqual({
			content: { 'application/json': { schema: WidgetBodyDto.schema } },
		});
	});

	it('bare route: omits every optional field, but always adds success/auth responses and eov routing headers', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		const [operation] = getDecoratorGeneratedOperations();

		expect(operation.config.tags).toBeUndefined();
		expect(operation.config.summary).toBeUndefined();
		expect(operation.config.description).toBeUndefined();
		expect(operation.config['x-required-scope']).toBeUndefined();
		expect(operation.config.parameters).toBeUndefined();
		expect(operation.config.request).toBeUndefined();
		expect(operation.config.deprecated).toBeUndefined();
		expect(operation.config.responses[200]).toEqual({ description: 'Operation successful.' });
		expect(operation.config.responses[401]).toEqual({
			$ref: '../../../../shared/spec/responses/unauthorized.yml',
		});
		expect(operation.config['x-eov-operation-id']).toBe('unreachable');
		expect(operation.config['x-eov-operation-handler']).toBe(
			'v1/handlers/decorator-routed.handler',
		);
		expect(operation.config['x-decorator-routed']).toBe(true);
	});

	it('throws for an @ApiErrorResponse status with no shared response file mapped', () => {
		class WidgetsPublicController {
			@Get('/')
			@ApiResponse(200)
			@ApiErrorResponse(418)
			method() {}
		}
		markPublicApiController(WidgetsPublicController as Controller, '/widgets');

		expect(() => getDecoratorGeneratedOperations()).toThrow(UnexpectedError);
		expect(() => getDecoratorGeneratedOperations()).toThrow(/ApiErrorResponse\(418\)/);
	});
});
