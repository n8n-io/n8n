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

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NodeTypes } from '@/node-types';
import * as checkAccess from '@/permissions.ee/check-access';
import { SharedWorkflowRepository } from '@n8n/db';
import type { User } from '@n8n/db';

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

		it('should not call findCredentialIdsWithScopeForUser when no credentials provided', async () => {
			await service.refineResourceIds(user, { credentials: undefined });
			expect(credentialsFinderService.findCredentialIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('should not call findCredentialIdsWithScopeForUser when credentials object is empty', async () => {
			await service.refineResourceIds(user, { credentials: {} });
			expect(credentialsFinderService.findCredentialIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('should not call findCredentialIdsWithScopeForUser when all credential entries have no id', async () => {
			await service.refineResourceIds(user, {
				credentials: { openAi: { id: null, name: 'My OpenAI' } },
			});
			expect(credentialsFinderService.findCredentialIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('should allow request when user has access to all supplied credentials', async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);

			await expect(
				service.refineResourceIds(user, {
					credentials: { openAi: { id: 'cred-1', name: 'My OpenAI' } },
				}),
			).resolves.not.toThrow();
		});

		it('should throw when user does not have access to a credential', async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());

			await expect(
				service.refineResourceIds(user, {
					credentials: { openAi: { id: 'cred-1', name: 'Foreign OpenAI' } },
				}),
			).rejects.toThrow(ForbiddenError);
		});

		it('should throw when any credential in a multi-credential request is inaccessible', async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);

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
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1', 'cred-2']),
			);

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
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);

			await service.refineResourceIds(user, {
				credentials: {
					anon: { id: null, name: 'anonymous' },
					named: { id: 'cred-1', name: 'Named Credential' },
				},
			});

			expect(credentialsFinderService.findCredentialIdsWithScopeForUser).toHaveBeenCalledWith(
				['cred-1'],
				user,
				['credential:read'],
			);
		});

		it('should call findCredentialIdsWithScopeForUser with credential:read scope', async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(
				new Set(['cred-1']),
			);

			await service.refineResourceIds(user, {
				credentials: { openAi: { id: 'cred-1', name: 'My OpenAI' } },
			});

			expect(credentialsFinderService.findCredentialIdsWithScopeForUser).toHaveBeenCalledWith(
				expect.any(Array),
				user,
				['credential:read'],
			);
		});

		it('should run credential check regardless of whether workflowId is present', async () => {
			credentialsFinderService.findCredentialIdsWithScopeForUser.mockResolvedValue(new Set());

			await expect(
				service.refineResourceIds(user, {
					credentials: { openAi: { id: 'cred-1', name: 'Foreign OpenAI' } },
					// workflowId intentionally omitted
				}),
			).rejects.toThrow(ForbiddenError);
		});
	});
});
