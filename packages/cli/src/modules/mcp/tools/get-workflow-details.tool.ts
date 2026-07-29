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
import { getMcpWorkflow } from './workflow-validation.utils';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to retrieve'),
	detailLevel: z
		.enum(['full', 'execution'])
		.default('full')
		.describe(
			"Level of detail to return. 'full' (default) includes the complete workflow payload. 'execution' returns only the workflow metadata and trigger information needed to run it — prefer it when the goal is just to execute the workflow via execute_workflow.",
		),
} satisfies z.ZodRawShape;

export type WorkflowDetailsLevel = z.infer<typeof inputSchema.detailLevel>;

export type WorkflowDetailsOutputSchema = typeof workflowDetailsOutputSchema;

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
				const { nodeCount, ...payload } = await getWorkflowDetails(
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
						node_count: nodeCount,
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
): Promise<WorkflowDetailsResult & { nodeCount: number }> {
	const includeGraph = detailLevel === 'full';
	// The active version is loaded even in execution mode: production executions
	// run it, so its triggers feed activeVersionTriggerInfo when they diverge
	// from the draft's.
	const workflow = await getMcpWorkflow(
		workflowId,
		user,
		['workflow:read'],
		workflowFinderService,
		{ includeActiveVersion: true, includeTags: true },
	);

	// Compute user scopes for this workflow
	const projectRelations = await projectService.getProjectRelationsForUser(user);
	const workflowWithScopes = roleService.addScopes(workflow, user, projectRelations);
	const scopes = workflowWithScopes.scopes ?? [];
	const canExecute = scopes.includes('workflow:execute');

	const nodes = workflow.nodes ?? [];

	const supportedTriggers = Object.keys(SUPPORTED_MCP_TRIGGERS);
	const splitTriggers = (candidates: INode[]) => {
		const enabledNodes = candidates.filter((node) => node.disabled !== true);
		return {
			supported: enabledNodes.filter((node) => supportedTriggers.includes(node.type)),
			// Triggers the workflow does have but MCP can't execute directly (e.g. Gmail Trigger),
			// so the notice can distinguish these from a workflow with no triggers at all.
			unsupported: enabledNodes.filter(
				(node) => isTriggerNodeType(node.type) && !supportedTriggers.includes(node.type),
			),
		};
	};

	const draftTriggers = splitTriggers(nodes);
	const triggerNotice = await getTriggerDetails(
		user,
		draftTriggers.supported,
		draftTriggers.unsupported,
		baseWebhookUrl,
		credentialsService,
		nodeTypes,
		endpoints,
		workflow.id,
		testBaseWebhookUrl,
	);

	// execute_workflow runs the published (active) version in production mode, so
	// when its triggers diverge from the draft's (edited but not republished),
	// surface the published version's trigger info alongside the draft's.
	let activeVersionTriggerNotice: string | undefined;
	if (workflow.activeVersionId && workflow.activeVersion) {
		const publishedTriggers = splitTriggers(workflow.activeVersion.nodes ?? []);
		if (JSON.stringify(publishedTriggers) !== JSON.stringify(draftTriggers)) {
			activeVersionTriggerNotice = await getTriggerDetails(
				user,
				publishedTriggers.supported,
				publishedTriggers.unsupported,
				baseWebhookUrl,
				credentialsService,
				nodeTypes,
				endpoints,
				workflow.id,
				testBaseWebhookUrl,
			);
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
		createdAt: workflow.createdAt.toISOString(),
		updatedAt: workflow.updatedAt.toISOString(),
		tags: toTagSummary(workflow.tags),
		parentFolderId: workflow.parentFolder?.id ?? null,
		description: workflow.description ?? undefined,
		scopes,
		canExecute,
		// The graph fields dominate the response size; skip them when the caller
		// only needs enough to execute the workflow.
		...(includeGraph
			? {
					settings: workflow.settings ?? null,
					connections: workflow.connections ?? {},
					nodes: nodes.map(sanitizeNodeCredentials),
					nodeGroups: toNodeGroupSummary(workflow.nodeGroups ?? [], nodes),
					// Publishing sets activeVersionId to the draft's versionId and every
					// draft save regenerates versionId, so equality means the published
					// graph is byte-identical to the draft — skip repeating it.
					activeVersion:
						workflow.activeVersionId && workflow.activeVersion
							? workflow.activeVersionId === workflow.versionId
								? { sameAsDraft: true as const }
								: {
										sameAsDraft: false as const,
										nodes: (workflow.activeVersion.nodes ?? []).map(sanitizeNodeCredentials),
										connections: workflow.activeVersion.connections ?? {},
										nodeGroups: toNodeGroupSummary(
											workflow.activeVersion.nodeGroups ?? [],
											workflow.activeVersion.nodes ?? [],
										),
									}
							: null,
					meta: workflow.meta ?? null,
				}
			: {}),
	};

	return {
		workflow: sanitizedWorkflow,
		triggerInfo: triggerNotice,
		activeVersionTriggerInfo: activeVersionTriggerNotice,
		// Not part of the MCP response; lets the handler report the workflow size
		// in telemetry even when detailLevel omits the nodes from the payload.
		nodeCount: nodes.length,
	};
}
