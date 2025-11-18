import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import { SUPPORTED_MCP_TRIGGERS, USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type {
	ToolDefinition,
	WorkflowDetailsResult,
	UserCalledMCPToolEventPayload,
} from '../mcp.types';
import { workflowDetailsOutputSchema } from './schemas';
import { getTriggerDetails, type WebhookEndpoints } from './webhook-utils';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to retrieve'),
} satisfies z.ZodRawShape;

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
	endpoints: WebhookEndpoints,
	telemetry: Telemetry,
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
		handler: async ({ workflowId }) => {
			const parameters = { workflowId };
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
					endpoints,
					{ workflowId },
				);

				// Track successful execution
				telemetryPayload.results = {
					success: true,
					data: {
						workflow_id: workflowId,
						workflow_name: payload.workflow.name,
						trigger_count: payload.workflow.triggerCount,
						node_count: payload.workflow.nodes.length,
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
	endpoints: WebhookEndpoints,
	{ workflowId }: { workflowId: string },
): Promise<WorkflowDetailsResult> {
	const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
		'workflow:read',
	]);
	if (!workflow || workflow.isArchived || !workflow.settings?.availableInMCP) {
		throw new UserError('Workflow not found');
	}

	const supportedTriggers = Object.keys(SUPPORTED_MCP_TRIGGERS);
	const triggers = workflow.nodes.filter(
		(node) => supportedTriggers.includes(node.type) && node.disabled !== true,
	);

	const triggerNotice = await getTriggerDetails(
		user,
		triggers,
		baseWebhookUrl,
		credentialsService,
		endpoints,
	);

	const sanitizedWorkflow: WorkflowDetailsResult['workflow'] = {
		id: workflow.id,
		name: workflow.name,
		active: workflow.activeVersionId !== null,
		isArchived: workflow.isArchived,
		versionId: workflow.versionId,
		triggerCount: workflow.triggerCount,
		createdAt: workflow.createdAt.toISOString(),
		updatedAt: workflow.updatedAt.toISOString(),
		settings: workflow.settings ?? null,
		connections: workflow.connections,
		nodes: workflow.nodes.map(({ credentials: _credentials, ...node }) => node),
		tags: (workflow.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
		meta: workflow.meta ?? null,
		parentFolderId: workflow.parentFolder?.id ?? null,
		description: workflow.description ?? undefined,
	};

	return { workflow: sanitizedWorkflow, triggerInfo: triggerNotice };
}
