import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import z from 'zod';

import type { ToolDefinition, WorkflowDetailsResult } from '../mcp.types';
import { nodeSchema, tagSchema } from './schemas';
import { getWebhookDetails } from './webhook-utils';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to retrieve'),
} satisfies z.ZodRawShape;

const outputSchema = {
	workflow: z
		.object({
			id: z.string(),
			name: z.string().nullable(),
			active: z.boolean(),
			isArchived: z.boolean(),
			versionId: z.string(),
			triggerCount: z.number(),
			createdAt: z.string().nullable(),
			updatedAt: z.string().nullable(),
			settings: z.record(z.unknown()).nullable(),
			connections: z.record(z.unknown()),
			nodes: z.array(nodeSchema),
			tags: z.array(tagSchema),
			meta: z.record(z.unknown()).nullable(),
			parentFolderId: z.string().nullable(),
		})
		.passthrough()
		.describe('Sanitized workflow data safe for MCP consumption'),
	triggerInfo: z
		.string()
		.describe('Human-readable instructions describing how to trigger the workflow'),
} satisfies z.ZodRawShape;

/**
 * Creates mcp tool definition for retrieving detailed information about a specific workflow, including its trigger details.
 */
export const createWorkflowDetailsTool = (
	user: User,
	baseWebhookUrl: string,
	workflowFinderService: WorkflowFinderService,
	credentialsService: CredentialsService,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'get_workflow_details',
		config: {
			description: 'Get detailed information about a specific workflow including trigger details',
			inputSchema,
			outputSchema,
		},
		handler: async ({ workflowId }) => {
			const payload = await getWorkflowDetails(
				user,
				baseWebhookUrl,
				workflowFinderService,
				credentialsService,
				{ workflowId },
			);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		},
	};
};

export async function getWorkflowDetails(
	user: User,
	baseWebhookUrl: string,
	workflowFinderService: WorkflowFinderService,
	credentialsService: CredentialsService,
	{ workflowId }: { workflowId: string },
): Promise<WorkflowDetailsResult> {
	const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
		'workflow:read',
	]);
	if (!workflow || workflow.isArchived || !workflow.settings?.availableInMCP) {
		throw new UserError('Workflow not found');
	}

	const webhooks = workflow.nodes.filter(
		(node) => node.type === 'n8n-nodes-base.webhook' && node.disabled !== true,
	);

	let triggerNotice = await getWebhookDetails(
		user,
		webhooks,
		baseWebhookUrl,
		workflow.active ?? false,
		credentialsService,
	);

	triggerNotice += `${
		workflow.active
			? '\n- Workflow is active and accessible. n8n Webhooks nodes do not have information about required request payloads, if that cannot be determined from the workflow itself, ask the user to provide it.'
			: '\n- Workflow is not active, it can only be triggered after clicking "Listen for test event" button in the n8n editor.'
	}`;

	const sanitizedWorkflow: WorkflowDetailsResult['workflow'] = {
		id: workflow.id,
		name: workflow.name,
		active: workflow.active,
		isArchived: workflow.isArchived,
		versionId: workflow.versionId,
		triggerCount: workflow.triggerCount,
		createdAt: workflow.createdAt.toISOString(),
		updatedAt: workflow.updatedAt.toISOString(),
		settings: workflow.settings,
		connections: workflow.connections,
		nodes: workflow.nodes.map(({ credentials: _credentials, ...node }) => node),
		tags: (workflow.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
		meta: workflow.meta ?? null,
		parentFolderId: workflow.parentFolder?.id ?? null,
	};

	return { workflow: sanitizedWorkflow, triggerInfo: triggerNotice };
}
