import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import {
	type INodeParameters,
	type INodeType,
	type IWorkflowExecuteAdditionalData,
	type ResourceMapperFields,
} from 'n8n-workflow';

import { DynamicNodeParametersService } from '../dynamic-node-parameters.service';
import { WorkflowLoaderService } from '../workflow-loader.service';

import { NodeTypes } from '@/node-types';
import { SharedWorkflowRepository } from '@n8n/db';

describe('DynamicNodeParametersService', () => {
	const logger = mockInstance(Logger);
	const nodeTypes = mockInstance(NodeTypes);
	const workflowLoaderService = mockInstance(WorkflowLoaderService);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const service = new DynamicNodeParametersService(
		logger,
		nodeTypes,
		workflowLoaderService,
		sharedWorkflowRepository,
	);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('getResourceMappingFields', () => {
		it('should remove duplicate resource mapping fields', async () => {
			const resourceMappingMethod = jest.fn();
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: {
						properties: [],
					},
					methods: {
						resourceMapping: {
							getFields: resourceMappingMethod,
						},
					},
				}),
			);
			const fields: ResourceMapperFields = {
				fields: [
					{ id: '1', displayName: 'Field 1', defaultMatch: false, required: true, display: true },
					{ id: '2', displayName: 'Field 2', defaultMatch: false, required: true, display: true },
					{
						id: '2',
						displayName: 'Field 2 (duplicate)',
						defaultMatch: false,
						required: true,
						display: true,
					},
					{ id: '3', displayName: 'Field 3', defaultMatch: false, required: true, display: true },
				],
			};
			resourceMappingMethod.mockResolvedValue(fields);

			const result = await service.getResourceMappingFields(
				'getFields',
				'test',
				mock<IWorkflowExecuteAdditionalData>(),
				{ name: 'TestNode', version: 1 },
				mock<INodeParameters>(),
			);
			expect(result).toEqual({
				fields: [
					{ id: '1', displayName: 'Field 1', defaultMatch: false, required: true, display: true },
					{ id: '2', displayName: 'Field 2', defaultMatch: false, required: true, display: true },
					{ id: '3', displayName: 'Field 3', defaultMatch: false, required: true, display: true },
				],
			});
		});
	});

	describe('getLocalResourceMappingFields', () => {
		it('should remove duplicate resource mapping fields', async () => {
			const resourceMappingMethod = jest.fn();
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: {
						properties: [],
					},
					methods: {
						localResourceMapping: {
							getFields: resourceMappingMethod,
						},
					},
				}),
			);
			const fields: ResourceMapperFields = {
				fields: [
					{ id: '1', displayName: 'Field 1', defaultMatch: false, required: true, display: true },
					{ id: '2', displayName: 'Field 2', defaultMatch: false, required: true, display: true },
					{
						id: '2',
						displayName: 'Field 2 (duplicate)',
						defaultMatch: false,
						required: true,
						display: true,
					},
					{ id: '3', displayName: 'Field 3', defaultMatch: false, required: true, display: true },
				],
			};
			resourceMappingMethod.mockResolvedValue(fields);

			const result = await service.getLocalResourceMappingFields(
				'getFields',
				'test',
				mock<IWorkflowExecuteAdditionalData>(),
				{ name: 'TestNode', version: 1 },
			);
			expect(result).toEqual({
				fields: [
					{ id: '1', displayName: 'Field 1', defaultMatch: false, required: true, display: true },
					{ id: '2', displayName: 'Field 2', defaultMatch: false, required: true, display: true },
					{ id: '3', displayName: 'Field 3', defaultMatch: false, required: true, display: true },
				],
			});
		});
	});
});
