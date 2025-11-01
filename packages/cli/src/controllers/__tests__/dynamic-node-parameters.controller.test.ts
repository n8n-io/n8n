import type {
	OptionsRequestDto,
	ResourceLocatorRequestDto,
	ResourceMapperFieldsRequestDto,
	ActionResultRequestDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type {
	ILoadOptions,
	IWorkflowExecuteAdditionalData,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';

import { DynamicNodeParametersController } from '@/controllers/dynamic-node-parameters.controller';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import * as AdditionalData from '@/workflow-execute-additional-data';

describe('DynamicNodeParametersController', () => {
	let service: jest.Mocked<DynamicNodeParametersService>;
	let controller: DynamicNodeParametersController;
	let mockUser: { id: string };
	let baseAdditionalData: IWorkflowExecuteAdditionalData;

	beforeEach(() => {
		service = mock<DynamicNodeParametersService>();
		controller = new DynamicNodeParametersController(service);

		mockUser = { id: 'user123' };
		baseAdditionalData = mock<IWorkflowExecuteAdditionalData>();

		jest.spyOn(AdditionalData, 'getBase').mockResolvedValue(baseAdditionalData);
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

		it('should call getOptionsViaLoadOptions when loadOptions is provided', async () => {
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
			service.getOptionsViaLoadOptions.mockResolvedValue(expectedResult);

			const result = await controller.getOptions(req, mock(), payload);

			expect(service.getOptionsViaLoadOptions).toHaveBeenCalledWith(
				loadOptions,
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
});
