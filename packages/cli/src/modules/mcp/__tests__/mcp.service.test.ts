import { LicenseState, type Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig, WorkflowsConfig } from '@n8n/config';
import {
	ExecutionRepository,
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
} from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import type { IRun } from 'n8n-workflow';
import { createEmptyRunExecutionData, ManualExecutionCancelledError } from 'n8n-workflow';

jest.mock('@n8n/mcp-apps/server', () => ({
	WORKFLOW_PREVIEW_APP_URI: 'ui://workflow-preview/workflow-preview.html',
	registerWorkflowPreviewApp: jest.fn(),
	registerMcpAppTool: jest.fn(
		(server: { registerTool: (...args: unknown[]) => unknown }, name, config, handler) =>
			server.registerTool(name, config, handler),
	),
}));

import {
	registerMcpAppTool,
	registerWorkflowPreviewApp,
	WORKFLOW_PREVIEW_APP_URI,
} from '@n8n/mcp-apps/server';

import { MCP_APPS_FLAG, MCP_APPS_VARIANT_CONTROL, MCP_APPS_VARIANT_ENABLED } from '@n8n/api-types';

import { MCP_PREVIEW_RENDER_REQUESTED_EVENT } from '../mcp.constants';
import { McpService } from '../mcp.service';
import { NodeCatalogService } from '@/node-catalog';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { ExecutionService } from '@/executions/execution.service';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { TagService } from '@/services/tag.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { WorkflowService } from '@/workflows/workflow.service';

