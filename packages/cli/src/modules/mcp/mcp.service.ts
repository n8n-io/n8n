import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_APPS_FLAG, MCP_APPS_VARIANT_CONTROL, MCP_APPS_VARIANT_ENABLED } from '@n8n/api-types';
import { LicenseState, Logger } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig, WorkflowsConfig } from '@n8n/config';
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
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { InstanceSettings } from 'n8n-core';
import { ManualExecutionCancelledError, type IRun } from 'n8n-workflow';

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
import { createGetWorkflowHistoryTool } from './tools/get-workflow-history.tool';
import { createGetWorkflowVersionTool } from './tools/get-workflow-version.tool';
import { createListCredentialsTool } from './tools/list-credentials.tool';
import { createListTagsTool } from './tools/list-tags.tool';
import { createPublishWorkflowTool } from './tools/publish-workflow.tool';
import { createSearchFoldersTool } from './tools/search-folders.tool';
import { createSearchProjectsTool } from './tools/search-projects.tool';
import { createSearchWorkflowsTool } from './tools/search-workflows.tool';
import { createUnpublishWorkflowTool } from './tools/unpublish-workflow.tool';
import { MCP_CREATE_WORKFLOW_FROM_CODE_TOOL } from './tools/workflow-builder/constants';
import { createCreateWorkflowFromCodeTool } from './tools/workflow-builder/create-workflow-from-code.tool';
import { createArchiveWorkflowTool } from './tools/workflow-builder/delete-workflow.tool';
import { createExploreNodeResourcesTool } from './tools/workflow-builder/explore-node-resources.tool';
import { createUpdateWorkflowTool } from './tools/workflow-builder/update-workflow.tool';
import { createRestoreWorkflowVersionTool } from './tools/workflow-builder/restore-workflow-version.tool';
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
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { MCP_PREVIEW_RENDER_REQUESTED_EVENT } from './mcp.constants';
import { getAllowedToolNames } from './mcp-scopes';
import type { McpAppsTelemetryVariant, McpClientInfo, RegisterToolFn } from './mcp.types';
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
		private readonly workflowHistoryService: WorkflowHistoryService,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
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

	/**
	 * Builds a per-request MCP server exposing only the tools covered by the
	 * token's granted scopes. `grantedScopes: undefined` (API keys, legacy
	 * tokens) exposes all tools. Filtering registration is sufficient
	 * enforcement: the server is rebuilt per request, so an unregistered tool
	 * is neither listed nor callable.
	 */
	async getServer(
		user: User,
		mcpAppsEnabled: boolean,
		clientInfo?: McpClientInfo,
		grantedScopes?: string[],
	) {
		const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
		const builderEnabled = this.globalConfig.endpoints.mcpBuilderEnabled;
		const allowedToolNames = getAllowedToolNames(grantedScopes);
		// The builder walkthrough is only useful when the grant can actually
		// create workflows; a read-only grant gets the plain intro instead of
		// steps referencing tools it cannot call.
		const builderInstructionsEnabled =
			builderEnabled &&
			(allowedToolNames?.has(MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName) ?? true);
		const server = new McpServer(
			{
				name: 'n8n MCP Server',
				version: builderEnabled ? '1.1.0' : '1.0.0',
			},
			{
				instructions: getMcpInstructions(builderInstructionsEnabled),
			},
		);

		const registerIfAllowed: RegisterToolFn = (tool) => {
			if (allowedToolNames && !allowedToolNames.has(tool.name)) return;
			server.registerTool(tool.name, tool.config, tool.handler);
		};

		// Existing tools
		const workflowSearchTool = createSearchWorkflowsTool(
			user,
			this.workflowService,
			this.telemetry,
		);
		registerIfAllowed(workflowSearchTool);

		const executeWorkflowTool = createExecuteWorkflowTool(
			user,
			this.workflowFinderService,
			this.workflowRunner,
			this.telemetry,
			this,
			this.workflowsConfig,
			this.workflowPublishedDataService,
		);
		registerIfAllowed(executeWorkflowTool);

		const getExecutionTool = createGetExecutionTool(
			user,
			this.executionRepository,
			this.workflowFinderService,
			this.telemetry,
		);
		registerIfAllowed(getExecutionTool);

		const searchExecutionsTool = createSearchExecutionsTool(
			user,
			this.executionService,
			this.workflowFinderService,
			this.telemetry,
		);
		registerIfAllowed(searchExecutionsTool);

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
			this.urlService.getTestWebhookBaseUrl(),
		);
		registerIfAllowed(workflowDetailsTool);

		const workflowHistoryTool = createGetWorkflowHistoryTool(
			user,
			this.workflowFinderService,
			this.workflowHistoryService,
			this.telemetry,
		);
		registerIfAllowed(workflowHistoryTool);

		const workflowVersionTool = createGetWorkflowVersionTool(
			user,
			this.workflowFinderService,
			this.workflowHistoryService,
			this.telemetry,
		);
		registerIfAllowed(workflowVersionTool);

		const publishWorkflowTool = createPublishWorkflowTool(
			user,
			this.workflowFinderService,
			this.workflowService,
			this.telemetry,
			this.collaborationService,
		);
		registerIfAllowed(publishWorkflowTool);

		const unpublishWorkflowTool = createUnpublishWorkflowTool(
			user,
			this.workflowFinderService,
			this.workflowService,
			this.telemetry,
			this.collaborationService,
		);
		registerIfAllowed(unpublishWorkflowTool);

		const prepareTestPinDataTool = createPrepareTestPinDataTool(
			user,
			this.workflowFinderService,
			this.executionService,
			this.nodeTypes,
			this.telemetry,
			this.logger,
		);
		registerIfAllowed(prepareTestPinDataTool);

		const testWorkflowTool = createTestWorkflowTool(
			user,
			this.workflowFinderService,
			this.activeExecutions,
			this.workflowRunner,
			this.nodeTypes,
			this.telemetry,
			this,
		);
		registerIfAllowed(testWorkflowTool);

		const listCredentialsTool = createListCredentialsTool(
			user,
			this.credentialsService,
			this.telemetry,
		);
		registerIfAllowed(listCredentialsTool);

		if (!this.globalConfig.tags.disabled) {
			const listTagsTool = createListTagsTool(user, this.tagService, this.telemetry);
			registerIfAllowed(listTagsTool);
		}

		// Data table tools
		const dataTableOps = this.dataTableProxyService.makeDataTableOperationsForUser(user);

		const searchDataTablesTool = createSearchDataTablesTool(user, dataTableOps, this.telemetry);
		registerIfAllowed(searchDataTablesTool);

		const createDataTableTool = createCreateDataTableTool(user, dataTableOps, this.telemetry);
		registerIfAllowed(createDataTableTool);

		const renameDataTableTool = createRenameDataTableTool(user, dataTableOps, this.telemetry);
		registerIfAllowed(renameDataTableTool);

		const addDataTableColumnTool = createAddDataTableColumnTool(user, dataTableOps, this.telemetry);
		registerIfAllowed(addDataTableColumnTool);

		const deleteDataTableColumnTool = createDeleteDataTableColumnTool(
			user,
			dataTableOps,
			this.telemetry,
		);
		registerIfAllowed(deleteDataTableColumnTool);

		const renameDataTableColumnTool = createRenameDataTableColumnTool(
			user,
			dataTableOps,
			this.telemetry,
		);
		registerIfAllowed(renameDataTableColumnTool);

		const addDataTableRowsTool = createAddDataTableRowsTool(user, dataTableOps, this.telemetry);
		registerIfAllowed(addDataTableRowsTool);

		// Workflow builder tools (enabled via N8N_MCP_BUILDER_ENABLED)
		if (builderEnabled) {
			await this.registerBuilderTools(
				server,
				user,
				dataTableOps,
				mcpAppsEnabled,
				registerIfAllowed,
				allowedToolNames,
				clientInfo,
			);
		}

		return server;
	}

	private async registerBuilderTools(
		server: InstanceType<typeof McpServer>,
		user: User,
		dataTableOps: ReturnType<DataTableProxyService['makeDataTableOperationsForUser']>,
		mcpAppsEnabled: boolean,
		registerIfAllowed: RegisterToolFn,
		allowedToolNames: Set<string> | undefined,
		clientInfo?: McpClientInfo,
	) {
		await this.nodeCatalogService.initialize();

		const searchNodesTool = createSearchWorkflowNodesTool(
			user,
			this.nodeCatalogService,
			this.telemetry,
		);
		registerIfAllowed(searchNodesTool);

		const getNodeTypesTool = createGetWorkflowNodeTypesTool(
			user,
			this.nodeCatalogService,
			this.telemetry,
		);
		registerIfAllowed(getNodeTypesTool);

		const bestPracticesTool = createGetWorkflowBestPracticesTool(user, this.telemetry);
		registerIfAllowed(bestPracticesTool);

		const exploreNodeResourcesTool = createExploreNodeResourcesTool(
			user,
			this.nodeResourceExplorerService,
			this.telemetry,
		);
		registerIfAllowed(exploreNodeResourcesTool);

		const validateTool = createValidateWorkflowCodeTool(user, this.telemetry, this.nodeTypes);
		registerIfAllowed(validateTool);

		const validateNodeTool = createValidateNodeTool(user, this.telemetry);
		registerIfAllowed(validateNodeTool);

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

		// The preview app only accompanies the create tool, so both are gated
		// together by the granted scopes.
		const createToolAllowed = !allowedToolNames || allowedToolNames.has(createTool.name);
		if (mcpAppsEnabled && createToolAllowed) {
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
			registerIfAllowed(createTool);
		}

		const searchProjectsTool = createSearchProjectsTool(
			user,
			this.projectRepository,
			this.licenseState,
			this.telemetry,
		);
		registerIfAllowed(searchProjectsTool);

		const searchFoldersTool = createSearchFoldersTool(
			user,
			this.folderRepository,
			this.projectService,
			this.telemetry,
		);
		registerIfAllowed(searchFoldersTool);

		const archiveTool = createArchiveWorkflowTool(
			user,
			this.workflowFinderService,
			this.workflowService,
			this.telemetry,
			this.collaborationService,
		);
		registerIfAllowed(archiveTool);

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
			this.subworkflowPolicyChecker,
			this.workflowPublishedDataService,
		);
		registerIfAllowed(updateTool);

		const restoreVersionTool = createRestoreWorkflowVersionTool(
			user,
			this.workflowFinderService,
			this.workflowHistoryService,
			this.workflowService,
			this.telemetry,
			this.collaborationService,
		);
		registerIfAllowed(restoreVersionTool);

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
		registerIfAllowed(sdkRefTool);
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
