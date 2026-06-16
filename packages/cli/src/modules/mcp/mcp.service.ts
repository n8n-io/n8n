import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_APPS_FLAG, MCP_APPS_VARIANT_CONTROL, MCP_APPS_VARIANT_ENABLED } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import {
	ExecutionRepository,
	FolderRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	registerMcpAppTool,
	registerWorkflowPreviewApp,
	WORKFLOW_PREVIEW_APP_URI,
	type McpAppTelemetryConfig,
} from '@n8n/mcp-apps/server';
import { InstanceSettings } from 'n8n-core';
import {
	createDeferredPromise,
	ManualExecutionCancelledError,
	type IDeferredPromise,
	type IRun,
} from 'n8n-workflow';

import {
	createAddDataTableColumnTool,
	createAddDataTableRowsTool,
	createCreateDataTableTool,
	createDeleteDataTableColumnTool,
	createRenameDataTableColumnTool,
	createRenameDataTableTool,
	createSearchDataTablesTool,
} from './tools/data-table';
import { createExecuteWorkflowTool } from './tools/execute-workflow.tool';
import { createGetExecutionTool } from './tools/get-execution.tool';
import { createSearchExecutionsTool } from './tools/search-executions.tool';
import { createWorkflowDetailsTool } from './tools/get-workflow-details.tool';
import { createListCredentialsTool } from './tools/list-credentials.tool';
import { createListTagsTool } from './tools/list-tags.tool';
import { createPublishWorkflowTool } from './tools/publish-workflow.tool';
import { createSearchFoldersTool } from './tools/search-folders.tool';
import { createSearchProjectsTool } from './tools/search-projects.tool';
import { createSearchWorkflowsTool } from './tools/search-workflows.tool';
import { createUnpublishWorkflowTool } from './tools/unpublish-workflow.tool';
import { createCreateWorkflowFromCodeTool } from './tools/workflow-builder/create-workflow-from-code.tool';
import { createArchiveWorkflowTool } from './tools/workflow-builder/delete-workflow.tool';
import { createExploreNodeResourcesTool } from './tools/workflow-builder/explore-node-resources.tool';
import { createUpdateWorkflowTool } from './tools/workflow-builder/update-workflow.tool';
import { createGetWorkflowBestPracticesTool } from './tools/workflow-builder/get-workflow-best-practices.tool';
import { createGetWorkflowNodeTypesTool } from './tools/workflow-builder/get-workflow-node-types.tool';
import { createGetWorkflowSdkReferenceTool } from './tools/workflow-builder/get-workflow-sdk-reference.tool';
import { getMcpInstructions } from './tools/workflow-builder/mcp-instructions';
import { createSearchWorkflowNodesTool } from './tools/workflow-builder/search-workflow-nodes.tool';
import { getSdkReferenceContent } from './tools/workflow-builder/sdk-reference-content';
import { createValidateNodeTool } from './tools/workflow-builder/validate-node.tool';
import { createValidateWorkflowCodeTool } from './tools/workflow-builder/validate-workflow-code.tool';
import { NodeCatalogService } from '@/node-catalog';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { N8N_VERSION } from '@/constants';
import { CredentialsService } from '@/credentials/credentials.service';
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
import { WorkflowService } from '@/workflows/workflow.service';
import { MCP_PREVIEW_RENDER_REQUESTED_EVENT } from './mcp.constants';
import type { McpAppsTelemetryVariant, McpClientInfo } from './mcp.types';
import { createPrepareTestPinDataTool } from './tools/prepare-workflow-pin-data.tool';
import { createTestWorkflowTool } from './tools/test-workflow.tool';
import { ExecutionService } from '@/executions/execution.service';

/**
 * Pending MCP execution response, used for queue mode support.
 */
interface PendingMcpResponse {
	executionId: string;
	promise: IDeferredPromise<IRun | undefined>;
	createdAt: Date;
}

export type McpAppsResolution = {
	enabled: boolean;
	variant: McpAppsTelemetryVariant;
};

