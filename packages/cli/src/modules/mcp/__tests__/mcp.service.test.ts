import { createMcpHandler, type McpServer } from '@modelcontextprotocol/server';
import {
	MCP_APPS_FLAG,
	MCP_APPS_VARIANT_CONTROL,
	MCP_APPS_VARIANT_ENABLED,
	MCP_CANVAS_GROUPS_FLAG,
} from '@n8n/api-types';
import { LicenseState, ModuleRegistry, type Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { ExecutionsConfig, GlobalConfig, WorkflowsConfig } from '@n8n/config';
import { ExecutionRepository, ProjectRepository, SharedWorkflowRepository, User } from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import type { IRun } from 'n8n-workflow';
import { createEmptyRunExecutionData, ManualExecutionCancelledError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';

import { McpPostSaveMetricsService } from '../mcp-post-save-metrics.service';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { EventService } from '@/events/event.service';
import { ExecutionService } from '@/executions/execution.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { DataTableProxyService } from '@/modules/data-table/data-table-proxy.service';
import { NodeCatalogService } from '@/node-catalog';
import { NodeTypes } from '@/node-types';
import { PostHogClient } from '@/posthog';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { FolderFinderService } from '@/services/folder-finder.service';
import { FolderService } from '@/services/folder.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { TagService } from '@/services/tag.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { registerWorkflowPreviewApp, WORKFLOW_PREVIEW_APP_URI } from '@n8n/mcp-apps/server';

import { MCP_PREVIEW_RENDER_REQUESTED_EVENT } from '../mcp.constants';
import { McpService, type McpFeatureFlags } from '../mcp.service';
import type { McpAuthContext, McpClientInfo } from '../mcp.types';

// Keep the real mcpAppToolMeta and constants; only the preview-app
// registration is spied on so its wiring options can be asserted.
vi.mock('@n8n/mcp-apps/server', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/mcp-apps/server')>()),
	registerWorkflowPreviewApp: vi.fn(),
}));

const mockAiGatewayService = () =>
	mockInstance(AiGatewayService, {
		isAvailable: vi.fn().mockResolvedValue({ available: false }),
	});

const mcpFeatureFlags = (overrides: Partial<McpFeatureFlags> = {}): McpFeatureFlags => ({
	mcpApps: { enabled: false, variant: 'unassigned' },
	canvasGroupsEnabled: false,
	...overrides,
});

