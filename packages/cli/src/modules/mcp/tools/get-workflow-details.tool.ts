import type { User } from '@n8n/db';
import { isTriggerNodeType, type INode, type INodeTypes } from 'n8n-workflow';
import z from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { SUPPORTED_MCP_TRIGGERS, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type {
	ToolDefinition,
	WorkflowDetailsResult,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';
import {
	sanitizeNodeCredentials,
	toNodeGroupSummary,
	toTagSummary,
	workflowDetailsOutputSchema,
} from './schemas';
import { getTriggerDetails, type WebhookEndpoints } from './webhook-utils';
import { getMcpWorkflow, type FoundWorkflow } from './workflow-validation.utils';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to retrieve'),
	detailLevel: z
		.enum(['full', 'execution'])
		.default('full')
		.describe(
			"Level of detail to return. 'full' (default) includes the complete workflow payload. 'execution' returns only the workflow metadata and trigger information needed to run it — prefer it when the goal is just to execute the workflow via execute_workflow.",
		),
} satisfies z.ZodRawShape;

type WorkflowDetailsLevel = z.infer<typeof inputSchema.detailLevel>;

export type WorkflowDetailsOutputSchema = typeof workflowDetailsOutputSchema;

const SUPPORTED_TRIGGER_TYPES = Object.keys(SUPPORTED_MCP_TRIGGERS);

/**
 * Splits a version's nodes into the triggers MCP can execute directly and the
 * triggers it cannot (e.g. Gmail Trigger). Keeping the unsupported ones lets the
 * notice distinguish a workflow whose triggers MCP can't drive from one with no
 * triggers at all. Disabled nodes are dropped, since they never fire.
 */
const splitTriggers = (candidates: INode[]) => {
	const enabledNodes = candidates.filter((node) => node.disabled !== true);
	return {
		supported: enabledNodes.filter((node) => SUPPORTED_TRIGGER_TYPES.includes(node.type)),
		unsupported: enabledNodes.filter(
			(node) => isTriggerNodeType(node.type) && !SUPPORTED_TRIGGER_TYPES.includes(node.type),
		),
	};
};

/**
 * The published graph, for the full payload only. Null when the workflow has no
 * published version. A bare marker when the published snapshot is the draft:
 * activeVersionId names the published version and any draft change to nodes,
 * connections or node groups regenerates versionId, so equality means the two
 * are byte-identical and repeating the graph would just double the payload.
 */
const toActiveVersionSummary = (workflow: FoundWorkflow) => {
	if (!workflow.activeVersionId || !workflow.activeVersion) return null;
	if (workflow.activeVersionId === workflow.versionId) return { sameAsDraft: true as const };

	const publishedNodes = workflow.activeVersion.nodes ?? [];
	return {
		sameAsDraft: false as const,
		nodes: publishedNodes.map(sanitizeNodeCredentials),
		connections: workflow.activeVersion.connections ?? {},
		nodeGroups: toNodeGroupSummary(workflow.activeVersion.nodeGroups ?? [], publishedNodes),
	};
};

const outputSchema = workflowDetailsOutputSchema.shape satisfies z.ZodRawShape;

/**
 * Creates mcp tool definition for retrieving detailed information about a specific workflow, including its trigger details.
 */
export const createWorkflowDetailsTool = (
	user: User,
	baseWebhookUrl: string,
	workflowFinderService: WorkflowFinderService,
	credentialsService: CredentialsService,
	nodeTypes: INodeTypes,
	endpoints: WebhookEndpoints,
	telemetry: Telemetry,
	roleService: RoleService,
	projectService: ProjectService,
	testBaseWebhookUrl: string = baseWebhookUrl,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'get_workflow_details',
		config: {
			description: 'Get detailed information about a specific workflow including trigger details',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Get Workflow Details',
				readOnlyHint: true, // This tool only reads data
				destructiveHint: false, // No destructive operations
				idempotentHint: true, // Safe to retry multiple times
				openWorldHint: false, // Works with internal n8n data only
			},
		},
		// The SDK parses arguments through the input schema before invoking the
		// handler, so detailLevel arrives with its schema default applied.
		handler: async ({
			workflowId,
			detailLevel,
		}: {
			workflowId: string;
			detailLevel: WorkflowDetailsLevel;
		}) => {
			const parameters = { workflowId, detailLevel };
			const telemetryPayload: UserCalledMCPToolEventPayload = {
				user_id: user.id,
				tool_name: 'get_workflow_details',
				parameters,
			};

			try {
				const payload = await getWorkflowDetails(
					user,
					baseWebhookUrl,
					workflowFinderService,
					credentialsService,
					nodeTypes,
					endpoints,
					roleService,
					projectService,
					{ workflowId, detailLevel },
					testBaseWebhookUrl,
				);

				// Track successful execution
				telemetryPayload.results = {
					success: true,
					data: {
						workflow_id: workflowId,
						workflow_name: payload.workflow.name,
						trigger_count: payload.workflow.triggerCount,
						node_count: payload.workflow.nodeCount,
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

				return {
					content: [{ type: 'text', text: JSON.stringify(payload) }],
					structuredContent: payload,
				};
			} catch (error) {
				// Track failed execution
				telemetryPayload.results = {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
				throw error;
			}
		},
	};
};

export async function getWorkflowDetails(
	user: User,
	baseWebhookUrl: string,
	workflowFinderService: WorkflowFinderService,
	credentialsService: CredentialsService,
	nodeTypes: INodeTypes,
	endpoints: WebhookEndpoints,
	roleService: RoleService,
	projectService: ProjectService,
	{ workflowId, detailLevel = 'full' }: { workflowId: string; detailLevel?: WorkflowDetailsLevel },
	testBaseWebhookUrl: string = baseWebhookUrl,
): Promise<WorkflowDetailsResult> {
	const includeGraph = detailLevel === 'full';
	// The published version is loaded in both modes: execution mode omits its
	// graph from the payload but still compares its triggers against the draft's
	// to decide whether activeVersionTriggerInfo is needed.
	const workflow = await getMcpWorkflow(
		workflowId,
		user,
		['workflow:read'],
		workflowFinderService,
		{ includeActiveVersion: true, includeTags: true, includeParentFolder: true },
	);

	// Compute user scopes for this workflow
	const projectRelations = await projectService.getProjectRelationsForUser(user);
	const workflowWithScopes = roleService.addScopes(workflow, user, projectRelations);
	const scopes = workflowWithScopes.scopes ?? [];
	const canExecute = scopes.includes('workflow:execute');

	const nodes = workflow.nodes ?? [];

	const noticeFor = async ({ supported, unsupported }: ReturnType<typeof splitTriggers>) =>
		await getTriggerDetails(
			user,
			supported,
			unsupported,
			baseWebhookUrl,
			credentialsService,
			nodeTypes,
			endpoints,
			workflow.id,
			testBaseWebhookUrl,
		);

	const draftTriggers = splitTriggers(nodes);
	const triggerNotice = await noticeFor(draftTriggers);

	// execute_workflow runs the published version in production mode, so when its
	// triggers diverge from the draft's (edited but not republished), surface the
	// published trigger info alongside the draft's. Publishing points
	// activeVersionId at the version being published, so the relation below is
	// that same version.
	//
	// Two guards keep this off the common path: an unedited draft cannot diverge,
	// and a node-level comparison skips the second lookup when the triggers are
	// untouched. Only a genuinely different notice is emitted, so changes that do
	// not affect trigger info (e.g. node position) stay silent.
	const hasDivergedPublishedVersion =
		workflow.activeVersionId !== null && workflow.activeVersionId !== workflow.versionId;
	const publishedNodes = hasDivergedPublishedVersion ? workflow.activeVersion?.nodes : undefined;
	let activeVersionTriggerNotice: string | undefined;
	if (publishedNodes) {
		const publishedTriggers = splitTriggers(publishedNodes);
		if (JSON.stringify(publishedTriggers) !== JSON.stringify(draftTriggers)) {
			const publishedNotice = await noticeFor(publishedTriggers);
			if (publishedNotice !== triggerNotice) {
				activeVersionTriggerNotice = publishedNotice;
			}
		}
	}

	const sanitizedWorkflow: WorkflowDetailsResult['workflow'] = {
		id: workflow.id,
		name: workflow.name,
		active: workflow.activeVersionId !== null,
		isArchived: workflow.isArchived,
		versionId: workflow.versionId,
		activeVersionId: workflow.activeVersionId,
		triggerCount: workflow.triggerCount,
		// Reported in both modes so callers (and telemetry) can size the workflow
		// without the trimmed payload having to carry the nodes.
		nodeCount: nodes.length,
		createdAt: workflow.createdAt.toISOString(),
		updatedAt: workflow.updatedAt.toISOString(),
		settings: workflow.settings ?? null,
		tags: toTagSummary(workflow.tags),
		parentFolderId: workflow.parentFolder?.id ?? null,
		description: workflow.description ?? undefined,
		scopes,
		canExecute,
		// The graph fields dominate the response size; skip them when the caller
		// only needs enough to execute the workflow.
		...(includeGraph
			? {
					connections: workflow.connections ?? {},
					nodes: nodes.map(sanitizeNodeCredentials),
					nodeGroups: toNodeGroupSummary(workflow.nodeGroups ?? [], nodes),
					activeVersion: toActiveVersionSummary(workflow),
					meta: workflow.meta ?? null,
				}
			: {}),
	};

	return {
		workflow: sanitizedWorkflow,
		triggerInfo: triggerNotice,
		activeVersionTriggerInfo: activeVersionTriggerNotice,
	};
}
