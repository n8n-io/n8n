import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import { User, WorkflowRepository } from '@n8n/db';
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

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { ProjectService } from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { WorkflowRunner } from '@/workflow-runner';
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
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowService: WorkflowService,
		private readonly urlService: UrlService,
		private readonly credentialsService: CredentialsService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly globalConfig: GlobalConfig,
		private readonly telemetry: Telemetry,
		private readonly workflowRunner: WorkflowRunner,
		private readonly roleService: RoleService,
		private readonly projectService: ProjectService,
	) {}

	async getServer(user: User) {
		const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
		const server = new McpServer({
			name: 'n8n MCP Server',
			version: '1.0.0',
		});

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
			this.workflowRepository,
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

		return server;
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