describe('McpService', () => {
	let mcpService: McpService;
	let activeExecutions: ActiveExecutions;
	let executionsConfig: ExecutionsConfig;
	let instanceSettings: InstanceSettings;
	let logger: Logger;
	let eventService: EventService;

	beforeEach(() => {
		eventService = mockInstance(EventService);
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
			mockInstance(FolderFinderService),
			mockInstance(SharedWorkflowRepository),
			mockInstance(ExecutionRepository),
			mockInstance(ExecutionService),
			mockInstance(DataTableProxyService),
			mockInstance(CollaborationService),
			mockInstance(NodeResourceExplorerService),
			mockInstance(TagService),
			mockInstance(LicenseState),
			mockInstance(PostHogClient),
			mockInstance(WorkflowHistoryService),
			mockInstance(WorkflowsConfig),
			mockInstance(WorkflowPublishedDataService),
			mockInstance(SubworkflowPolicyChecker),
			mockAiGatewayService(),
			mockInstance(McpPostSaveMetricsService),
			mockInstance(ModuleRegistry),
			eventService,
			mockInstance(FolderService),
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
				mockInstance(FolderFinderService),
				mockInstance(SharedWorkflowRepository),
				mockInstance(ExecutionRepository),
				mockInstance(ExecutionService),
				mockInstance(DataTableProxyService),
				mockInstance(CollaborationService),
				mockInstance(NodeResourceExplorerService),
				mockInstance(TagService),
				mockInstance(LicenseState),
				mockInstance(PostHogClient),
				mockInstance(WorkflowHistoryService),
				mockInstance(WorkflowsConfig),
				mockInstance(WorkflowPublishedDataService),
				mockInstance(SubworkflowPolicyChecker),
				mockAiGatewayService(),
				mockInstance(McpPostSaveMetricsService),
				mockInstance(ModuleRegistry),
				mockInstance(EventService),
				mockInstance(FolderService),
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
				(activeExecutions.has as Mock).mockReturnValue(true);

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

	describe('resolveFeatureFlags', () => {
		const buildResolutionService = (opts: {
			postHogClient: Mocked<PostHogClient>;
			mcpAppsEnabled?: boolean;
			mcpCanvasGroupsEnabled?: boolean;
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
						mcpCanvasGroupsEnabled: opts.mcpCanvasGroupsEnabled ?? false,
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
				mockInstance(FolderFinderService),
				mockInstance(SharedWorkflowRepository),
				mockInstance(ExecutionRepository),
				mockInstance(ExecutionService),
				mockInstance(DataTableProxyService),
				mockInstance(CollaborationService),
				mockInstance(NodeResourceExplorerService),
				mockInstance(TagService),
				mockInstance(LicenseState),
				opts.postHogClient,
				mockInstance(WorkflowHistoryService),
				mockInstance(WorkflowsConfig),
				mockInstance(WorkflowPublishedDataService),
				mockInstance(SubworkflowPolicyChecker),
				mockAiGatewayService(),
				mockInstance(McpPostSaveMetricsService),
				mockInstance(ModuleRegistry),
				mockInstance(EventService),
				mockInstance(FolderService),
			);

		const user = Object.assign(new User(), { id: 'user-1' });

		it('resolves every feature with a single PostHog lookup', async () => {
			const postHogClient = mockInstance(PostHogClient);
			postHogClient.getFeatureFlags.mockResolvedValue({
				[MCP_APPS_FLAG]: MCP_APPS_VARIANT_ENABLED,
				[MCP_CANVAS_GROUPS_FLAG]: true,
			});
			const service = buildResolutionService({ postHogClient });

			await expect(service.resolveFeatureFlags(user)).resolves.toEqual({
				mcpApps: { enabled: true, variant: 'variant' },
				canvasGroupsEnabled: true,
			});

			expect(postHogClient.getFeatureFlags).toHaveBeenCalledTimes(1);
		});

		describe('MCP Apps', () => {
			it('reports `env_override` when the operator force-enables MCP Apps', async () => {
				const postHogClient = mockInstance(PostHogClient);
				postHogClient.getFeatureFlags.mockResolvedValue({});
				const service = buildResolutionService({ postHogClient, mcpAppsEnabled: true });

				await expect(service.resolveFeatureFlags(user)).resolves.toMatchObject({
					mcpApps: { enabled: true, variant: 'env_override' },
				});
			});

			it('reports `variant` for users in the experiment cohort', async () => {
				const postHogClient = mockInstance(PostHogClient);
				postHogClient.getFeatureFlags.mockResolvedValue({
					[MCP_APPS_FLAG]: MCP_APPS_VARIANT_ENABLED,
				});
				const service = buildResolutionService({ postHogClient });

				await expect(service.resolveFeatureFlags(user)).resolves.toMatchObject({
					mcpApps: { enabled: true, variant: 'variant' },
				});
			});

			it('reports `control` for users in the control cohort', async () => {
				const postHogClient = mockInstance(PostHogClient);
				postHogClient.getFeatureFlags.mockResolvedValue({
					[MCP_APPS_FLAG]: MCP_APPS_VARIANT_CONTROL,
				});
				const service = buildResolutionService({ postHogClient });

				await expect(service.resolveFeatureFlags(user)).resolves.toMatchObject({
					mcpApps: { enabled: false, variant: 'control' },
				});
			});

			it('reports `unassigned` when the flag is missing from the PostHog response', async () => {
				const postHogClient = mockInstance(PostHogClient);
				postHogClient.getFeatureFlags.mockResolvedValue({});
				const service = buildResolutionService({ postHogClient });

				await expect(service.resolveFeatureFlags(user)).resolves.toMatchObject({
					mcpApps: { enabled: false, variant: 'unassigned' },
				});
			});
		});

		describe('canvas groups', () => {
			it('enables canvas groups for users with the boolean flag set', async () => {
				const postHogClient = mockInstance(PostHogClient);
				postHogClient.getFeatureFlags.mockResolvedValue({ [MCP_CANVAS_GROUPS_FLAG]: true });
				const service = buildResolutionService({ postHogClient });

				await expect(service.resolveFeatureFlags(user)).resolves.toMatchObject({
					canvasGroupsEnabled: true,
				});
			});

			it('keeps canvas groups disabled when the flag is missing', async () => {
				const postHogClient = mockInstance(PostHogClient);
				postHogClient.getFeatureFlags.mockResolvedValue({});
				const service = buildResolutionService({ postHogClient });

				await expect(service.resolveFeatureFlags(user)).resolves.toMatchObject({
					canvasGroupsEnabled: false,
				});
			});

			it('treats non-boolean flag values as disabled', async () => {
				const postHogClient = mockInstance(PostHogClient);
				postHogClient.getFeatureFlags.mockResolvedValue({ [MCP_CANVAS_GROUPS_FLAG]: 'variant' });
				const service = buildResolutionService({ postHogClient });

				await expect(service.resolveFeatureFlags(user)).resolves.toMatchObject({
					canvasGroupsEnabled: false,
				});
			});

			it('enables canvas groups when the operator force-enables them', async () => {
				const postHogClient = mockInstance(PostHogClient);
				postHogClient.getFeatureFlags.mockResolvedValue({});
				const service = buildResolutionService({ postHogClient, mcpCanvasGroupsEnabled: true });

				await expect(service.resolveFeatureFlags(user)).resolves.toMatchObject({
					canvasGroupsEnabled: true,
				});
			});
		});

		it('still queries PostHog when only some features are env-overridden', async () => {
			const postHogClient = mockInstance(PostHogClient);
			postHogClient.getFeatureFlags.mockResolvedValue({ [MCP_CANVAS_GROUPS_FLAG]: true });
			const service = buildResolutionService({ postHogClient, mcpAppsEnabled: true });

			await expect(service.resolveFeatureFlags(user)).resolves.toEqual({
				mcpApps: { enabled: true, variant: 'env_override' },
				canvasGroupsEnabled: true,
			});

			expect(postHogClient.getFeatureFlags).toHaveBeenCalledTimes(1);
		});

		it('skips the PostHog lookup when every feature is env-overridden', async () => {
			const postHogClient = mockInstance(PostHogClient);
			const service = buildResolutionService({
				postHogClient,
				mcpAppsEnabled: true,
				mcpCanvasGroupsEnabled: true,
			});

			await expect(service.resolveFeatureFlags(user)).resolves.toEqual({
				mcpApps: { enabled: true, variant: 'env_override' },
				canvasGroupsEnabled: true,
			});

			expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
		});
	});

	describe('getServer', () => {
		it('should create MCP server with registered tools', async () => {
			const user = Object.assign(new User(), { id: 'user-1' });

			const server = await mcpService.getServer(user, mcpFeatureFlags());

			expect(server).toBeDefined();
			// Verify server has expected MCP server methods
			expect(typeof server.connect).toBe('function');
			expect(typeof server.close).toBe('function');
			expect(typeof server.registerTool).toBe('function');
		});

		describe('protocol serving through createMcpHandler', () => {
			const sseData = (text: string): Array<Record<string, unknown>> =>
				text
					.split('\n')
					.filter((line) => line.startsWith('data: '))
					.map((line) => JSON.parse(line.slice(6)) as Record<string, unknown>);

			const buildHandler = async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				return createMcpHandler(async () => await mcpService.getServer(user, mcpFeatureFlags()), {
					legacy: 'stateless',
				});
			};

			it('serves tools/list to a 2026-07-28 client with bridged JSON schemas', async () => {
				const handler = await buildHandler();

				const res = await handler.fetch(
					new Request('http://n8n.local/mcp-server/http', {
						method: 'POST',
						headers: {
							'content-type': 'application/json',
							accept: 'application/json, text/event-stream',
							'mcp-method': 'tools/list',
						},
						body: JSON.stringify({
							jsonrpc: '2.0',
							id: 1,
							method: 'tools/list',
							params: {
								_meta: {
									'io.modelcontextprotocol/protocolVersion': '2026-07-28',
									'io.modelcontextprotocol/clientCapabilities': {},
									'io.modelcontextprotocol/clientInfo': { name: 'vitest', version: '1.0.0' },
								},
							},
						}),
					}),
				);

				expect(res.status).toBe(200);
				const body = (await res.json()) as {
					result: {
						resultType: string;
						tools: Array<{ name: string; inputSchema?: Record<string, unknown> }>;
					};
				};
				expect(body.result.resultType).toBe('complete');

				const toolNames = body.result.tools.map((tool) => tool.name);
				expect(toolNames).toContain('search_workflows');

				const searchTool = body.result.tools.find((tool) => tool.name === 'search_workflows');
				expect(searchTool?.inputSchema).toMatchObject({
					type: 'object',
					properties: expect.objectContaining({
						query: expect.objectContaining({ type: 'string' }),
					}),
				});
			});

			it('serves a 2025-era client through the stateless legacy fallback', async () => {
				const handler = await buildHandler();

				const res = await handler.fetch(
					new Request('http://n8n.local/mcp-server/http', {
						method: 'POST',
						headers: {
							'content-type': 'application/json',
							accept: 'application/json, text/event-stream',
						},
						body: JSON.stringify({
							jsonrpc: '2.0',
							id: 1,
							method: 'initialize',
							params: {
								protocolVersion: '2025-06-18',
								capabilities: {},
								clientInfo: { name: 'old-client', version: '1.0.0' },
							},
						}),
					}),
				);

				expect(res.status).toBe(200);
				// Framing change against the 1.x stateless transport: the v2 handler
				// answers legacy requests with spec-standard SSE framing instead of a
				// plain JSON body. Spec-conforming clients accept both (they send
				// `Accept: application/json, text/event-stream`).
				expect(res.headers.get('content-type')).toContain('text/event-stream');

				const [message] = sseData(await res.text());
				const result = (message as { result: Record<string, unknown> }).result;
				expect(result.protocolVersion).toBe('2025-06-18');
				expect(result.serverInfo).toMatchObject({ name: 'n8n MCP Server' });
			});
		});

		const mcpUser = () =>
			Object.assign(new User(), {
				id: 'user-1',
				email: 'u@n8n.io',
				firstName: 'U',
				lastName: 'One',
				role: { slug: 'global:member' },
			});

		// Registration goes through the service's registrar (the production
		// chokepoint), which bridges schemas and wraps handlers with the
		// mcp-tool-called instrumentation under test here.
		const registerAndInvoke = async (
			server: McpServer,
			name: string,
			impl: () => Promise<unknown>,
			args: Record<string, unknown> = {},
			{ clientInfo, auth }: { clientInfo?: McpClientInfo; auth?: McpAuthContext } = {},
		) => {
			const registerTool = mcpService.createToolRegistrar(server, mcpUser(), clientInfo, auth);
			const registered = registerTool({
				name,
				config: { description: 'test' },
				handler: impl as never,
			});
			const invokeTool = registered.handler as (args: unknown, extra: unknown) => Promise<unknown>;
			return await invokeTool(args, {});
		};

		it('should emit `mcp-tool-called` with the target workflow on tool success', async () => {
			const user = mcpUser();
			const server = await mcpService.getServer(user, mcpFeatureFlags());

			await registerAndInvoke(
				server,
				'my_tool',
				async () => ({ content: [{ type: 'text', text: 'ok' }] }),
				{ workflowId: 'wf-42' },
			);

			expect(eventService.emit).toHaveBeenCalledWith('mcp-tool-called', {
				user,
				toolName: 'my_tool',
				workflowId: 'wf-42',
				status: 'success',
				errorMessage: undefined,
				clientName: undefined,
			});
		});

		it('should emit `mcp-tool-called` with the workflow reported in the structured output', async () => {
			// `create_workflow_from_code` takes no `workflowId` argument — the
			// workflow it created is only in the result.
			const server = await mcpService.getServer(mcpUser(), mcpFeatureFlags());

			const output = { workflowId: 'wf-new', workflowName: 'My workflow' };
			await registerAndInvoke(server, 'creating_tool', async () => ({
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			}));

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({
					toolName: 'creating_tool',
					workflowId: 'wf-new',
					status: 'success',
				}),
			);
		});

		it('should prefer the requested workflow over the one in the structured output', async () => {
			const server = await mcpService.getServer(mcpUser(), mcpFeatureFlags());

			await registerAndInvoke(
				server,
				'updating_tool',
				async () => ({
					content: [{ type: 'text', text: 'ok' }],
					structuredContent: { workflowId: 'wf-other' },
				}),
				{ workflowId: 'wf-42' },
			);

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({ toolName: 'updating_tool', workflowId: 'wf-42' }),
			);
		});

		it('should emit `mcp-tool-called` with error status when a tool throws', async () => {
			const user = mcpUser();
			const server = await mcpService.getServer(user, mcpFeatureFlags());

			await expect(
				registerAndInvoke(server, 'err_tool', async () => {
					throw new Error('boom');
				}),
			).rejects.toThrow('boom');

			expect(eventService.emit).toHaveBeenCalledWith('mcp-tool-called', {
				user,
				toolName: 'err_tool',
				workflowId: undefined,
				status: 'error',
				errorMessage: 'boom',
				clientName: undefined,
			});
		});

		it('should emit error status and message when a tool returns `isError: true`', async () => {
			const server = await mcpService.getServer(mcpUser(), mcpFeatureFlags());

			const output = { data: [], count: 0, error: 'not allowed' };
			await registerAndInvoke(server, 'handled_tool', async () => ({
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			}));

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({
					toolName: 'handled_tool',
					status: 'error',
					errorMessage: 'not allowed',
				}),
			);
		});

		it('should emit error status when a tool reports failure via `structuredContent.status`', async () => {
			// `execute_workflow` returns handled failures as `status: 'error'` in its
			// structured output without setting `isError`.
			const server = await mcpService.getServer(mcpUser(), mcpFeatureFlags());

			const output = { executionId: null, status: 'error', error: 'no published version' };
			await registerAndInvoke(
				server,
				'status_err_tool',
				async () => ({
					content: [{ type: 'text', text: JSON.stringify(output) }],
					structuredContent: output,
				}),
				{ workflowId: 'wf-42' },
			);

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({
					toolName: 'status_err_tool',
					workflowId: 'wf-42',
					status: 'error',
					errorMessage: 'no published version',
				}),
			);
		});

		it('should emit error status when a handled failure is marked only by `structuredContent.error`', async () => {
			// `get_execution` catches its own errors and returns a normal result
			// whose only failure marker is the `error` message string.
			const server = await mcpService.getServer(mcpUser(), mcpFeatureFlags());

			const output = { execution: null, error: 'Execution not found' };
			await registerAndInvoke(server, 'error_only_tool', async () => ({
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			}));

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({
					toolName: 'error_only_tool',
					status: 'error',
					errorMessage: 'Execution not found',
				}),
			);
		});

		it('should fall back to text content for the error message when structured output has none', async () => {
			const server = await mcpService.getServer(mcpUser(), mcpFeatureFlags());

			await registerAndInvoke(server, 'text_err_tool', async () => ({
				content: [{ type: 'text', text: 'plain failure' }],
				isError: true,
			}));

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({
					toolName: 'text_err_tool',
					status: 'error',
					errorMessage: 'plain failure',
				}),
			);
		});

		it('should emit `mcp-tool-called` with the calling user and OAuth client', async () => {
			// `clientId` is the client the OAuth token was issued to, so usage can be
			// attributed per client. `clientName` is only what the client calls itself.
			const user = mcpUser();
			const server = await mcpService.getServer(user, mcpFeatureFlags());

			await registerAndInvoke(
				server,
				'my_tool',
				async () => ({ content: [{ type: 'text', text: 'ok' }] }),
				{},
				{
					clientInfo: { name: 'Claude', version: '1.2.3' },
					auth: {
						grantedScopes: undefined,
						caller: { authType: 'oauth', clientId: 'client-abc' },
					},
				},
			);

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({
					user,
					toolName: 'my_tool',
					authType: 'oauth',
					clientId: 'client-abc',
					clientName: 'Claude',
				}),
			);
		});

		it('should emit `mcp-tool-called` with the OAuth client when a tool fails', async () => {
			const server = await mcpService.getServer(mcpUser(), mcpFeatureFlags());

			await expect(
				registerAndInvoke(
					server,
					'err_tool',
					async () => {
						throw new Error('boom');
					},
					{},
					{
						auth: {
							grantedScopes: undefined,
							caller: { authType: 'oauth', clientId: 'client-abc' },
						},
					},
				),
			).rejects.toThrow('boom');

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({
					toolName: 'err_tool',
					status: 'error',
					authType: 'oauth',
					clientId: 'client-abc',
				}),
			);
		});

		it('should pass the resolved auth through to every tool the server registers', async () => {
			const user = mcpUser();
			const registrarSpy = vi.spyOn(mcpService, 'createToolRegistrar');
			const auth = {
				grantedScopes: undefined,
				caller: { authType: 'oauth' as const, clientId: 'client-abc' },
			};

			await mcpService.getServer(user, mcpFeatureFlags(), { name: 'Cursor' }, auth);

			expect(registrarSpy).toHaveBeenCalledWith(expect.anything(), user, { name: 'Cursor' }, auth);
		});

		it('should report an API-key call as such, with no OAuth client', async () => {
			// One MCP API key exists per user, so there is no client to name and no
			// per-key identifier worth reporting beyond the user itself.
			const server = await mcpService.getServer(mcpUser(), mcpFeatureFlags());

			await registerAndInvoke(
				server,
				'my_tool',
				async () => ({ content: [{ type: 'text', text: 'ok' }] }),
				{},
				{ auth: { grantedScopes: undefined, caller: { authType: 'api_key' } } },
			);

			expect(eventService.emit).toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({ authType: 'api_key' }),
			);
			expect(eventService.emit).not.toHaveBeenCalledWith(
				'mcp-tool-called',
				expect.objectContaining({ clientId: expect.anything() }),
			);
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
				mockInstance(FolderFinderService),
				mockInstance(SharedWorkflowRepository),
				mockInstance(ExecutionRepository),
				mockInstance(ExecutionService),
				mockInstance(DataTableProxyService),
				mockInstance(CollaborationService),
				mockInstance(NodeResourceExplorerService),
				mockInstance(TagService),
				mockInstance(LicenseState),
				mockInstance(PostHogClient),
				mockInstance(WorkflowHistoryService),
				mockInstance(WorkflowsConfig),
				mockInstance(WorkflowPublishedDataService),
				mockInstance(SubworkflowPolicyChecker),
				mockAiGatewayService(),
				mockInstance(McpPostSaveMetricsService),
				mockInstance(ModuleRegistry),
				mockInstance(EventService),
				mockInstance(FolderService),
			);

			const server = await service.getServer(user, mcpFeatureFlags());
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
				mockInstance(FolderFinderService),
				mockInstance(SharedWorkflowRepository),
				mockInstance(ExecutionRepository),
				mockInstance(ExecutionService),
				mockInstance(DataTableProxyService),
				mockInstance(CollaborationService),
				mockInstance(NodeResourceExplorerService),
				mockInstance(TagService),
				mockInstance(LicenseState),
				mockInstance(PostHogClient),
				mockInstance(WorkflowHistoryService),
				mockInstance(WorkflowsConfig),
				mockInstance(WorkflowPublishedDataService),
				mockInstance(SubworkflowPolicyChecker),
				mockAiGatewayService(),
				mockInstance(McpPostSaveMetricsService),
				mockInstance(ModuleRegistry),
				mockInstance(EventService),
				mockInstance(FolderService),
			);

			const server = await service.getServer(user, mcpFeatureFlags());
			expect(server).toBeDefined();
			// Builder tools service should have been initialized
			expect(nodeCatalogService.initialize).toHaveBeenCalled();
		});

		describe('MCP Apps integration', () => {
			// Resolution of the MCP Apps flag (PostHog cohort, env override,
			// error fallback) is covered in the `resolveFeatureFlags` block.
			// These tests assume the caller (controller) has already resolved
			// the flags and focus on `getServer`'s tool-registration behavior.
			const appsEnabled = mcpFeatureFlags({ mcpApps: { enabled: true, variant: 'variant' } });
			type BuildServiceOpts = {
				builderEnabled?: boolean;
				diagnosticsEnabled?: boolean;
				instanceBaseUrl?: string;
				postHogClient?: Mocked<PostHogClient>;
				telemetry?: Mocked<Telemetry>;
			};

			const buildService = ({
				builderEnabled = true,
				diagnosticsEnabled = true,
				instanceBaseUrl = 'https://n8n.test',
				postHogClient = mockInstance(PostHogClient),
				telemetry = mockInstance(Telemetry),
			}: BuildServiceOpts = {}) => {
				const urlService = mockInstance(UrlService);
				(urlService.getInstanceBaseUrl as Mock).mockReturnValue(instanceBaseUrl);

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
					mockInstance(FolderFinderService),
					mockInstance(SharedWorkflowRepository),
					mockInstance(ExecutionRepository),
					mockInstance(ExecutionService),
					mockInstance(DataTableProxyService),
					mockInstance(CollaborationService),
					mockInstance(NodeResourceExplorerService),
					mockInstance(TagService),
					mockInstance(LicenseState),
					postHogClient,
					mockInstance(WorkflowHistoryService),
					mockInstance(WorkflowsConfig),
					mockInstance(WorkflowPublishedDataService),
					mockInstance(SubworkflowPolicyChecker),
					mockAiGatewayService(),
					mockInstance(McpPostSaveMetricsService),
					mockInstance(ModuleRegistry),
					mockInstance(EventService),
					mockInstance(FolderService),
				);
			};

			const registeredCreateTool = (server: unknown) =>
				(
					server as {
						_registeredTools: Record<string, { _meta?: Record<string, unknown> } | undefined>;
					}
				)._registeredTools.create_workflow_from_code;

			beforeEach(() => {
				(registerWorkflowPreviewApp as Mock).mockClear();
			});

			it('registers the preview app and marks the create tool with the app resource when MCP Apps is enabled', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				const postHogClient = mockInstance(PostHogClient);

				const service = buildService({ postHogClient });
				const server = await service.getServer(user, appsEnabled);

				expect(registerWorkflowPreviewApp).toHaveBeenCalledTimes(1);
				const [, appOptions] = (registerWorkflowPreviewApp as Mock).mock.calls[0] as [
					unknown,
					{
						instanceOrigin: string;
						telemetry: Record<string, unknown>;
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

				expect(registeredCreateTool(server)?._meta).toMatchObject({
					ui: { resourceUri: WORKFLOW_PREVIEW_APP_URI },
				});

				// The service trusts the caller's resolution and never falls back to PostHog.
				expect(postHogClient.getFeatureFlags).not.toHaveBeenCalled();
			});

			it('does not inject write key or telemetry URLs when diagnostics are disabled', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });
				const service = buildService({ diagnosticsEnabled: false });

				await service.getServer(user, appsEnabled);

				const [, appOptions] = (registerWorkflowPreviewApp as Mock).mock.calls[0] as [
					unknown,
					{ instanceOrigin?: string; telemetry: Record<string, unknown> },
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

				await expect(service.getServer(user, appsEnabled)).resolves.toBeDefined();

				const [, appOptions] = (registerWorkflowPreviewApp as Mock).mock.calls[0] as [
					unknown,
					{ instanceOrigin?: string; telemetry: Record<string, unknown> },
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
				await service.getServer(user, appsEnabled, { name: 'Claude Desktop', version: '1.2.3' });

				const [, appOptions] = (registerWorkflowPreviewApp as Mock).mock.calls[0] as [
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

			it('does not register the preview app when MCP Apps is disabled', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });

				const server = await buildService().getServer(user, mcpFeatureFlags());

				expect(registerWorkflowPreviewApp).not.toHaveBeenCalled();
				expect(registeredCreateTool(server)?._meta).toBeUndefined();
			});

			it('does not register the preview app when builder is disabled, even if MCP Apps is enabled', async () => {
				const user = Object.assign(new User(), { id: 'user-1' });

				await buildService({ builderEnabled: false }).getServer(user, appsEnabled);

				expect(registerWorkflowPreviewApp).not.toHaveBeenCalled();
			});
		});
	});
});