describe('McpService', () => {
	let mcpService: McpService;
	let activeExecutions: ActiveExecutions;
	let executionsConfig: ExecutionsConfig;
	let instanceSettings: InstanceSettings;
	let logger: Logger;

	beforeEach(() => {
		activeExecutions = mockInstance(ActiveExecutions);
		executionsConfig = mockInstance(ExecutionsConfig, {
			mode: 'regular',
		});
		instanceSettings = mockInstance(InstanceSettings, {
			hostId: 'test-host-id',
			instanceId: 'test-instance-id',
		});
		logger = mockLogger();

		mcpService = new McpService(
			logger,
			executionsConfig,
			instanceSettings,
			mockInstance(WorkflowFinderService),
			mockInstance(WorkflowService),
			mockInstance(UrlService),
			mockInstance(CredentialsService),
			activeExecutions,
			mockInstance(GlobalConfig, {
				endpoints: { webhook: '/webhook', webhookTest: '/webhook-test' },
			}),
			mockInstance(Telemetry),
			mockInstance(WorkflowRunner),
			mockInstance(RoleService),
			mockInstance(ProjectService),
			mockInstance(NodeCatalogService),
			mockInstance(WorkflowCreationService),
			mockInstance(NodeTypes),
			mockInstance(ProjectRepository),
			mockInstance(FolderRepository),
			mockInstance(SharedWorkflowRepository),
			mockInstance(ExecutionRepository),
			mockInstance(ExecutionService),
			mockInstance(DataTableProxyService),
			mockInstance(CollaborationService),
			mockInstance(NodeResourceExplorerService),
			mockInstance(TagService),
			mockInstance(LicenseState),
			mockInstance(PostHogClient),
			mockInstance(WorkflowsConfig),
			mockInstance(WorkflowPublishedDataService),
			mockInstance(SubworkflowPolicyChecker),
		);
	});

	describe('Queue Mode Detection', () => {
		it('should return false for isQueueMode when mode is regular', () => {
			expect(mcpService.isQueueMode).toBe(false);
		});

		it('should return true for isQueueMode when mode is queue', () => {
			// Create a new service with queue mode enabled
			const queueExecutionsConfig = mockInstance(ExecutionsConfig, {
				mode: 'queue',
			});

			const queueMcpService = new McpService(
				mockLogger(),
				queueExecutionsConfig,
				instanceSettings,
				mockInstance(WorkflowFinderService),
				mockInstance(WorkflowService),
				mockInstance(UrlService),
				mockInstance(CredentialsService),
				activeExecutions,
				mockInstance(GlobalConfig, {
					endpoints: { webhook: '/webhook', webhookTest: '/webhook-test' },
				}),
				mockInstance(Telemetry),
				mockInstance(WorkflowRunner),
				mockInstance(RoleService),
				mockInstance(ProjectService),
				mockInstance(NodeCatalogService),
				mockInstance(WorkflowCreationService),
				mockInstance(NodeTypes),
				mockInstance(ProjectRepository),
				mockInstance(FolderRepository),
				mockInstance(SharedWorkflowRepository),
				mockInstance(ExecutionRepository),
				mockInstance(ExecutionService),
				mockInstance(DataTableProxyService),
				mockInstance(CollaborationService),
				mockInstance(NodeResourceExplorerService),
				mockInstance(TagService),
				mockInstance(LicenseState),
				mockInstance(PostHogClient),
				mockInstance(WorkflowsConfig),
				mockInstance(WorkflowPublishedDataService),
				mockInstance(SubworkflowPolicyChecker),
			);

			expect(queueMcpService.isQueueMode).toBe(true);
		});
	});

	describe('Pending Response Management', () => {
		describe('createPendingResponse', () => {
			it('should create a pending response with a deferred promise', () => {
				const executionId = 'exec-123';
				const deferred = mcpService.createPendingResponse(executionId);

				expect(deferred).toBeDefined();
				expect(deferred.promise).toBeInstanceOf(Promise);
				expect(deferred.resolve).toBeInstanceOf(Function);
				expect(deferred.reject).toBeInstanceOf(Function);
				expect(mcpService.pendingExecutionCount).toBe(1);
			});

			it('should track multiple pending responses', () => {
				mcpService.createPendingResponse('exec-1');
				mcpService.createPendingResponse('exec-2');
				mcpService.createPendingResponse('exec-3');

				expect(mcpService.pendingExecutionCount).toBe(3);
			});
		});

		describe('handleWorkerResponse', () => {
			it('should resolve pending promise with run data', async () => {
				const executionId = 'exec-456';
				const deferred = mcpService.createPendingResponse(executionId);

				const runData: IRun = {
					status: 'success',
					mode: 'trigger',
					startedAt: new Date(),
					finished: true,
					storedAt: 'db',
					data: createEmptyRunExecutionData(),
				};

				mcpService.handleWorkerResponse(executionId, runData);

				const result = await deferred.promise;
				expect(result).toBe(runData);
				expect(mcpService.pendingExecutionCount).toBe(0);
			});

			it('should resolve pending promise with undefined for failed execution', async () => {
				const executionId = 'exec-789';
				const deferred = mcpService.createPendingResponse(executionId);

				mcpService.handleWorkerResponse(executionId, undefined);

				const result = await deferred.promise;
				expect(result).toBeUndefined();
				expect(mcpService.pendingExecutionCount).toBe(0);
			});

			it('should ignore responses for unknown executions and log warning', () => {
				// Should not throw
				mcpService.handleWorkerResponse('unknown-exec', undefined);
				expect(mcpService.pendingExecutionCount).toBe(0);
				expect(logger.warn).toHaveBeenCalledWith('Received MCP response for unknown execution', {
					executionId: 'unknown-exec',
				});
			});
		});

		describe('removePendingResponse', () => {
			it('should remove a pending response and log debug message', () => {
				const executionId = 'exec-remove';
				mcpService.createPendingResponse(executionId);
				expect(mcpService.pendingExecutionCount).toBe(1);

				mcpService.removePendingResponse(executionId);
				expect(mcpService.pendingExecutionCount).toBe(0);
				expect(logger.debug).toHaveBeenCalledWith('Removed pending MCP response', { executionId });
			});

			it('should handle removing non-existent response gracefully without logging', () => {
				// Should not throw
				mcpService.removePendingResponse('non-existent');
				expect(mcpService.pendingExecutionCount).toBe(0);
				// Should not log debug for non-existent response
				expect(logger.debug).not.toHaveBeenCalledWith(
					'Removed pending MCP response',
					expect.anything(),
				);
			});
		});

		describe('cancelPendingExecution', () => {
			it('should reject pending promise with cancellation error', async () => {
				const executionId = 'exec-cancel';
				const deferred = mcpService.createPendingResponse(executionId);

				// Attach error handler before cancelling to prevent unhandled rejection
				const errorPromise = deferred.promise.catch((error) => error);

				mcpService.cancelPendingExecution(executionId, 'User cancelled');

				const error = await errorPromise;
				expect(error).toBeInstanceOf(ManualExecutionCancelledError);
				expect(mcpService.pendingExecutionCount).toBe(0);
			});

			it('should attempt to stop active execution', async () => {
				const executionId = 'exec-active';
				const deferred = mcpService.createPendingResponse(executionId);
				(activeExecutions.has as jest.Mock).mockReturnValue(true);

				// Attach error handler to prevent unhandled rejection
				deferred.promise.catch(() => {});

				mcpService.cancelPendingExecution(executionId);

				expect(activeExecutions.stopExecution).toHaveBeenCalledWith(
					executionId,
					expect.any(ManualExecutionCancelledError),
				);
			});

			it('should handle cancelling non-existent execution gracefully', () => {
				// Should not throw
				mcpService.cancelPendingExecution('non-existent');
			});
		});

		describe('cancelAllPendingExecutions', () => {
			it('should cancel all pending executions', async () => {
				const deferred1 = mcpService.createPendingResponse('exec-1');
				const deferred2 = mcpService.createPendingResponse('exec-2');
				const deferred3 = mcpService.createPendingResponse('exec-3');

				// Attach error handlers before cancelling to prevent unhandled rejections
				const errorPromise1 = deferred1.promise.catch((error) => error);
				const errorPromise2 = deferred2.promise.catch((error) => error);
				const errorPromise3 = deferred3.promise.catch((error) => error);

				expect(mcpService.pendingExecutionCount).toBe(3);

				mcpService.cancelAllPendingExecutions('Shutdown');

				expect(mcpService.pendingExecutionCount).toBe(0);

				const error1 = await errorPromise1;
				const error2 = await errorPromise2;
				const error3 = await errorPromise3;

				expect(error1).toBeInstanceOf(ManualExecutionCancelledError);
				expect(error2).toBeInstanceOf(ManualExecutionCancelledError);
				expect(error3).toBeInstanceOf(ManualExecutionCancelledError);
			});
		});
	});

	describe('resolveMcpAppsVariant', () => {
		const buildResolutionService = (opts: {
			postHogClient: jest.Mocked<PostHogClient>;
			mcpAppsEnabled?: boolean;
		}) =>
			new McpService(
				mockLogger(),
				executionsConfig,
				instanceSettings,
				mockInstance(WorkflowFinderService),
				mockInstance(WorkflowService),
				mockInstance(UrlService),
				mockInstance(CredentialsService),
				activeExecutions,
				mockInstance(GlobalConfig, {
					endpoints: {
						webhook: '/webhook',
						webhookTest: '/webhook-test',
						mcpAppsEnabled: opts.mcpAppsEnabled ?? false,
					},
				}),
				mockInstance(Telemetry),
				mockInstance(WorkflowRunner),
				mockInstance(RoleService),
				mockInstance(ProjectService),
				mockInstance(NodeCatalogService),
				mockInstance(WorkflowCreationService),
				mockInstance(NodeTypes),
				mockInstance(ProjectRepository),
				mockInstance(FolderRepository),
				mockInstance(SharedWorkflowRepository),
				mockInstance(ExecutionRepository),
				mockInstance(ExecutionService),
				mockInstance(DataTableProxyService),
				mockInstance(CollaborationService),
				mockInstance(NodeResourceExplorerService),
				mockInstance(TagService),
				mockInstance(LicenseState),
				opts.postHogClient,
				mockInstance(WorkflowsConfig),
				mockInstance(WorkflowPublishedDataService),
				mockInstance(SubworkflowPolicyChecker),
			);

		const user = Object.assign(new User(), { id: 'user-1' });

		it('reports `env_override` when the operator force-enables MCP Apps', async () => {
			const postHogClient = mockInstance(PostHogClient);
			const service = buildResolutionService({ postHogClient, mcpAppsEnabled: true });

			await expect(service.resolveMcpAppsVariant(user)).resolves.toEqual({
				enabled: true,
				variant: 'env_override',
			});

			expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
		});

		it('reports `variant` for users in the experiment cohort', async () => {
			const postHogClient = mockInstance(PostHogClient);
			postHogClient.getFeatureFlags.mockResolvedValue({
				[MCP_APPS_FLAG]: MCP_APPS_VARIANT_ENABLED,
			});
			const service = buildResolutionService({ postHogClient });

			await expect(service.resolveMcpAppsVariant(user)).resolves.toEqual({
				enabled: true,
				variant: 'variant',
			});
		});

		it('reports `control` for users in the control cohort', async () => {
			const postHogClient = mockInstance(PostHogClient);
			postHogClient.getFeatureFlags.mockResolvedValue({
				[MCP_APPS_FLAG]: MCP_APPS_VARIANT_CONTROL,
			});
			const service = buildResolutionService({ postHogClient });

			await expect(service.resolveMcpAppsVariant(user)).resolves.toEqual({
				enabled: false,
				variant: 'control',
			});
		});

		it('reports `unassigned` when the flag is missing from the PostHog response', async () => {
			const postHogClient = mockInstance(PostHogClient);
			postHogClient.getFeatureFlags.mockResolvedValue({});
			const service = buildResolutionService({ postHogClient });

			await expect(service.resolveMcpAppsVariant(user)).resolves.toEqual({
				enabled: false,
				variant: 'unassigned',
			});
		});
	});

	describe('getServer', () => {
		it('should create MCP server with registered tools', async () => {
			const user = Object.assign(new User(), { id: 'user-1' });

			const server = await mcpService.getServer(user, false);

			expect(server).toBeDefined();
			// Verify server has expected MCP server methods
			expect(typeof server.connect).toBe('function');
			expect(typeof server.close).toBe('function');
			expect(typeof server.registerTool).toBe('function');
		});

		it('should not register builder tools when mcpBuilderEnabled is false', async () => {
			const user = Object.assign(new User(), { id: 'user-1' });
			const nodeCatalogService = mockInstance(NodeCatalogService);

			const service = new McpService(
				mockLogger(),
				executionsConfig,
				instanceSettings,
				mockInstance(WorkflowFinderService),
				mockInstance(WorkflowService),
				mockInstance(UrlService),
				mockInstance(CredentialsService),
				activeExecutions,
				mockInstance(GlobalConfig, {
					endpoints: {
						webhook: '/webhook',
						webhookTest: '/webhook-test',
						mcpBuilderEnabled: false,
					},
				}),
				mockInstance(Telemetry),
				mockInstance(WorkflowRunner),
				mockInstance(RoleService),
				mockInstance(ProjectService),
				nodeCatalogService,
				mockInstance(WorkflowCreationService),
				mockInstance(NodeTypes),
				mockInstance(ProjectRepository),
				mockInstance(FolderRepository),
				mockInstance(SharedWorkflowRepository),
				mockInstance(ExecutionRepository),
				mockInstance(ExecutionService),
				mockInstance(DataTableProxyService),
				mockInstance(CollaborationService),
				mockInstance(NodeResourceExplorerService),
				mockInstance(TagService),
				mockInstance(LicenseState),
				mockInstance(PostHogClient),
				mockInstance(WorkflowsConfig),
				mockInstance(WorkflowPublishedDataService),
				mockInstance(SubworkflowPolicyChecker),
			);

			const server = await service.getServer(user, false);
			expect(server).toBeDefined();
			// Builder tools service should NOT have been initialized
			expect(nodeCatalogService.initialize).not.toHaveBeenCalled();
		});

		it('should register builder tools when mcpBuilderEnabled is true', async () => {
			const user = Object.assign(new User(), { id: 'user-1' });
			const nodeCatalogService = mockInstance(NodeCatalogService);

			const service = new McpService(
				mockLogger(),
				executionsConfig,
				instanceSettings,
				mockInstance(WorkflowFinderService),
				mockInstance(WorkflowService),
				mockInstance(UrlService),
				mockInstance(CredentialsService),
				activeExecutions,
				mockInstance(GlobalConfig, {
					endpoints: {
						webhook: '/webhook',
						webhookTest: '/webhook-test',
						mcpBuilderEnabled: true,
					},
				}),
				mockInstance(Telemetry),
				mockInstance(WorkflowRunner),
				mockInstance(RoleService),
				mockInstance(ProjectService),
				nodeCatalogService,
				mockInstance(WorkflowCreationService),
				mockInstance(NodeTypes),
				mockInstance(ProjectRepository),
				mockInstance(FolderRepository),
				mockInstance(SharedWorkflowRepository),
				mockInstance(ExecutionRepository),
				mockInstance(ExecutionService),
				mockInstance(DataTableProxyService),
				mockInstance(CollaborationService),
				mockInstance(NodeResourceExplorerService),
				mockInstance(TagService),
				mockInstance(LicenseState),
				mockInstance(PostHogClient),
				mockInstance(WorkflowsConfig),
				mockInstance(WorkflowPublishedDataService),
				mockInstance(SubworkflowPolicyChecker),
			);

			const server = await service.getServer(user, false);
			expect(server).toBeDefined();
			// Builder tools service should have been initialized
			expect(nodeCatalogService.initialize).toHaveBeenCalled();
		});

		describe('MCP Apps integration', () => {
			// Resolution of the MCP Apps flag (PostHog cohort, env override,
			// error fallback) is covered in the `resolveMcpAppsVariant` block.
			// These tests assume the caller (controller) has already resolved
			// the boolean and focus on `getServer`'s tool-registration behavior.
			type BuildServiceOpts = {
				builderEnabled?: boolean;
				diagnosticsEnabled?: boolean;
				instanceBaseUrl?: string;
				postHogClient?: jest.Mocked<PostHogClient>;
				telemetry?: jest.Mocked<Telemetry>;
			};

			const buildService = ({
				builderEnabled = true,
				diagnosticsEnabled = true,
				instanceBaseUrl = 'https://n8n.test',
				postHogClient = mockInstance(PostHogClient),
				telemetry = mockInstance(Telemetry),
			}: BuildServiceOpts = {}) => {
				const urlService = mockInstance(UrlService);
				(urlService.getInstanceBaseUrl as jest.Mock).mockReturnValue(instanceBaseUrl);

				return new McpService(
					mockLogger(),
					executionsConfig,
					instanceSettings,
					mockInstance(WorkflowFinderService),
					mockInstance(WorkflowService),
					urlService,
					mockInstance(CredentialsService),
					activeExecutions,
					mockInstance(GlobalConfig, {
						endpoints: {
							webhook: '/webhook',
							webhookTest: '/webhook-test',
							rest: 'rest',
							mcpBuilderEnabled: builderEnabled,
						},
						diagnostics: {
							enabled: diagnosticsEnabled,
							frontendConfig: 'test-key;https://telemetry.n8n.io',
						},
					}),
					telemetry,
					mockInstance(WorkflowRunner),
					mockInstance(RoleService),
					mockInstance(ProjectService),
					mockInstance(NodeCatalogService),
					mockInstance(WorkflowCreationService),
					mockInstance(NodeTypes),
					mockInstance(ProjectRepository),
					mockInstance(FolderRepository),
					mockInstance(SharedWorkflowRepository),
					mockInstance(ExecutionRepository),
					mockInstance(ExecutionService),
					mockInstance(DataTableProxyService),
					mockInstance(CollaborationService),
					mockInstance(NodeResourceExplorerService),
					mockInstance(TagService),
					mockInstance(LicenseState),
					postHogClient,
					mockInstance(WorkflowsConfig),
					mockInstance(WorkflowPublishedDataService),
					mockInstance(SubworkflowPolicyChecker),
				);
			};

			beforeEach(() => {
				(registerWorkflowPreviewApp as jest.Mock).mockClear();
				(registerMcpAppTool as jest.Mock).mockClear();
			});

			it('registers the workflow preview app and wires it to the create-workflow tool when `mcpAppsEnabled` is true', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				const postHogClient = mockInstance(PostHogClient);

				const service = buildService({ postHogClient });

				await service.getServer(user, true);

				expect(registerWorkflowPreviewApp).toHaveBeenCalledTimes(1);
				expect(registerMcpAppTool).toHaveBeenCalledTimes(1);

				const [, appOptions] = (registerWorkflowPreviewApp as jest.Mock).mock.calls[0] as [
					unknown,
					{
						instanceOrigin: string;
						telemetry: {
							enabled: boolean;
							writeKey: string;
							dataPlaneUrl: string;
							configUrl: string;
							instanceId: string;
							versionCli: string;
						};
					},
				];
				expect(appOptions.instanceOrigin).toBe('https://n8n.test');
				expect(appOptions.telemetry).toEqual(
					expect.objectContaining({
						enabled: true,
						writeKey: 'test-key',
						dataPlaneUrl: 'https://n8n.test/rest/telemetry/proxy',
						configUrl: 'https://n8n.test/rest/telemetry/rudderstack',
						instanceId: 'test-instance-id',
						versionCli: expect.any(String),
					}),
				);

				const [, toolName, toolConfig] = (registerMcpAppTool as jest.Mock).mock.calls[0];
				expect(typeof toolName).toBe('string');
				const meta = (toolConfig as { _meta: { ui: { resourceUri: string } } })._meta;
				expect(meta.ui.resourceUri).toBe(WORKFLOW_PREVIEW_APP_URI);

				// The service trusts the caller's resolution and never falls back to PostHog.
				expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
			});

			it('does not inject write key or telemetry URLs when diagnostics are disabled', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				const service = buildService({ diagnosticsEnabled: false });

				await service.getServer(user, true);

				const [, appOptions] = (registerWorkflowPreviewApp as jest.Mock).mock.calls[0] as [
					unknown,
					{
						instanceOrigin?: string;
						telemetry: {
							enabled: boolean;
							writeKey: string;
							dataPlaneUrl: string;
							configUrl: string;
						};
					},
				];
				expect(appOptions.instanceOrigin).toBeUndefined();
				expect(appOptions.telemetry).toEqual(
					expect.objectContaining({
						enabled: false,
						writeKey: '',
						dataPlaneUrl: '',
						configUrl: '',
					}),
				);
			});

			it('disables app telemetry when the telemetry proxy URL is invalid', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				const service = buildService({ instanceBaseUrl: 'not-a-url' });

				await expect(service.getServer(user, true)).resolves.toBeDefined();

				const [, appOptions] = (registerWorkflowPreviewApp as jest.Mock).mock.calls[0] as [
					unknown,
					{
						instanceOrigin?: string;
						telemetry: {
							enabled: boolean;
							writeKey: string;
							dataPlaneUrl: string;
							configUrl: string;
						};
					},
				];
				expect(appOptions.instanceOrigin).toBeUndefined();
				expect(appOptions.telemetry).toEqual(
					expect.objectContaining({
						enabled: false,
						writeKey: '',
						dataPlaneUrl: '',
						configUrl: '',
					}),
				);
			});

			it('tracks render requested when the preview resource is read', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				const telemetry = mockInstance(Telemetry);

				const service = buildService({ telemetry });
				await service.getServer(user, true, { name: 'Claude Desktop', version: '1.2.3' });

				const [, appOptions] = (registerWorkflowPreviewApp as jest.Mock).mock.calls[0] as [
					unknown,
					{ onResourceRead: () => void },
				];
				appOptions.onResourceRead();

				expect(telemetry.track).toHaveBeenCalledWith(MCP_PREVIEW_RENDER_REQUESTED_EVENT, {
					user_id: 'user-1',
					client_name: 'Claude Desktop',
					client_version: '1.2.3',
				});
			});

			it('does not register MCP apps when `mcpAppsEnabled` is false', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				const postHogClient = mockInstance(PostHogClient);

				const service = buildService({ postHogClient });

				await service.getServer(user, false);

				expect(registerWorkflowPreviewApp).not.toHaveBeenCalled();
				expect(registerMcpAppTool).not.toHaveBeenCalled();
				expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
			});

			it('does not register MCP apps when builder is disabled, even if `mcpAppsEnabled` is true', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				const postHogClient = mockInstance(PostHogClient);

				const service = buildService({ builderEnabled: false, postHogClient });

				await service.getServer(user, true);

				expect(registerWorkflowPreviewApp).not.toHaveBeenCalled();
				expect(registerMcpAppTool).not.toHaveBeenCalled();
				expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
			});
		});
	});
});
