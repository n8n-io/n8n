import type { User } from '@n8n/db';
import { UserError, WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import z from 'zod';

import type { ToolDefinition, WorkflowDetailsResult } from '../mcp.types';
import { workflowDetailsOutputSchema } from './schemas';
import { getWebhookDetails, type WebhookEndpoints } from './webhook-utils';

import type { CredentialsService } from '@/credentials/credentials.service';
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
				endpoints,
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
	endpoints: WebhookEndpoints,
	{ workflowId }: { workflowId: string },
): Promise<WorkflowDetailsResult> {
	const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
		'workflow:read',
	]);
	if (!workflow || workflow.isArchived || !workflow.settings?.availableInMCP) {
		throw new UserError('Workflow not found');
	}

	const webhooks = workflow.nodes.filter(
		(node) => node.type === WEBHOOK_NODE_TYPE && node.disabled !== true,
	);

	let triggerNotice = await getWebhookDetails(
		user,
		webhooks,
		baseWebhookUrl,
		credentialsService,
		endpoints,
	);

	triggerNotice += `${
		workflow.active
			? '\n- Workflow is active and accessible. Use the production path for live traffic; the test path remains available when listening for test events in the editor. n8n Webhooks nodes do not have information about required request payloads, so ask the user if that cannot be inferred from the workflow.'
			: '\n- Workflow is not active. Click "Listen for test event" in the editor and use the test path; activate the workflow to make the production path available.'
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
		settings: workflow.settings ?? null,
		connections: workflow.connections,
		nodes: workflow.nodes.map(({ credentials: _credentials, ...node }) => node),
		tags: (workflow.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
		meta: workflow.meta ?? null,
		parentFolderId: workflow.parentFolder?.id ?? null,
	};

	return { workflow: sanitizedWorkflow, triggerInfo: triggerNotice };
}
