import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import {
	type INodeParameters,
	type INodeType,
	type IWorkflowExecuteAdditionalData,
	type ResourceMapperFields,
	Expression,
} from 'n8n-workflow';

import { RoutingNode } from 'n8n-core';

import { DynamicNodeParametersService } from '../dynamic-node-parameters.service';
import { WorkflowLoaderService } from '../workflow-loader.service';

jest.mock('n8n-core', () => {
	const actual = jest.requireActual('n8n-core');
	return { ...actual, RoutingNode: jest.fn() };
});

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NodeTypes } from '@/node-types';
import * as checkAccess from '@/permissions.ee/check-access';
import { SharedWorkflowRepository } from '@n8n/db';
import type { CredentialsEntity, User } from '@n8n/db';

describe('DynamicNodeParametersService', () => {
	const logger = mockInstance(Logger);
	const nodeTypes = mockInstance(NodeTypes);
	const workflowLoaderService = mockInstance(WorkflowLoaderService);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const credentialsFinderService = mockInstance(CredentialsFinderService);
	const service = new DynamicNodeParametersService(
		logger,
		nodeTypes,
		workflowLoaderService,
		sharedWorkflowRepository,
		credentialsFinderService,
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

	describe('getOptionsViaLoadOptionsByPath', () => {
		it('should throw BadRequestError when no loadOptions routing exists at the parameter path', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: {
						name: 'TestNode',
						properties: [],
						requestDefaults: { baseURL: 'https://api.example.com' },
					},
				}),
			);

			await expect(
				service.getOptionsViaLoadOptionsByPath(
					'parameters.unknown',
					mock<IWorkflowExecuteAdditionalData>(),
					{ name: 'TestNode', version: 1 },
					mock<INodeParameters>(),
				),
			).rejects.toThrow(BadRequestError);
		});

		it('should resolve routing from the node definition and run it', async () => {
			const runNode = jest.fn().mockResolvedValue([[{ json: { name: 'opt', value: 'v' } }]]);
			(RoutingNode as unknown as jest.Mock).mockImplementation(() => ({ runNode }));
			jest.spyOn(Expression.prototype, 'acquireIsolate').mockResolvedValue(undefined);
			jest.spyOn(Expression.prototype, 'releaseIsolate').mockResolvedValue(undefined);

			const nodeRouting = { request: { url: '/v1/models', method: 'GET' as const } };
			// Plain object (not a deep mock) so Workflow's parameter resolution doesn't
			// trip over auto-generated mock fields on the property.
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: {
					name: 'TestNode',
					displayName: 'TestNode',
					group: [],
					version: 1,
					defaults: {},
					inputs: [],
					outputs: [],
					properties: [
						{
							displayName: 'Model',
							name: 'model',
							type: 'options',
							default: '',
							options: [],
							typeOptions: { loadOptions: { routing: nodeRouting } },
						},
					],
					requestDefaults: { baseURL: 'https://api.example.com' },
				},
			} as unknown as INodeType);

			const result = await service.getOptionsViaLoadOptionsByPath(
				'parameters.model',
				mock<IWorkflowExecuteAdditionalData>(),
				{ name: 'TestNode', version: 1 },
				{} as INodeParameters,
			);

			expect(RoutingNode).toHaveBeenCalled();
			expect(runNode).toHaveBeenCalled();
			expect(result).toEqual([{ name: 'opt', value: 'v' }]);
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

	describe('refineResourceIds', () => {
		const user = mock<User>();

		beforeEach(() => {
			jest.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should not call findCredentialForUser when no credentials provided', async () => {
			await service.refineResourceIds(user, { credentials: undefined });
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
		});

		it('should not call findCredentialForUser when credentials object is empty', async () => {
			await service.refineResourceIds(user, { credentials: {} });
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
		});

		it('should not call findCredentialForUser when all credential entries have no id', async () => {
			await service.refineResourceIds(user, {
				credentials: { openAi: { id: null, name: 'My OpenAI' } },
			});
			expect(credentialsFinderService.findCredentialForUser).not.toHaveBeenCalled();
		});

		it('should allow request when user has access to all supplied credentials', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mock<CredentialsEntity>());

			await expect(
				service.refineResourceIds(user, {
					credentials: { openAi: { id: 'cred-1', name: 'My OpenAI' } },
				}),
			).resolves.not.toThrow();
		});

		it('should throw when user does not have access to a credential', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(
				service.refineResourceIds(user, {
					credentials: { openAi: { id: 'cred-1', name: 'Foreign OpenAI' } },
				}),
			).rejects.toThrow(ForbiddenError);
		});

		it('should throw when any credential in a multi-credential request is inaccessible', async () => {
			credentialsFinderService.findCredentialForUser
				.mockResolvedValueOnce(mock<CredentialsEntity>())
				.mockResolvedValueOnce(null);

			await expect(
				service.refineResourceIds(user, {
					credentials: {
						openAi: { id: 'cred-1', name: 'My OpenAI' },
						openAi2: { id: 'cred-2', name: 'Foreign OpenAI' },
					},
				}),
			).rejects.toThrow(ForbiddenError);
		});

		it('should allow request when all of multiple credentials are accessible', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mock<CredentialsEntity>());

			await expect(
				service.refineResourceIds(user, {
					credentials: {
						openAi: { id: 'cred-1', name: 'My OpenAI' },
						openAi2: { id: 'cred-2', name: 'My OpenAI 2' },
					},
				}),
			).resolves.not.toThrow();
		});

		it('should skip credential entries without an id when validating', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mock<CredentialsEntity>());

			await service.refineResourceIds(user, {
				credentials: {
					anon: { id: null, name: 'anonymous' },
					named: { id: 'cred-1', name: 'Named Credential' },
				},
			});

			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith('cred-1', user, [
				'credential:read',
			]);
			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledTimes(1);
		});

		it('should call findCredentialForUser with credential:read scope', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(mock<CredentialsEntity>());

			await service.refineResourceIds(user, {
				credentials: { openAi: { id: 'cred-1', name: 'My OpenAI' } },
			});

			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith('cred-1', user, [
				'credential:read',
			]);
		});

		it('should run credential check regardless of whether workflowId is present', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(
				service.refineResourceIds(user, {
					credentials: { openAi: { id: 'cred-1', name: 'Foreign OpenAI' } },
					// workflowId intentionally omitted
				}),
			).rejects.toThrow(ForbiddenError);
		});
	});
});
