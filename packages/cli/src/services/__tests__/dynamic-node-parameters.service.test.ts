import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { SharedWorkflowRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { RoutingNode } from 'n8n-core';
import {
	type INodeParameters,
	type INodeType,
	type IWorkflowExecuteAdditionalData,
	type ResourceMapperFields,
	Expression,
} from 'n8n-workflow';
import type { Mock, MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

vi.mock('n8n-core', async () => {
	return {
		...(await vi.importActual('n8n-core')),
		RoutingNode: vi.fn(),
	};
});

import { DynamicNodeParametersService } from '../dynamic-node-parameters.service';
import { WorkflowLoaderService } from '../workflow-loader.service';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NodeTypes } from '@/node-types';
import * as checkAccess from '@/permissions.ee/check-access';

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
		vi.resetAllMocks();
	});

	describe('getResourceMappingFields', () => {
		it('should remove duplicate resource mapping fields', async () => {
			const resourceMappingMethod = vi.fn();
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

	describe('expression isolate lifecycle', () => {
		let acquireSpy: MockInstance;
		let releaseSpy: MockInstance;

		beforeEach(() => {
			acquireSpy = vi.spyOn(Expression.prototype, 'acquireIsolate').mockResolvedValue(true);
			releaseSpy = vi.spyOn(Expression.prototype, 'releaseIsolate').mockResolvedValue(undefined);
		});

		it('should acquire and release isolate around getOptionsViaMethodName', async () => {
			const loadOptionsMethod = vi.fn().mockResolvedValue([{ name: 'opt', value: 'v' }]);
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: { properties: [] },
					methods: { loadOptions: { getOptions: loadOptionsMethod } },
				}),
			);

			await service.getOptionsViaMethodName(
				'getOptions',
				'',
				mock<IWorkflowExecuteAdditionalData>(),
				{ name: 'TestNode', version: 1 },
				mock<INodeParameters>(),
			);

			expect(acquireSpy).toHaveBeenCalledTimes(1);
			expect(releaseSpy).toHaveBeenCalledTimes(1);
		});

		it('should release isolate even when the inner method throws', async () => {
			const loadOptionsMethod = vi.fn().mockRejectedValue(new Error('boom'));
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: { properties: [] },
					methods: { loadOptions: { getOptions: loadOptionsMethod } },
				}),
			);

			await expect(
				service.getOptionsViaMethodName(
					'getOptions',
					'',
					mock<IWorkflowExecuteAdditionalData>(),
					{ name: 'TestNode', version: 1 },
					mock<INodeParameters>(),
				),
			).rejects.toThrow('boom');

			expect(acquireSpy).toHaveBeenCalledTimes(1);
			expect(releaseSpy).toHaveBeenCalledTimes(1);
		});

		it('should acquire and release isolate around getResourceLocatorResults', async () => {
			const listSearchMethod = vi.fn().mockResolvedValue({ results: [{ name: 'r', value: 'v' }] });
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: { properties: [] },
					methods: { listSearch: { searchModels: listSearchMethod } },
				}),
			);

			await service.getResourceLocatorResults(
				'searchModels',
				'',
				mock<IWorkflowExecuteAdditionalData>(),
				{ name: 'TestNode', version: 1 },
				mock<INodeParameters>(),
			);

			expect(acquireSpy).toHaveBeenCalledTimes(1);
			expect(releaseSpy).toHaveBeenCalledTimes(1);
		});

		it('should acquire and release isolate around getResourceMappingFields', async () => {
			const resourceMappingMethod = vi.fn().mockResolvedValue({
				fields: [{ id: '1', displayName: 'F', defaultMatch: false, required: true, display: true }],
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: { properties: [] },
					methods: { resourceMapping: { getFields: resourceMappingMethod } },
				}),
			);

			await service.getResourceMappingFields(
				'getFields',
				'',
				mock<IWorkflowExecuteAdditionalData>(),
				{ name: 'TestNode', version: 1 },
				mock<INodeParameters>(),
			);

			expect(acquireSpy).toHaveBeenCalledTimes(1);
			expect(releaseSpy).toHaveBeenCalledTimes(1);
		});

		it('should acquire and release isolate around getActionResult', async () => {
			const actionHandler = vi.fn().mockResolvedValue({ key: 'value' });
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: { properties: [] },
					methods: { actionHandler: { handle: actionHandler } },
				}),
			);

			await service.getActionResult(
				'handle',
				'',
				mock<IWorkflowExecuteAdditionalData>(),
				{ name: 'TestNode', version: 1 },
				mock<INodeParameters>(),
				undefined,
			);

			expect(acquireSpy).toHaveBeenCalledTimes(1);
			expect(releaseSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('getOptionsViaLoadOptions', () => {
		it('should throw BadRequestError when the node type has no requestDefaults.baseURL', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: {
						name: 'TestNode',
						properties: [],
						requestDefaults: undefined,
					},
				}),
			);

			await expect(
				service.getOptionsViaLoadOptions(
					{ routing: { request: { url: '/v1/models' } } },
					mock<IWorkflowExecuteAdditionalData>(),
					{ name: 'TestNode', version: 1 },
					mock<INodeParameters>(),
				),
			).rejects.toThrow(BadRequestError);
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
			const runNode = vi.fn().mockResolvedValue([[{ json: { name: 'opt', value: 'v' } }]]);
			(RoutingNode as unknown as Mock).mockImplementation(function () {
				return { runNode };
			});
			vi.spyOn(Expression.prototype, 'acquireIsolate').mockResolvedValue(true);
			vi.spyOn(Expression.prototype, 'releaseIsolate').mockResolvedValue(undefined);

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

	describe('getMethod', () => {
		it('should throw BadRequestError when the requested method does not exist', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: {
					name: 'TestNode',
					displayName: 'Test',
					group: [],
					version: 1,
					description: '',
					defaults: {},
					inputs: [],
					outputs: [],
					properties: [],
				},
				methods: { loadOptions: { someOther: vi.fn() } },
			} as unknown as INodeType);

			await expect(
				service.getOptionsViaMethodName(
					'doesNotExist',
					'',
					mock<IWorkflowExecuteAdditionalData>(),
					{ name: 'TestNode', version: 1 },
					mock<INodeParameters>(),
				),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('getLocalResourceMappingFields', () => {
		it('should remove duplicate resource mapping fields', async () => {
			const resourceMappingMethod = vi.fn();
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
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.restoreAllMocks();
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
