import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { ProjectRepository, SharedWorkflowRepository, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import {
	createDeferredPromise,
	ManualExecutionCancelledError,
	type IDeferredPromise,
	type IRun,
} from 'n8n-workflow';

import { createExecuteWorkflowTool } from './tools/execute-workflow.tool';
import { createWorkflowDetailsTool } from './tools/get-workflow-details.tool';
import { createSearchWorkflowsTool } from './tools/search-workflows.tool';
import { createCreateWorkflowFromCodeTool } from './tools/workflow-builder/create-workflow-from-code.tool';
import { createArchiveWorkflowTool } from './tools/workflow-builder/delete-workflow.tool';
import { createUpdateWorkflowTool } from './tools/workflow-builder/update-workflow.tool';
import { createGetSuggestedWorkflowNodesTool } from './tools/workflow-builder/get-suggested-workflow-nodes.tool';
import { createGetWorkflowNodeTypesTool } from './tools/workflow-builder/get-workflow-node-types.tool';
import { createGetWorkflowSdkReferenceTool } from './tools/workflow-builder/get-workflow-sdk-reference.tool';
import { getMcpInstructions } from './tools/workflow-builder/mcp-instructions';
import { createSearchWorkflowNodesTool } from './tools/workflow-builder/search-workflow-nodes.tool';
import { getSdkReferenceContent } from './tools/workflow-builder/sdk-reference-content';
import { createValidateWorkflowCodeTool } from './tools/workflow-builder/validate-workflow-code.tool';
import { WorkflowBuilderToolsService } from './tools/workflow-builder/workflow-builder-tools.service';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { NodeTypes } from '@/node-types';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

/**
 * Pending MCP execution response, used for queue mode support.
 */
interface PendingMcpResponse {
	executionId: string;
	promise: IDeferredPromise<IRun | undefined>;
	createdAt: Date;
}

@Service()
export class McpService {
	/**
	 * Map of execution ID to pending response promise.
	 * Used in queue mode to wait for worker responses.
	 */
	private readonly pendingResponses = new Map<string, PendingMcpResponse>();

	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		_instanceSettings: InstanceSettings,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
		private readonly urlService: UrlService,
		private readonly credentialsService: CredentialsService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly globalConfig: GlobalConfig,
		private readonly telemetry: Telemetry,
		private readonly workflowRunner: WorkflowRunner,
		private readonly roleService: RoleService,
		private readonly projectService: ProjectService,
		private readonly workflowBuilderToolsService: WorkflowBuilderToolsService,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly nodeTypes: NodeTypes,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async getServer(user: User) {
		const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
		const builderEnabled = this.globalConfig.endpoints.mcpBuilderEnabled;
		const server = new McpServer(
			{
				name: 'n8n MCP Server',
				version: builderEnabled ? '1.1.0' : '1.0.0',
			},
			{
				instructions: getMcpInstructions(builderEnabled),
			},
		);

		// Existing tools
		const workflowSearchTool = createSearchWorkflowsTool(
			user,
			this.workflowService,
			this.telemetry,
		);
		server.registerTool(
			workflowSearchTool.name,
			workflowSearchTool.config,
			workflowSearchTool.handler,
		);

		const executeWorkflowTool = createExecuteWorkflowTool(
			user,
			this.workflowFinderService,
			this.activeExecutions,
			this.workflowRunner,
			this.telemetry,
			this,
		);
		server.registerTool(
			executeWorkflowTool.name,
			executeWorkflowTool.config,
			executeWorkflowTool.handler,
		);

		const workflowDetailsTool = createWorkflowDetailsTool(
			user,
			this.urlService.getWebhookBaseUrl(),
			this.workflowFinderService,
			this.credentialsService,
			{
				webhook: this.globalConfig.endpoints.webhook,
				webhookTest: this.globalConfig.endpoints.webhookTest,
			},
			this.telemetry,
			this.roleService,
			this.projectService,
		);
		server.registerTool(
			workflowDetailsTool.name,
			workflowDetailsTool.config,
			workflowDetailsTool.handler,
		);

		// Workflow builder tools (enabled via N8N_MCP_BUILDER_ENABLED)
		if (builderEnabled) {
			await this.registerBuilderTools(server, user);
		}

		return server;
	}

	private async registerBuilderTools(server: InstanceType<typeof McpServer>, user: User) {
		await this.workflowBuilderToolsService.initialize();

		const searchNodesTool = createSearchWorkflowNodesTool(
			user,
			this.workflowBuilderToolsService,
			this.telemetry,
		);
		server.registerTool(searchNodesTool.name, searchNodesTool.config, searchNodesTool.handler);

		const getNodeTypesTool = createGetWorkflowNodeTypesTool(
			user,
			this.workflowBuilderToolsService,
			this.telemetry,
		);
		server.registerTool(getNodeTypesTool.name, getNodeTypesTool.config, getNodeTypesTool.handler);

		const suggestedNodesTool = createGetSuggestedWorkflowNodesTool(
			user,
			this.workflowBuilderToolsService,
			this.telemetry,
		);
		server.registerTool(
			suggestedNodesTool.name,
			suggestedNodesTool.config,
			suggestedNodesTool.handler,
		);

		const validateTool = createValidateWorkflowCodeTool(user, this.telemetry);
		server.registerTool(validateTool.name, validateTool.config, validateTool.handler);

		const createTool = createCreateWorkflowFromCodeTool(
			user,
			this.workflowCreationService,
			this.urlService,
			this.telemetry,
			this.nodeTypes,
			this.credentialsService,
			this.projectRepository,
		);
		server.registerTool(createTool.name, createTool.config, createTool.handler);

		const archiveTool = createArchiveWorkflowTool(user, this.workflowService, this.telemetry);
		server.registerTool(archiveTool.name, archiveTool.config, archiveTool.handler);

		const updateTool = createUpdateWorkflowTool(
			user,
			this.workflowFinderService,
			this.workflowService,
			this.urlService,
			this.telemetry,
			this.nodeTypes,
			this.credentialsService,
			this.sharedWorkflowRepository,
		);
		server.registerTool(updateTool.name, updateTool.config, updateTool.handler);

		// SDK reference as MCP resource — preferred over the tool for clients that support resources.
		server.resource(
			'workflow-sdk-reference',
			'n8n://workflow-sdk/reference',
			{
				description:
					'n8n Workflow SDK reference — patterns, expressions, and rules for building workflows',
			},
			async () => ({
				contents: [
					{
						uri: 'n8n://workflow-sdk/reference',
						mimeType: 'text/plain',
						text: getSdkReferenceContent(),
					},
				],
			}),
		);

		// SDK reference tool — serves as a fallback for clients that don't support MCP resources.
		// Registered as disabled; enabled after initialization only if the client lacks resource support.
		const sdkRefTool = createGetWorkflowSdkReferenceTool(user, this.telemetry);
		const registeredSdkRefTool = server.registerTool(
			sdkRefTool.name,
			sdkRefTool.config,
			sdkRefTool.handler,
		);
		registeredSdkRefTool.disable();

		// After initialization, enable the SDK reference tool only if the client
		// does not support resources. Clients with resource support get the same
		// content via the MCP resource registered above, making the tool redundant.
		server.server.oninitialized = () => {
			const capabilities = server.server.getClientCapabilities();
			if (!capabilities || !('resources' in capabilities)) {
				registeredSdkRefTool.enable();
			}
		};
	}

	// #region Queue Mode Support

	/**
	 * Whether n8n is running in queue mode.
	 */
	get isQueueMode(): boolean {
		return this.executionsConfig.mode === 'queue';
	}

	/**
	 * Create a pending response for an MCP execution in queue mode.
	 * Returns a promise that will be resolved when the worker sends the response.
	 */
	createPendingResponse(executionId: string): IDeferredPromise<IRun | undefined> {
		const deferred = createDeferredPromise<IRun | undefined>();
		this.pendingResponses.set(executionId, {
			executionId,
			promise: deferred,
			createdAt: new Date(),
		});

		return deferred;
	}

	/**
	 * Handle a response from a worker for an MCP execution.
	 * Called by ScalingService when it receives an mcp-response message.
	 */
	handleWorkerResponse(executionId: string, runData: IRun | undefined): void {
		const pending = this.pendingResponses.get(executionId);
		if (!pending) {
			this.logger.warn('Received MCP response for unknown execution', { executionId });
			return;
		}

		pending.promise.resolve(runData);
		this.pendingResponses.delete(executionId);
	}

	/**
	 * Clean up a pending response (e.g., on timeout or cancellation).
	 */
	removePendingResponse(executionId: string): void {
		if (this.pendingResponses.has(executionId)) {
			this.pendingResponses.delete(executionId);
			this.logger.debug('Removed pending MCP response', { executionId });
		}
	}

	/**
	 * Cancel a pending MCP execution.
	 * Rejects the pending promise and attempts to stop the execution.
	 */
	cancelPendingExecution(executionId: string, reason = 'MCP execution cancelled'): void {
		const pending = this.pendingResponses.get(executionId);
		if (!pending) {
			this.logger.debug('No pending MCP execution to cancel', { executionId });
			return;
		}

		this.logger.debug('Cancelling pending MCP execution', { executionId, reason });

		const cancellationError = new ManualExecutionCancelledError(executionId);
		pending.promise.reject(cancellationError);

		this.pendingResponses.delete(executionId);

		if (this.activeExecutions.has(executionId)) {
			this.activeExecutions.stopExecution(executionId, cancellationError);
		}
	}

	/**
	 * Cancel all pending MCP executions.
	 * Used during shutdown or cleanup.
	 */
	cancelAllPendingExecutions(reason = 'MCP service shutdown'): void {
		const executionIds = Array.from(this.pendingResponses.keys());
		this.logger.debug('Cancelling all pending MCP executions', {
			count: executionIds.length,
			reason,
		});

		for (const executionId of executionIds) {
			this.cancelPendingExecution(executionId, reason);
		}
	}

	/**
	 * Get the count of pending executions.
	 */
	get pendingExecutionCount(): number {
		return this.pendingResponses.size;
	}

	// #endregion
}
