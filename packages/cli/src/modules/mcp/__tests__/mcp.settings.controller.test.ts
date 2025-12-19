import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { type ApiKey, type AuthenticatedRequest, WorkflowEntity, User, Role } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';
import { HTTP_REQUEST_NODE_TYPE, WEBHOOK_NODE_TYPE, type INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import type { ListQuery } from '@/requests';

import { UpdateMcpSettingsDto } from '../dto/update-mcp-settings.dto';
import { McpServerApiKeyService } from '../mcp-api-key.service';
import { SUPPORTED_MCP_TRIGGERS } from '../mcp.constants';
import { McpSettingsController } from '../mcp.settings.controller';
import { McpSettingsService } from '../mcp.settings.service';
import { createWorkflow } from './mock.utils';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

const createReq = (
	body: unknown,
	overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest => ({ body, ...overrides }) as unknown as AuthenticatedRequest;

const createRole = () =>
	Object.assign(new Role(), {
		slug: 'member',
		displayName: 'Member',
		description: null,
		systemRole: false,
		roleType: 'global' as const,
		projectRelations: [],
		scopes: [],
	});

const createUser = (overrides: Partial<User> = {}) =>
	Object.assign(
		new User(),
		{
			id: 'user-1',
			email: 'user@example.com',
			firstName: 'Test',
			lastName: 'User',
			password: null,
			personalizationAnswers: null,
			settings: null,
			role: createRole(),
			authIdentities: [],
			apiKeys: [],
			sharedWorkflows: [],
			sharedCredentials: [],
			projectRelations: [],
			disabled: false,
			mfaEnabled: false,
			mfaSecret: null,
			mfaRecoveryCodes: [],
			lastActiveAt: null,
			isPending: false,
		},
		overrides,
	);

const createRes = () => {
	const res = mock<Response>();
	res.status.mockReturnThis();
	res.json.mockReturnThis();
	return res;
};

const createListQueryReq = (
	user: User,
	listQueryOptions: ListQuery.Options = {},
): ListQuery.Request =>
	({
		user,
		listQueryOptions,
	}) as unknown as ListQuery.Request;

describe('McpSettingsController', () => {
	const logger = mock<Logger>();
	const moduleRegistry = mockDeep<ModuleRegistry>();
	const mcpSettingsService = mock<McpSettingsService>();
	const mcpServerApiKeyService = mockDeep<McpServerApiKeyService>();
	const workflowFinderService = mock<WorkflowFinderService>();
	const workflowService = mock<WorkflowService>();

	let controller: McpSettingsController;

	beforeEach(() => {
		jest.clearAllMocks();
		Container.set(Logger, logger);
		Container.set(McpSettingsService, mcpSettingsService);
		Container.set(ModuleRegistry, moduleRegistry);
		Container.set(McpServerApiKeyService, mcpServerApiKeyService);
		Container.set(WorkflowFinderService, workflowFinderService);
		Container.set(WorkflowService, workflowService);
		controller = Container.get(McpSettingsController);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('updateSettings', () => {
		test('disables MCP access correctly', async () => {
			const req = createReq({ mcpAccessEnabled: false });
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: false });
			mcpSettingsService.setEnabled.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockResolvedValue(null);

			const res = createRes();
			const result = await controller.updateSettings(req, res, dto);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(false);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('mcp');
			expect(result).toEqual({ mcpAccessEnabled: false });
		});

		test('enables MCP access correctly', async () => {
			const req = createReq({ mcpAccessEnabled: true });
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: true });
			mcpSettingsService.setEnabled.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockResolvedValue(null);

			const res = createRes();
			const result = await controller.updateSettings(req, res, dto);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(true);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('mcp');
			expect(result).toEqual({ mcpAccessEnabled: true });
		});

		test('handles module registry refresh failure gracefully', async () => {
			const req = createReq({ mcpAccessEnabled: true });
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: true });
			const error = new Error('Registry sync failed');

			mcpSettingsService.setEnabled.mockResolvedValue(undefined);
			moduleRegistry.refreshModuleSettings.mockRejectedValue(error);

			const res = createRes();
			const result = await controller.updateSettings(req, res, dto);

			expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(true);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('mcp');
			expect(logger.warn).toHaveBeenCalledWith('Failed to sync MCP settings to module registry', {
				cause: 'Registry sync failed',
			});
			expect(result).toEqual({ mcpAccessEnabled: true });
		});

		test('requires boolean mcpAccessEnabled value', () => {
			expect(() => new UpdateMcpSettingsDto({} as never)).toThrow();
			expect(() => new UpdateMcpSettingsDto({ mcpAccessEnabled: 'yes' } as never)).toThrow();
		});
	});

	describe('getApiKeyForMcpServer', () => {
		const mockUser = createUser({ id: 'user123', email: 'user123@example.com' });
		const mockApiKey = {
			id: 'api-key-123',
			key: 'mcp-key-abc123',
			userId: 'user123',
			createdAt: new Date(),
		} as unknown as ApiKey;

		test('returns API key from getOrCreateApiKey', async () => {
			const req = createReq({}, { user: mockUser });
			mcpServerApiKeyService.getOrCreateApiKey.mockResolvedValue(mockApiKey);

			const result = await controller.getApiKeyForMcpServer(req);

			expect(mcpServerApiKeyService.getOrCreateApiKey).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual(mockApiKey);
		});
	});

	describe('rotateApiKeyForMcpServer', () => {
		const mockUser = createUser({ id: 'user123', email: 'user123@example.com' });
		const mockApiKey = {
			id: 'api-key-123',
			key: 'mcp-key-abc123',
			userId: 'user123',
			createdAt: new Date(),
		} as unknown as ApiKey;

		test('successfully rotates API key', async () => {
			const req = createReq({}, { user: mockUser });

			mcpServerApiKeyService.rotateMcpServerApiKey.mockResolvedValue(mockApiKey);

			const result = await controller.rotateApiKeyForMcpServer(req);

			expect(mcpServerApiKeyService.rotateMcpServerApiKey).toHaveBeenCalledWith(mockUser);
			expect(result).toEqual(mockApiKey);
		});
	});

	describe('getMcpEligibleWorkflows', () => {
		const user = createUser();

		test('calls workflowService.getMany with correct filter options', async () => {
			const req = createListQueryReq(user);
			const res = createRes();
			const mockWorkflows = [createWorkflow({ id: 'wf-1' }), createWorkflow({ id: 'wf-2' })];

			workflowService.getMany.mockResolvedValue({ workflows: mockWorkflows, count: 2 });

			await controller.getMcpEligibleWorkflows(req, res);

			expect(workflowService.getMany).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					filter: expect.objectContaining({
						active: true,
						isArchived: false,
						availableInMCP: false,
						triggerNodeTypes: Object.keys(SUPPORTED_MCP_TRIGGERS),
					}),
				}),
				false, // includeScopes
				false, // includeFolders
				false, // onlySharedWithMe
				['workflow:update'], // requiredScopes
			);
		});

		test('returns workflows and count in response', async () => {
			const req = createListQueryReq(user);
			const res = createRes();
			const mockWorkflows = [createWorkflow({ id: 'wf-1' }), createWorkflow({ id: 'wf-2' })];

			workflowService.getMany.mockResolvedValue({ workflows: mockWorkflows, count: 2 });

			await controller.getMcpEligibleWorkflows(req, res);

			expect(res.json).toHaveBeenCalledWith({ count: 2, data: mockWorkflows });
		});

		test('returns empty array when no eligible workflows exist', async () => {
			const req = createListQueryReq(user);
			const res = createRes();

			workflowService.getMany.mockResolvedValue({ workflows: [], count: 0 });

			await controller.getMcpEligibleWorkflows(req, res);

			expect(res.json).toHaveBeenCalledWith({ count: 0, data: [] });
		});

		test('merges user-provided filter options with required filters', async () => {
			const req = createListQueryReq(user, {
				filter: { name: 'test-workflow' },
				take: 10,
				skip: 5,
			});
			const res = createRes();

			workflowService.getMany.mockResolvedValue({ workflows: [], count: 0 });

			await controller.getMcpEligibleWorkflows(req, res);

			expect(workflowService.getMany).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					filter: expect.objectContaining({
						name: 'test-workflow',
						active: true,
						isArchived: false,
						availableInMCP: false,
						triggerNodeTypes: Object.keys(SUPPORTED_MCP_TRIGGERS),
					}),
					take: 10,
					skip: 5,
				}),
				false,
				false,
				false,
				['workflow:update'],
			);
		});

		test('required filters override user-provided conflicting filters', async () => {
			const req = createListQueryReq(user, {
				filter: {
					active: false,
					isArchived: true,
					availableInMCP: true,
				},
			});
			const res = createRes();

			workflowService.getMany.mockResolvedValue({ workflows: [], count: 0 });

			await controller.getMcpEligibleWorkflows(req, res);

			expect(workflowService.getMany).toHaveBeenCalledWith(
				user,
				expect.objectContaining({
					filter: expect.objectContaining({
						active: true,
						isArchived: false,
						availableInMCP: false,
					}),
				}),
				false,
				false,
				false,
				['workflow:update'],
			);
		});
	});

	describe('toggleWorkflowMCPAccess', () => {
		const user = createUser();
		const workflowId = 'workflow-1';

		const createWebhookNode = (overrides: Partial<INode> = {}): INode => ({
			id: 'node-1',
			name: 'Webhook',
			type: WEBHOOK_NODE_TYPE,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		});

		test('throws when workflow cannot be accessed', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(null);
			const req = createReq({}, { user });

			await expect(
				controller.toggleWorkflowMCPAccess(req, mock<Response>(), workflowId, {
					availableInMCP: true,
				}),
			).rejects.toThrow(
				new NotFoundError(
					'Could not load the workflow - you can only access workflows available to you',
				),
			);
			expect(workflowService.update).not.toHaveBeenCalled();
		});

		test('rejects enabling MCP for inactive workflows', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				createWorkflow({ activeVersionId: null }),
			);

			await expect(
				controller.toggleWorkflowMCPAccess(createReq({}, { user }), mock<Response>(), workflowId, {
					availableInMCP: true,
				}),
			).rejects.toThrow(new BadRequestError('MCP access can only be set for published workflows'));

			expect(workflowService.update).not.toHaveBeenCalled();
		});

		test('allows disabling MCP for inactive workflows', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				createWorkflow({ activeVersionId: null }),
			);
			workflowService.update.mockResolvedValue({
				id: workflowId,
				settings: { saveManualExecutions: true, availableInMCP: false },
				versionId: 'client-version',
			} as unknown as WorkflowEntity);

			const req = createReq({}, { user });

			await controller.toggleWorkflowMCPAccess(req, mock<Response>(), workflowId, {
				availableInMCP: false,
			});

			expect(workflowService.update).toHaveBeenCalledTimes(1);
		});

		test('rejects enabling MCP without active webhook nodes', async () => {
			workflowFinderService.findWorkflowForUser.mockResolvedValue(
				createWorkflow({
					activeVersionId: uuid(),
					nodes: [
						createWebhookNode({ disabled: true }),
						{
							id: 'node-2',
							name: 'HTTP Request',
							type: HTTP_REQUEST_NODE_TYPE,
							typeVersion: 1,
							position: [10, 10],
							parameters: {},
						},
					],
				}),
			);

			await expect(
				controller.toggleWorkflowMCPAccess(createReq({}, { user }), mock<Response>(), workflowId, {
					availableInMCP: true,
				}),
			).rejects.toThrow(
				new BadRequestError(
					'MCP access can only be set for published workflows with one of the following trigger nodes: Schedule Trigger, Webhook Trigger, Form Trigger, Chat Trigger.',
				),
			);

			expect(workflowService.update).not.toHaveBeenCalled();
		});

		test('persists MCP availability when validation passes', async () => {
			const workflow = createWorkflow({
				activeVersionId: uuid(),
				settings: { saveManualExecutions: true },
				nodes: [
					createWebhookNode({ disabled: false }),
					{
						id: 'node-2',
						name: 'HTTP Request',
						type: HTTP_REQUEST_NODE_TYPE,
						typeVersion: 1,
						position: [10, 10],
						parameters: {},
					},
				],
			});
			workflowFinderService.findWorkflowForUser.mockResolvedValue(workflow);
			workflowService.update.mockResolvedValue({
				id: workflowId,
				settings: { saveManualExecutions: true, availableInMCP: true },
				versionId: 'updated-version-id',
			} as unknown as WorkflowEntity);

			const req = createReq({}, { user });
			const response = await controller.toggleWorkflowMCPAccess(req, mock<Response>(), workflowId, {
				availableInMCP: true,
			});

			expect(workflowService.update).toHaveBeenCalledTimes(1);
			const updateArgs = workflowService.update.mock.calls[0];
			expect(updateArgs[0]).toEqual(user);
			expect(updateArgs[1]).toBeInstanceOf(WorkflowEntity);
			expect(updateArgs[1].settings).toEqual({ saveManualExecutions: true, availableInMCP: true });
			expect(updateArgs[1].versionId).toEqual('some-version-id');
			expect(updateArgs[2]).toEqual(workflowId);

			expect(response).toEqual({
				id: workflowId,
				settings: { saveManualExecutions: true, availableInMCP: true },
				versionId: 'updated-version-id',
			});
		});
	});
});
