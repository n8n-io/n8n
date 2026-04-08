import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type {
	INodeListSearchResult,
	IWorkflowExecuteAdditionalData,
	ResourceMapperFields,
	NodeParameterValueType,
} from 'n8n-workflow';

import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import * as AdditionalData from '@/workflow-execute-additional-data';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

describe('DynamicNodeParametersController', () => {
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	const service = mockInstance(DynamicNodeParametersService);

	const testServer = setupTestServer({ endpointGroups: ['dynamic-node-parameters'] });
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(AdditionalData, 'getBase').mockResolvedValue(additionalData);
	});

	const commonRequestParams = {
		credentials: {},
		currentNodeParameters: {},
		nodeTypeAndVersion: { name: 'TestNode', version: 1 },
		path: 'path',
	};

	describe('POST /dynamic-node-parameters/options', () => {
		it('should take params via body', async () => {
			service.getOptionsViaMethodName.mockResolvedValue([]);

			await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
				})
				.expect(200);
		});

		it('should take params with loadOptions', async () => {
			const expectedResult = [{ name: 'Test Option', value: 'test' }];
			service.getOptionsViaLoadOptions.mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					loadOptions: { type: 'test' },
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should return empty array when no method or loadOptions provided', async () => {
			const response = await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
				})
				.expect(200);

			expect(response.body).toEqual({ data: [] });
		});
	});

	describe('POST /dynamic-node-parameters/resource-locator-results', () => {
		it('should return resource locator results', async () => {
			const expectedResult: INodeListSearchResult = { results: [] };
			service.getResourceLocatorResults.mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					filter: 'testFilter',
					paginationToken: 'testToken',
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should handle resource locator results without pagination', async () => {
			const mockResults = mock<INodeListSearchResult>();
			service.getResourceLocatorResults.mockResolvedValue(mockResults);

			await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send({
					methodName: 'testMethod',
					...commonRequestParams,
				})
				.expect(200);
		});

		it('should return a 400 if methodName is not defined', async () => {
			await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send(commonRequestParams)
				.expect(400);
		});
	});

	describe('POST /dynamic-node-parameters/resource-mapper-fields', () => {
		it('should return resource mapper fields', async () => {
			const expectedResult: ResourceMapperFields = { fields: [] };
			service.getResourceMappingFields.mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/resource-mapper-fields')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					loadOptions: 'testLoadOptions',
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should return a 400 if methodName is not defined', async () => {
			await ownerAgent
				.post('/dynamic-node-parameters/resource-mapper-fields')
				.send(commonRequestParams)
				.expect(400);
		});
	});

	describe('POST /dynamic-node-parameters/local-resource-mapper-fields', () => {
		it('should return local resource mapper fields', async () => {
			const expectedResult: ResourceMapperFields = { fields: [] };
			service.getLocalResourceMappingFields.mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should return a 400 if methodName is not defined', async () => {
			await ownerAgent
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(commonRequestParams)
				.expect(400);
		});
	});

	describe('POST /dynamic-node-parameters/action-result', () => {
		it('should return action result with handler', async () => {
			const expectedResult: NodeParameterValueType = { test: true };
			service.getActionResult.mockResolvedValue(expectedResult);

			const response = await ownerAgent
				.post('/dynamic-node-parameters/action-result')
				.send({
					...commonRequestParams,
					handler: 'testHandler',
					payload: { someData: 'test' },
				})
				.expect(200);

			expect(response.body).toEqual({ data: expectedResult });
		});

		it('should return a 400 if handler is not defined', async () => {
			await ownerAgent
				.post('/dynamic-node-parameters/action-result')
				.send({
					...commonRequestParams,
					payload: { someData: 'test' },
				})
				.expect(400);
		});
	});
});
