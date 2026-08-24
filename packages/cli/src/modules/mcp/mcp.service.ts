import type { CallToolResult, McpServer } from '@modelcontextprotocol/server';
import {
	MCP_APPS_FLAG,
	MCP_APPS_VARIANT_CONTROL,
	MCP_APPS_VARIANT_ENABLED,
	MCP_CANVAS_GROUPS_FLAG,
} from '@n8n/api-types';
import { LicenseState, Logger, ModuleRegistry } from '@n8n/backend-common';
import { ExecutionsConfig, GlobalConfig, WorkflowsConfig } from '@n8n/config';
import { ExecutionRepository, ProjectRepository, SharedWorkflowRepository, User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import {
	mcpAppToolMeta,
	registerWorkflowPreviewApp,
	WORKFLOW_PREVIEW_APP_URI,
	type McpAppTelemetryConfig,
} from '@n8n/mcp-apps/server';
import { lazyImport } from '@n8n/utils/lazy-import';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { InstanceSettings } from 'n8n-core';
import { ManualExecutionCancelledError, type FeatureFlags, type IRun } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CollaborationService } from '@/collaboration/collaboration.service';
import { N8N_VERSION } from '@/constants';
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

import { MCP_CREATE_AGENT_TOOL_NAME, MCP_PREVIEW_RENDER_REQUESTED_EVENT } from './mcp.constants';
import { getAllowedToolNames } from './mcp-scopes';
import { areAgentToolsAvailable } from './mcp-tool-availability';
import type {
	McpAppsTelemetryVariant,
	McpClientInfo,
	RegisterResourceFn,
	RegisterToolFn,
	ToolDefinition,
} from './mcp.types';
import { shapeToStandardSchema } from './tool-schema.util';
import { createCreateFolderTool } from './tools/create-folder.tool';
import {
	createAddDataTableColumnTool,
	createAddDataTableRowsTool,
	createCreateDataTableTool,
	createDeleteDataTableColumnTool,
	createGetDataTableRowsTool,
	createRenameDataTableColumnTool,
	createRenameDataTableTool,
	createSearchDataTablesTool,
} from './tools/data-table';
import { createExecuteWorkflowTool } from './tools/execute-workflow.tool';
import { createGetExecutionTool } from './tools/get-execution.tool';
import { createWorkflowDetailsTool } from './tools/get-workflow-details.tool';
import { createGetWorkflowHistoryTool } from './tools/get-workflow-history.tool';
import { createGetWorkflowVersionTool } from './tools/get-workflow-version.tool';
import { createGetWorkflowVersionsDiffTool } from './tools/get-workflow-versions-diff.tool';
import { createListCredentialsTool } from './tools/list-credentials.tool';
import { createListN8nConnectServicesTool } from './tools/list-n8n-connect-services.tool';
import { createListTagsTool } from './tools/list-tags.tool';
import { createMoveWorkflowsToFolderTool } from './tools/move-workflows-to-folder.tool';
import { createPrepareTestPinDataTool } from './tools/prepare-workflow-pin-data.tool';
import { createPublishWorkflowTool } from './tools/publish-workflow.tool';
import { createSearchExecutionsTool } from './tools/search-executions.tool';
import { createSearchFoldersTool } from './tools/search-folders.tool';
import { createSearchProjectsTool } from './tools/search-projects.tool';
import { createSearchWorkflowsTool } from './tools/search-workflows.tool';
import { createTestWorkflowTool } from './tools/test-workflow.tool';
import { createUnpublishWorkflowTool } from './tools/unpublish-workflow.tool';
import { createUpdateFolderTool } from './tools/update-folder.tool';
import { MCP_CREATE_WORKFLOW_FROM_CODE_TOOL } from './tools/workflow-builder/constants';
import { createCreateWorkflowFromCodeTool } from './tools/workflow-builder/create-workflow-from-code.tool';
import { createArchiveWorkflowTool } from './tools/workflow-builder/delete-workflow.tool';
import { createExploreNodeResourcesTool } from './tools/workflow-builder/explore-node-resources.tool';
import { createGetWorkflowBestPracticesTool } from './tools/workflow-builder/get-workflow-best-practices.tool';
import { createGetWorkflowNodeTypesTool } from './tools/workflow-builder/get-workflow-node-types.tool';
import { createGetWorkflowSdkReferenceTool } from './tools/workflow-builder/get-workflow-sdk-reference.tool';
import { getMcpInstructions } from './tools/workflow-builder/mcp-instructions';
import { createRestoreWorkflowVersionTool } from './tools/workflow-builder/restore-workflow-version.tool';
import { getSdkReferenceContent } from './tools/workflow-builder/sdk-reference-content';
import { createSearchWorkflowNodesTool } from './tools/workflow-builder/search-workflow-nodes.tool';
import { createUpdateWorkflowTool } from './tools/workflow-builder/update-workflow.tool';
import { createValidateNodeTool } from './tools/workflow-builder/validate-node.tool';
import { createValidateWorkflowCodeTool } from './tools/workflow-builder/validate-workflow-code.tool';

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

