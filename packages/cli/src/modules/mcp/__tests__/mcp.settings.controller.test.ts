import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { type ApiKey, type AuthenticatedRequest, User, Role } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock, mockDeep } from 'jest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { ListQuery } from '@/requests';
import { WorkflowService } from '@/workflows/workflow.service';

import { UpdateMcpSettingsDto } from '../dto/update-mcp-settings.dto';
import { UpdateWorkflowsAvailabilityDto } from '../dto/update-workflows-availability.dto';
import { McpServerApiKeyService } from '../mcp-api-key.service';
import { McpSettingsController } from '../mcp.settings.controller';
import { McpSettingsService } from '../mcp.settings.service';
import { createWorkflow } from './mock.utils';

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
	const workflowService = mock<WorkflowService>();
	const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>();

	let controller: McpSettingsController;

	beforeEach(() => {
		jest.clearAllMocks();
		instanceSettingsLoaderConfig.mcpManagedByEnv = false;
		Container.set(Logger, logger);
		Container.set(McpSettingsService, mcpSettingsService);
		Container.set(ModuleRegistry, moduleRegistry);
		Container.set(McpServerApiKeyService, mcpServerApiKeyService);
		Container.set(WorkflowService, workflowService);
		Container.set(InstanceSettingsLoaderConfig, instanceSettingsLoaderConfig);
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

		test('rejects updates when MCP settings are managed by env', async () => {
			instanceSettingsLoaderConfig.mcpManagedByEnv = true;
			const req = createReq({ mcpAccessEnabled: true });
			const dto = new UpdateMcpSettingsDto({ mcpAccessEnabled: true });

			await expect(controller.updateSettings(req, createRes(), dto)).rejects.toThrow(
				ForbiddenError,
			);
			expect(mcpSettingsService.setEnabled).not.toHaveBeenCalled();
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
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
						isArchived: false,
						availableInMCP: false,
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
						isArchived: false,
						availableInMCP: false,
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

	describe('toggleWorkflowsMCPAccess', () => {
		const user = createUser();

		test('delegates to mcpSettingsService.bulkSetAvailableInMCP and returns its result', async () => {
			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1', 'wf-2'],
			});
			const bulkResult = {
				updatedCount: 2,
				updatedIds: ['wf-1', 'wf-2'],
				skippedCount: 0,
				failedCount: 0,
				changedWorkflows: [
					{
						workflowId: 'wf-1',
						settings: { availableInMCP: true },
						checksum: 'checksum-wf-1',
					},
					{
						workflowId: 'wf-2',
						settings: { availableInMCP: true },
						checksum: 'checksum-wf-2',
					},
				],
			};
			mcpSettingsService.bulkSetAvailableInMCP.mockResolvedValue(bulkResult);

			const req = createReq({}, { user });
			const result = await controller.toggleWorkflowsMCPAccess(req, mock<Response>(), dto);

			expect(mcpSettingsService.bulkSetAvailableInMCP).toHaveBeenCalledTimes(1);
			expect(mcpSettingsService.bulkSetAvailableInMCP).toHaveBeenCalledWith(user, dto);
			expect(mcpSettingsService.broadcastWorkflowMCPAvailabilityChanged).toHaveBeenCalledWith(
				bulkResult.changedWorkflows,
			);
			expect(result).toEqual({
				updatedCount: 2,
				updatedIds: ['wf-1', 'wf-2'],
				skippedCount: 0,
				failedCount: 0,
			});
		});
	});

	describe('UpdateWorkflowsAvailabilityDto', () => {
		test('requires availableInMCP to be a boolean', () => {
			expect(() => new UpdateWorkflowsAvailabilityDto({} as never)).toThrow();
			expect(
				() => new UpdateWorkflowsAvailabilityDto({ availableInMCP: 'yes' } as never),
			).toThrow();
		});

		test('accepts a valid workflowIds scope', () => {
			const dto = new UpdateWorkflowsAvailabilityDto({
				availableInMCP: true,
				workflowIds: ['wf-1'],
			});
			expect(dto.workflowIds).toEqual(['wf-1']);
			expect(dto.projectId).toBeUndefined();
			expect(dto.folderId).toBeUndefined();
		});

		test('rejects an empty workflowIds array', () => {
			expect(
				() =>
					new UpdateWorkflowsAvailabilityDto({
						availableInMCP: true,
						workflowIds: [],
					}),
			).toThrow();
		});

		test('rejects workflowIds arrays over the cap', () => {
			const workflowIds = Array.from({ length: 101 }, (_, i) => `wf-${i}`);
			expect(
				() =>
					new UpdateWorkflowsAvailabilityDto({
						availableInMCP: true,
						workflowIds,
					}),
			).toThrow();
		});
	});
});