type McpAppTelemetryResolution = {
	telemetry: McpAppTelemetryConfig;
	instanceOrigin?: string;
};

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
		private readonly instanceSettings: InstanceSettings,
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
		private readonly nodeCatalogService: NodeCatalogService,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly nodeTypes: NodeTypes,
		private readonly projectRepository: ProjectRepository,
		private readonly folderRepository: FolderRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionService: ExecutionService,
		private readonly dataTableProxyService: DataTableProxyService,
		private readonly collaborationService: CollaborationService,
		private readonly nodeResourceExplorerService: NodeResourceExplorerService,
		private readonly tagService: TagService,
		private readonly licenseState: LicenseState,
		private readonly postHogClient: PostHogClient,
	) {}

	async resolveMcpAppsVariant(user: User): Promise<McpAppsResolution> {
		if (this.globalConfig.endpoints.mcpAppsEnabled) {
			return { enabled: true, variant: 'env_override' };
		}

		// `PostHogClient.getFeatureFlags` swallows PostHog errors internally and
		// returns `{}`, so a transient outage surfaces here as `unassigned`.
		const flags = await this.postHogClient.getFeatureFlags(user);
		const raw = flags?.[MCP_APPS_FLAG];
		if (raw === MCP_APPS_VARIANT_ENABLED) return { enabled: true, variant: 'variant' };
		if (raw === MCP_APPS_VARIANT_CONTROL) return { enabled: false, variant: 'control' };
		return { enabled: false, variant: 'unassigned' };
	}

	/**
	 * Builds the instance-level telemetry config injected into MCP app UIs.
	 * Mirrors the front-end telemetry settings: RudderStack data plane and source
	 * config requests go through the instance telemetry proxy.
	 */
	private buildMcpAppTelemetryConfig(): McpAppTelemetryResolution {
		const { enabled, frontendConfig } = this.globalConfig.diagnostics;
		const disabledTelemetry: McpAppTelemetryConfig = {
			enabled: false,
			writeKey: '',
			dataPlaneUrl: '',
			configUrl: '',
			instanceId: this.instanceSettings.instanceId,
			versionCli: N8N_VERSION,
		};

		if (!enabled) return { telemetry: disabledTelemetry };

		const instanceBaseUrl = this.urlService.getInstanceBaseUrl();
		const restEndpoint = this.globalConfig.endpoints.rest;
		const [writeKey] = frontendConfig.split(';');

		const telemetry: McpAppTelemetryConfig = {
			enabled,
			writeKey: writeKey ?? '',
			dataPlaneUrl: `${instanceBaseUrl}/${restEndpoint}/telemetry/proxy`,
			configUrl: `${instanceBaseUrl}/${restEndpoint}/telemetry/rudderstack`,
			instanceId: this.instanceSettings.instanceId,
			versionCli: N8N_VERSION,
		};

		try {
			return { telemetry, instanceOrigin: new URL(telemetry.dataPlaneUrl).origin };
		} catch {
			this.logger.warn('Disabling MCP app telemetry because telemetry proxy URL is invalid', {
				dataPlaneUrl: telemetry.dataPlaneUrl,
			});

			return {
				telemetry: disabledTelemetry,
			};
		}
	}

	async getServer(user: User, mcpAppsEnabled: boolean, clientInfo?: McpClientInfo) {
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
			this.workflowRunner,
			this.telemetry,
			this,
		);
		server.registerTool(
			executeWorkflowTool.name,
			executeWorkflowTool.config,
			executeWorkflowTool.handler,
		);

		const getExecutionTool = createGetExecutionTool(
			user,
			this.executionRepository,
			this.workflowFinderService,
			this.telemetry,
		);
		server.registerTool(getExecutionTool.name, getExecutionTool.config, getExecutionTool.handler);

		const searchExecutionsTool = createSearchExecutionsTool(
			user,
			this.executionService,
			this.workflowFinderService,
			this.telemetry,
		);
		server.registerTool(
			searchExecutionsTool.name,
			searchExecutionsTool.config,
			searchExecutionsTool.handler,
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

		const publishWorkflowTool = createPublishWorkflowTool(
			user,
			this.workflowFinderService,
			this.workflowService,
			this.telemetry,
			this.collaborationService,
		);
		server.registerTool(
			publishWorkflowTool.name,
			publishWorkflowTool.config,
			publishWorkflowTool.handler,
		);

		const unpublishWorkflowTool = createUnpublishWorkflowTool(
			user,
			this.workflowFinderService,
			this.workflowService,
			this.telemetry,
			this.collaborationService,
		);
		server.registerTool(
			unpublishWorkflowTool.name,
			unpublishWorkflowTool.config,
			unpublishWorkflowTool.handler,
		);

		const prepareTestPinDataTool = createPrepareTestPinDataTool(
			user,
			this.workflowFinderService,
			this.executionService,
			this.nodeTypes,
			this.telemetry,
			this.logger,
		);
		server.registerTool(
			prepareTestPinDataTool.name,
			prepareTestPinDataTool.config,
			prepareTestPinDataTool.handler,
		);

		const testWorkflowTool = createTestWorkflowTool(
			user,
			this.workflowFinderService,
			this.activeExecutions,
			this.workflowRunner,
			this.nodeTypes,
			this.telemetry,
			this,
		);
		server.registerTool(testWorkflowTool.name, testWorkflowTool.config, testWorkflowTool.handler);

		const listCredentialsTool = createListCredentialsTool(
			user,
			this.credentialsService,
			this.telemetry,
		);
		server.registerTool(
			listCredentialsTool.name,
			listCredentialsTool.config,
			listCredentialsTool.handler,
		);

		if (!this.globalConfig.tags.disabled) {
			const listTagsTool = createListTagsTool(user, this.tagService, this.telemetry);
			server.registerTool(listTagsTool.name, listTagsTool.config, listTagsTool.handler);
		}

		// Data table tools
		const dataTableOps = this.dataTableProxyService.makeDataTableOperationsForUser(user);

		const searchDataTablesTool = createSearchDataTablesTool(user, dataTableOps, this.telemetry);
		server.registerTool(
			searchDataTablesTool.name,
			searchDataTablesTool.config,
			searchDataTablesTool.handler,
		);

		const createDataTableTool = createCreateDataTableTool(user, dataTableOps, this.telemetry);
		server.registerTool(
			createDataTableTool.name,
			createDataTableTool.config,
			createDataTableTool.handler,
		);

		const renameDataTableTool = createRenameDataTableTool(user, dataTableOps, this.telemetry);
		server.registerTool(
			renameDataTableTool.name,
			renameDataTableTool.config,
			renameDataTableTool.handler,
		);

		const addDataTableColumnTool = createAddDataTableColumnTool(user, dataTableOps, this.telemetry);
		server.registerTool(
			addDataTableColumnTool.name,
			addDataTableColumnTool.config,
			addDataTableColumnTool.handler,
		);

		const deleteDataTableColumnTool = createDeleteDataTableColumnTool(
			user,
			dataTableOps,
			this.telemetry,
		);
		server.registerTool(
			deleteDataTableColumnTool.name,
			deleteDataTableColumnTool.config,
			deleteDataTableColumnTool.handler,
		);

		const renameDataTableColumnTool = createRenameDataTableColumnTool(
			user,
			dataTableOps,
			this.telemetry,
		);
		server.registerTool(
			renameDataTableColumnTool.name,
			renameDataTableColumnTool.config,
			renameDataTableColumnTool.handler,
		);

		const addDataTableRowsTool = createAddDataTableRowsTool(user, dataTableOps, this.telemetry);
		server.registerTool(
			addDataTableRowsTool.name,
			addDataTableRowsTool.config,
			addDataTableRowsTool.handler,
		);

		// Workflow builder tools (enabled via N8N_MCP_BUILDER_ENABLED)
		if (builderEnabled) {
			await this.registerBuilderTools(server, user, dataTableOps, mcpAppsEnabled, clientInfo);
		}

		return server;
	}

	private async registerBuilderTools(
		server: InstanceType<typeof McpServer>,
		user: User,
		dataTableOps: ReturnType<DataTableProxyService['makeDataTableOperationsForUser']>,
		mcpAppsEnabled: boolean,
		clientInfo?: McpClientInfo,
	) {
		await this.nodeCatalogService.initialize();

		const searchNodesTool = createSearchWorkflowNodesTool(
			user,
			this.nodeCatalogService,
			this.telemetry,
		);
		server.registerTool(searchNodesTool.name, searchNodesTool.config, searchNodesTool.handler);

		const getNodeTypesTool = createGetWorkflowNodeTypesTool(
			user,
			this.nodeCatalogService,
			this.telemetry,
		);
		server.registerTool(getNodeTypesTool.name, getNodeTypesTool.config, getNodeTypesTool.handler);

		const bestPracticesTool = createGetWorkflowBestPracticesTool(user, this.telemetry);
		server.registerTool(
			bestPracticesTool.name,
			bestPracticesTool.config,
			bestPracticesTool.handler,
		);

		const exploreNodeResourcesTool = createExploreNodeResourcesTool(
			user,
			this.nodeResourceExplorerService,
			this.telemetry,
		);
		server.registerTool(
			exploreNodeResourcesTool.name,
			exploreNodeResourcesTool.config,
			exploreNodeResourcesTool.handler,
		);

		const validateTool = createValidateWorkflowCodeTool(user, this.telemetry, this.nodeTypes);
		server.registerTool(validateTool.name, validateTool.config, validateTool.handler);

		const validateNodeTool = createValidateNodeTool(user, this.telemetry);
		server.registerTool(validateNodeTool.name, validateNodeTool.config, validateNodeTool.handler);

		const createTool = createCreateWorkflowFromCodeTool(
			user,
			this.workflowCreationService,
			this.workflowFinderService,
			this.urlService,
			this.telemetry,
			this.nodeTypes,
			this.credentialsService,
			this.projectRepository,
			dataTableOps,
		);

		if (mcpAppsEnabled) {
			const appTelemetry = this.buildMcpAppTelemetryConfig();
			registerWorkflowPreviewApp(server, {
				instanceOrigin: appTelemetry.instanceOrigin,
				telemetry: appTelemetry.telemetry,
				onResourceRead: () => {
					this.telemetry.track(MCP_PREVIEW_RENDER_REQUESTED_EVENT, {
						user_id: user.id,
						client_name: clientInfo?.name,
						client_version: clientInfo?.version,
					});
				},
			});
			registerMcpAppTool(
				server,
				createTool.name,
				{
					...createTool.config,
					_meta: {
						ui: {
							resourceUri: WORKFLOW_PREVIEW_APP_URI,
						},
					},
				},
				createTool.handler,
			);
		} else {
			server.registerTool(createTool.name, createTool.config, createTool.handler);
		}

		const searchProjectsTool = createSearchProjectsTool(
			user,
			this.projectRepository,
			this.licenseState,
			this.telemetry,
		);
		server.registerTool(
			searchProjectsTool.name,
			searchProjectsTool.config,
			searchProjectsTool.handler,
		);

		const searchFoldersTool = createSearchFoldersTool(
			user,
			this.folderRepository,
			this.projectService,
			this.telemetry,
		);
		server.registerTool(
			searchFoldersTool.name,
			searchFoldersTool.config,
			searchFoldersTool.handler,
		);

		const archiveTool = createArchiveWorkflowTool(
			user,
			this.workflowFinderService,
			this.workflowService,
			this.telemetry,
			this.collaborationService,
		);
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
			this.collaborationService,
			dataTableOps,
			this.tagService,
			this.globalConfig,
		);
		server.registerTool(updateTool.name, updateTool.config, updateTool.handler);

		// SDK reference as MCP resource — for clients that support resources.
		server.resource(
			'workflow-sdk-reference',
			'n8n://workflow-sdk/reference',
			{
				description:
					'Required n8n Workflow SDK reference for building workflows from code. Read this before writing workflow code.',
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

		// SDK reference tool — always registered alongside the MCP resource above,
		// so all clients can access the SDK reference regardless of resource support.
		const sdkRefTool = createGetWorkflowSdkReferenceTool(user, this.telemetry);
		server.registerTool(sdkRefTool.name, sdkRefTool.config, sdkRefTool.handler);
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