/** Per-user resolution of every PostHog-gated MCP feature. */
export type McpFeatureFlags = {
	mcpApps: McpAppsResolution;
	/** Canvas node-group support in the workflow-builder tools. */
	canvasGroupsEnabled: boolean;
};

type McpAppTelemetryResolution = {
	telemetry: McpAppTelemetryConfig;
	instanceOrigin?: string;
};

/**
 * There is no standard failure contract across MCP tools: most set MCP's
 * `isError` flag, but several catch their own errors and return a normal
 * result marked only in the structured output, via `status: 'error'`
 * (`execute_workflow`, `test_workflow`) or just an `error` message string
 * (`publish_workflow`, `unpublish_workflow`, `get_execution`). A string
 * `structuredContent.error` is set by every handled-failure shape and never
 * on success, so it doubles as failure marker and message source, with the
 * first text content item as fallback.
 */
function getToolCallOutcome(result: CallToolResult | undefined): {
	status: 'success' | 'error';
	errorMessage?: string;
} {
	if (!result) return { status: 'success' };

	// v2 types structuredContent as an arbitrary JSON value; narrow to an
	// object before reading the failure markers off it.
	const structured =
		typeof result.structuredContent === 'object' && result.structuredContent !== null
			? (result.structuredContent as Record<string, unknown>)
			: undefined;
	const errorMessage = typeof structured?.error === 'string' ? structured.error : undefined;
	if (result.isError !== true && structured?.status !== 'error' && errorMessage === undefined) {
		return { status: 'success' };
	}

	if (errorMessage !== undefined) return { status: 'error', errorMessage };

	for (const item of result.content ?? []) {
		if (item.type === 'text') return { status: 'error', errorMessage: item.text };
	}

	return { status: 'error' };
}

/**
 * Reads a `workflowId` off a tool's arguments or its structured output. Most
 * tools take the workflow they act on as an argument, but the ones that create
 * a workflow only report it back (`create_workflow_from_code`), so both sides
 * are checked.
 */
