import type {
	OptionsRequestDto,
	ResourceLocatorRequestDto,
	ResourceMapperFieldsRequestDto,
	ActionResultRequestDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { ExecutionContextService } from 'n8n-core';
import type {
	ILoadOptions,
	IWorkflowExecuteAdditionalData,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { DynamicNodeParametersController } from '@/controllers/dynamic-node-parameters.controller';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import * as AdditionalData from '@/workflow-execute-additional-data';

describe('DynamicNodeParametersController', () => {
	let service: Mocked<DynamicNodeParametersService>;
	let authService: Mocked<AuthService>;
	let executionContextService: Mocked<ExecutionContextService>;
	let controller: DynamicNodeParametersController;
	let mockUser: { id: string };
	let baseAdditionalData: IWorkflowExecuteAdditionalData;

	beforeEach(() => {
		service = mock<DynamicNodeParametersService>();
		authService = mock<AuthService>();
		authService.getCookieToken.mockReturnValue(undefined);
		executionContextService = mock<ExecutionContextService>();
		controller = new DynamicNodeParametersController(service, authService, executionContextService);

		mockUser = { id: 'user123' };
		baseAdditionalData = mock<IWorkflowExecuteAdditionalData>();

		vi.spyOn(AdditionalData, 'getBase').mockResolvedValue(baseAdditionalData);
	});

	describe('getOptions', () => {
		const basePayload: OptionsRequestDto = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			currentNodeParameters: {},
		};

		it('should call getOptionsViaMethodName when methodName is provided', async () => {
			const payload: OptionsRequestDto = {
				...basePayload,
				methodName: 'testMethod',
			};
			const req = { user: mockUser } as AuthenticatedRequest;

			const expectedResult: INodePropertyOptions[] = [{ name: 'test', value: 'value' }];
			service.getOptionsViaMethodName.mockResolvedValue(expectedResult);

			const result = await controller.getOptions(req, mock(), payload);

			expect(service.getOptionsViaMethodName).toHaveBeenCalledWith(
				'testMethod',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});

		it('should call getOptionsViaLoadOptionsByPath when loadOptions is provided', async () => {
			const loadOptions: ILoadOptions = {
				routing: {
					operations: {},
				},
			};
			const payload: OptionsRequestDto = {
				...basePayload,
				loadOptions,
			};
			const req = { user: mockUser } as AuthenticatedRequest;

			const expectedResult: INodePropertyOptions[] = [{ name: 'test', value: 'value' }];
			service.getOptionsViaLoadOptionsByPath.mockResolvedValue(expectedResult);

			const result = await controller.getOptions(req, mock(), payload);

			expect(service.getOptionsViaLoadOptionsByPath).toHaveBeenCalledWith(
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});

		it('should return empty array when no method or load options are provided', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;

			const result = await controller.getOptions(req, mock(), basePayload);

			expect(result).toEqual([]);
		});
	});

	describe('getResourceLocatorResults', () => {
		const basePayload: ResourceLocatorRequestDto = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			methodName: 'testMethod',
			currentNodeParameters: {},
		};

		it('should call getResourceLocatorResults with correct parameters', async () => {
			const payload: ResourceLocatorRequestDto = {
				...basePayload,
				filter: 'testFilter',
				paginationToken: 'testToken',
			};
			const req = { user: mockUser } as AuthenticatedRequest;

			const expectedResult = { results: [{ name: 'test', value: 'value' }] };
			service.getResourceLocatorResults.mockResolvedValue(expectedResult);

			const result = await controller.getResourceLocatorResults(req, mock(), payload);

			expect(service.getResourceLocatorResults).toHaveBeenCalledWith(
				'testMethod',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				undefined,
				'testFilter',
				'testToken',
			);
			expect(result).toEqual(expectedResult);
		});
	});

	describe('getResourceMappingFields', () => {
		const basePayload: ResourceMapperFieldsRequestDto = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			methodName: 'testMethod',
			currentNodeParameters: {},
		};

		it('should call getResourceMappingFields with correct parameters', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;

			const expectedResult = { fields: [] };
			service.getResourceMappingFields.mockResolvedValue(expectedResult);

			const result = await controller.getResourceMappingFields(req, mock(), basePayload);

			expect(service.getResourceMappingFields).toHaveBeenCalledWith(
				'testMethod',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});
	});

	describe('getLocalResourceMappingFields', () => {
		const basePayload: ResourceMapperFieldsRequestDto = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			methodName: 'testMethod',
			currentNodeParameters: {},
		};

		it('should call getLocalResourceMappingFields with correct parameters', async () => {
			const req = { user: mockUser } as AuthenticatedRequest;

			const expectedResult = { fields: [] };
			service.getLocalResourceMappingFields.mockResolvedValue(expectedResult);

			const result = await controller.getLocalResourceMappingFields(req, mock(), basePayload);

			expect(service.getLocalResourceMappingFields).toHaveBeenCalledWith(
				'testMethod',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
			);
			expect(result).toEqual(expectedResult);
		});
	});

	describe('getActionResult', () => {
		const basePayload: ActionResultRequestDto = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			handler: 'testHandler',
			currentNodeParameters: {},
		};

		it('should call getActionResult with correct parameters', async () => {
			const payload: ActionResultRequestDto = {
				...basePayload,
				payload: { test: 'value' },
			};
			const req = { user: mockUser } as AuthenticatedRequest;

			const expectedResult: NodeParameterValueType = 'test result';
			service.getActionResult.mockResolvedValue(expectedResult);

			const result = await controller.getActionResult(req, mock(), payload);

			expect(service.getActionResult).toHaveBeenCalledWith(
				'testHandler',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				{ test: 'value' },
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});
	});
	describe('execution context', () => {
		const payload: ResourceLocatorRequestDto = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			currentNodeParameters: {},
			methodName: 'testMethod',
		};

		it("seals the request's own auth cookie and request context", async () => {
			// Design-time loading resolves end-user credentials against the requesting
			// user's connection, so their identity has to travel with the request.
			authService.getCookieToken.mockReturnValue('n8n-auth-cookie-jwt');
			authService.getMethod.mockReturnValue('POST');
			authService.getEndpoint.mockReturnValue('/rest/dynamic-node-parameters/options');
			authService.getBrowserId.mockReturnValue('browser-abc');
			executionContextService.buildRequestBoundCredentials.mockResolvedValue('sealed');
			service.getResourceLocatorResults.mockResolvedValue({ results: [] });

			await controller.getResourceLocatorResults(
				{ user: mockUser } as AuthenticatedRequest,
				mock(),
				payload,
			);

			expect(executionContextService.buildRequestBoundCredentials).toHaveBeenCalledWith(
				'n8n-auth-cookie-jwt',
				{
					method: 'POST',
					endpoint: '/rest/dynamic-node-parameters/options',
					browserId: 'browser-abc',
				},
			);
			expect(baseAdditionalData.executionContext).toEqual({
				version: 1,
				establishedAt: expect.any(Number),
				source: 'internal',
				credentials: 'sealed',
			});
		});

		it('leaves a caller without an auth cookie without a context', async () => {
			// API-key callers keep the existing static-data behaviour rather than failing.
			authService.getCookieToken.mockReturnValue(undefined);
			service.getResourceLocatorResults.mockResolvedValue({ results: [] });

			await controller.getResourceLocatorResults(
				{ user: mockUser } as AuthenticatedRequest,
				mock(),
				payload,
			);

			expect(executionContextService.buildRequestBoundCredentials).not.toHaveBeenCalled();
			expect(baseAdditionalData.executionContext).toBeUndefined();
		});
	});
});
