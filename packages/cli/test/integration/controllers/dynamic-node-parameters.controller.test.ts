import type {
	INodeListSearchResult,
	IWorkflowExecuteAdditionalData,
	ResourceMapperFields,
} from 'n8n-workflow';
import { mock } from 'jest-mock-extended';

import { DynamicNodeParametersService } from '@/services/dynamicNodeParameters.service';
import * as AdditionalData from '@/WorkflowExecuteAdditionalData';

import { createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';
import type { SuperAgentTest } from '../shared/types';

describe('DynamicNodeParametersController', () => {
	const testServer = setupTestServer({ endpointGroups: ['dynamic-node-parameters'] });
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		const owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	const commonRequestParams = {
		credentials: {},
		currentNodeParameters: {},
		nodeTypeAndVersion: {},
		path: 'path',
		methodName: 'methodName',
	};

	describe('POST /dynamic-node-parameters/options', () => {
		jest.spyOn(AdditionalData, 'getBase').mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());

		it('should take params via body', async () => {
			jest
				.spyOn(DynamicNodeParametersService.prototype, 'getOptionsViaMethodName')
				.mockResolvedValue([]);

			await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					loadOptions: {},
				})
				.expect(200);
		});
	});

	describe('POST /dynamic-node-parameters/resource-locator-results', () => {
		it('should take params via body', async () => {
			jest
				.spyOn(DynamicNodeParametersService.prototype, 'getResourceLocatorResults')
				.mockResolvedValue(mock<INodeListSearchResult>());

			await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send({
					...commonRequestParams,
					filter: 'filter',
					paginationToken: 'paginationToken',
				})
				.expect(200);
		});
	});

	describe('POST /dynamic-node-parameters/resource-mapper-fields', () => {
		it('should take params via body', async () => {
			jest
				.spyOn(DynamicNodeParametersService.prototype, 'getResourceMappingFields')
				.mockResolvedValue(mock<ResourceMapperFields>());

			await ownerAgent
				.post('/dynamic-node-parameters/resource-mapper-fields')
				.send({
					...commonRequestParams,
					loadOptions: 'loadOptions',
				})
				.expect(200);
		});
	});
});