function getWorkflowId(source: unknown): string | undefined {
	if (!source || typeof source !== 'object' || !('workflowId' in source)) return undefined;
	const workflowId = (source as { workflowId: unknown }).workflowId;
	return typeof workflowId === 'string' ? workflowId : undefined;
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
		private readonly folderFinderService: FolderFinderService,
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
		private readonly aiGatewayService: AiGatewayService,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly eventService: EventService,
		private readonly folderService: FolderService,
	) {}

	/**
	 * Resolves every PostHog-gated MCP feature for a user with a single flags
	 * lookup. Env overrides are force-enable-only and take precedence over
	 * PostHog; the lookup is skipped entirely when every feature is overridden.
	 */
	async resolveFeatureFlags(user: User): Promise<McpFeatureFlags> {
		const { mcpAppsEnabled, mcpCanvasGroupsEnabled } = this.globalConfig.endpoints;

		// `PostHogClient.getFeatureFlags` swallows PostHog errors internally and
		// returns `{}`, so a transient outage fails closed (feature off, MCP Apps
		// surfacing as `unassigned`).
		const flags =
			mcpAppsEnabled && mcpCanvasGroupsEnabled
				? undefined
				: await this.postHogClient.getFeatureFlags(user);

		return {
			mcpApps: this.resolveMcpApps(mcpAppsEnabled, flags),
			canvasGroupsEnabled: mcpCanvasGroupsEnabled || flags?.[MCP_CANVAS_GROUPS_FLAG] === true,
		};
	}

	private resolveMcpApps(envOverride: boolean, flags?: FeatureFlags): McpAppsResolution {
		if (envOverride) return { enabled: true, variant: 'env_override' };

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
	 * Builds the single registration chokepoint for MCP tools. It bridges the
	 * classic-zod raw shapes in each ToolDefinition to the Standard Schema
	 * interface the v2 SDK expects (see tool-schema.util.ts), and wraps every
	 * handler so each invocation emits an `mcp-tool-called` event (forwarded to
	 * log streaming). All registration paths, including builder, data-table and
	 * agent tools, go through the function this returns. Returns the SDK's
	 * RegisteredTool so callers (and tests) can reach the stored handler.
	 */
	createToolRegistrar(server: McpServer, user: User, clientInfo?: McpClientInfo) {
		return (tool: ToolDefinition) => {
			// `ToolHandler` is a union of 1- and 2-arity signatures, so we invoke it
			// through a generic callable and narrow the result back to a tool result.
			const invoke = tool.handler as (...handlerArgs: unknown[]) => Promise<CallToolResult>;

			const instrumentedHandler = async (...handlerArgs: unknown[]) => {
				const workflowId = getWorkflowId(handlerArgs[0]);

				try {
					const result = await invoke(...handlerArgs);
					const { status, errorMessage } = getToolCallOutcome(result);
					this.eventService.emit('mcp-tool-called', {
						user,
						toolName: tool.name,
						workflowId: workflowId ?? getWorkflowId(result?.structuredContent),
						status,
						errorMessage,
						clientName: clientInfo?.name,
					});
					return result;
				} catch (error) {
					this.eventService.emit('mcp-tool-called', {
						user,
						toolName: tool.name,
						workflowId,
						status: 'error',
						errorMessage: error instanceof Error ? error.message : String(error),
						clientName: clientInfo?.name,
					});
					throw error;
				}
			};

			const { inputSchema, outputSchema, ...config } = tool.config;
			return server.registerTool(
				tool.name,
				{
					...config,
					...(inputSchema ? { inputSchema: shapeToStandardSchema(inputSchema) } : {}),
					...(outputSchema ? { outputSchema: shapeToStandardSchema(outputSchema) } : {}),
				},
				instrumentedHandler,
			);
		};
	}

	/**
	 * Resource counterpart to createToolRegistrar: the single chokepoint every
	 * static resource registers through, so callers (builder and agent tools)
	 * never reach for the raw McpServer. Resources carry no input schema to
	 * bridge and aren't instrumented like tool calls, so this only forwards to
	 * the SDK today; keeping the seam means resource-wide concerns have one home.
	 */
	createResourceRegistrar(server: McpServer): RegisterResourceFn {
		return (resource) =>
			server.registerResource(resource.name, resource.uri, resource.config, resource.read);
	}

	/**
	 * Builds a per-request MCP server exposing only the tools covered by the
	 * token's granted scopes. `grantedScopes: undefined` (API keys, legacy
	 * tokens) exposes all tools. Filtering registration is sufficient
	 * enforcement: the server is rebuilt per request, so an unregistered tool
	 * is neither listed nor callable.
	 *
	 * `featureFlags` is the caller's per-request resolution (see
	 * `resolveFeatureFlags`); this method trusts it and never queries PostHog.
	 */
	async getServer(
		user: User,
		featureFlags: McpFeatureFlags,
		clientInfo?: McpClientInfo,
		grantedScopes?: string[],
	) {
		const { McpServer } = await lazyImport<typeof import('@modelcontextprotocol/server')>(
			async () => await import('@modelcontextprotocol/server'),
		);

		const builderEnabled = this.globalConfig.endpoints.mcpBuilderEnabled;
		const n8nConnectAvailable = builderEnabled
			? (await this.aiGatewayService.isAvailable()).available
			: false;
		const allowedToolNames = getAllowedToolNames(grantedScopes);
		// The builder walkthrough is only useful when the grant can actually
		// create workflows; a read-only grant gets the plain intro instead of
		// steps referencing tools it cannot call.
		const builderInstructionsEnabled =
			builderEnabled &&
			(allowedToolNames?.has(MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName) ?? true);
		const agentsEnabled = areAgentToolsAvailable(this.globalConfig, this.moduleRegistry);
		// Same rationale as builderInstructionsEnabled: a grant that cannot call
		// the agent tools gets no agent build walkthrough.
		const agentInstructionsEnabled =
			agentsEnabled && (allowedToolNames?.has(MCP_CREATE_AGENT_TOOL_NAME) ?? true);
		const server = new McpServer(
			{
				name: 'n8n MCP Server',
				version: agentsEnabled ? '1.2.0' : builderEnabled ? '1.1.0' : '1.0.0',
			},
			{
				instructions: getMcpInstructions({
					isBuilderEnabled: builderInstructionsEnabled,
					isN8nConnectAvailable: n8nConnectAvailable,
					canvasGroupsEnabled: featureFlags.canvasGroupsEnabled,
					isAgentsEnabled: agentInstructionsEnabled,
				}),
			},
		);

		const registerTool = this.createToolRegistrar(server, user, clientInfo);
		const registerResource = this.createResourceRegistrar(server);

		const registerIfAllowed: RegisterToolFn = (tool) => {
			if (allowedToolNames && !allowedToolNames.has(tool.name)) return;
			registerTool(tool);
		};

		// Existing tools
		const workflowSearchTool = createSearchWorkflowsTool(
			user,
			this.workflowService,
			this.folderFinderService,
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
			this.nodeTypes,
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

		const workflowVersionsDiffTool = createGetWorkflowVersionsDiffTool(
			user,
			this.workflowFinderService,
			this.workflowHistoryService,
			this.telemetry,
		);
		registerIfAllowed(workflowVersionsDiffTool);

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
			this.aiGatewayService,
		);

		const listN8nConnectServicesTool = createListN8nConnectServicesTool(
			user,
			this.aiGatewayService,
			this.telemetry,
		);
		registerIfAllowed(listCredentialsTool);
		registerIfAllowed(listN8nConnectServicesTool);

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

		const getDataTableRowsTool = createGetDataTableRowsTool(user, dataTableOps, this.telemetry);
		registerIfAllowed(getDataTableRowsTool);

		// Workflow builder tools (enabled via N8N_MCP_BUILDER_ENABLED)
		if (builderEnabled) {
			await this.registerBuilderTools(
				server,
				user,
				dataTableOps,
				featureFlags,
				registerIfAllowed,
				registerResource,
				allowedToolNames,
				clientInfo,
			);
		}

		if (agentsEnabled) {
			const { McpAgentToolsService } = await import('./tools/agents/agent-tools.service.js');
			Container.get(McpAgentToolsService).registerTools(
				registerIfAllowed,
				registerResource,
				user,
				allowedToolNames,
			);
		}

		return server;
	}

	private async registerBuilderTools(
		server: McpServer,
		user: User,
		dataTableOps: ReturnType<DataTableProxyService['makeDataTableOperationsForUser']>,
		featureFlags: McpFeatureFlags,
		registerIfAllowed: RegisterToolFn,
		registerResource: RegisterResourceFn,
		allowedToolNames: Set<string> | undefined,
		clientInfo?: McpClientInfo,
	) {
		await this.nodeCatalogService.initialize();

		const searchNodesTool = createSearchWorkflowNodesTool(
			user,
			this.nodeCatalogService,
			this.telemetry,
			this.aiGatewayService,
		);
		registerIfAllowed(searchNodesTool);

		const getNodeTypesTool = createGetWorkflowNodeTypesTool(
			user,
			this.nodeCatalogService,
			this.telemetry,
			this.aiGatewayService,
		);
		registerIfAllowed(getNodeTypesTool);

		const bestPracticesTool = createGetWorkflowBestPracticesTool(user, this.telemetry, {
			canvasGroupsEnabled: featureFlags.canvasGroupsEnabled,
		});
		registerIfAllowed(bestPracticesTool);

		const exploreNodeResourcesTool = createExploreNodeResourcesTool(
			user,
			this.nodeResourceExplorerService,
			this.telemetry,
		);
		registerIfAllowed(exploreNodeResourcesTool);

		const validateTool = createValidateWorkflowCodeTool(user, this.telemetry, this.nodeTypes, {
			canvasGroupsEnabled: featureFlags.canvasGroupsEnabled,
		});
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
			this.aiGatewayService,
			{ canvasGroupsEnabled: featureFlags.canvasGroupsEnabled },
		);

		// The preview app only accompanies the create tool, so both are gated
		// together by the granted scopes. The app tool goes through the same
		// registrar as every other tool (schema bridging + instrumentation);
		// only its _meta marks it as backed by the preview app resource.
		const createToolAllowed = !allowedToolNames || allowedToolNames.has(createTool.name);
		if (featureFlags.mcpApps.enabled && createToolAllowed) {
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
			registerIfAllowed({
				...createTool,
				config: {
					...createTool.config,
					_meta: mcpAppToolMeta(WORKFLOW_PREVIEW_APP_URI),
				},
			});
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

		// Folder tools require the folders feature; unlicensed instances never
		// see them (the consent screen filters them the same way), matching the
		// license gate on the REST and public API folder endpoints.
		if (this.licenseState.isFoldersLicensed()) {
			const searchFoldersTool = createSearchFoldersTool(
				user,
				this.folderService,
				this.projectService,
				this.telemetry,
			);
			registerIfAllowed(searchFoldersTool);

			const createFolderTool = createCreateFolderTool(
				user,
				this.folderService,
				this.projectService,
				this.telemetry,
			);
			registerIfAllowed(createFolderTool);

			const updateFolderTool = createUpdateFolderTool(
				user,
				this.folderService,
				this.projectService,
				this.telemetry,
			);
			registerIfAllowed(updateFolderTool);

			const moveWorkflowsToFolderTool = createMoveWorkflowsToFolderTool(
				user,
				this.workflowFinderService,
				this.workflowService,
				this.folderFinderService,
				this.telemetry,
			);
			registerIfAllowed(moveWorkflowsToFolderTool);
		}

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
			this.aiGatewayService,
			{ canvasGroupsEnabled: featureFlags.canvasGroupsEnabled },
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
		registerResource({
			name: 'workflow-sdk-reference',
			uri: 'n8n://workflow-sdk/reference',
			config: {
				description:
					'Required n8n Workflow SDK reference for building workflows from code. Read this before writing workflow code.',
			},
			read: () => ({
				contents: [
					{
						uri: 'n8n://workflow-sdk/reference',
						mimeType: 'text/plain',
						text: getSdkReferenceContent(undefined, {
							includeGroups: featureFlags.canvasGroupsEnabled,
						}),
					},
				],
			}),
		});

		// SDK reference tool — always registered alongside the MCP resource above,
		// so all clients can access the SDK reference regardless of resource support.
		const sdkRefTool = createGetWorkflowSdkReferenceTool(user, this.telemetry, {
			canvasGroupsEnabled: featureFlags.canvasGroupsEnabled,
		});
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
