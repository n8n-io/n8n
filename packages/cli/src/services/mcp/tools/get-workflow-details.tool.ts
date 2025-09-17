import type { User } from '@n8n/db';
import { OperationalError } from 'n8n-workflow';
import z from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { ToolDefinition } from '../mcp.types';
import { getWebhookDetails } from './utils';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to retrieve'),
} satisfies z.ZodRawShape;

export const createWorkflowDetailsTool = (
	user: User,
	baseWebhookUrl: string,
	workflowFinderService: WorkflowFinderService,
	credentialsService: CredentialsService,
): ToolDefinition<typeof inputSchema> => {
	return {
		name: 'get_workflow_details',
		config: {
			description: 'Get information about a specific workflow including trigger details',
			inputSchema,
		},
		handler: async ({ workflowId }) => {
			const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
				'workflow:read',
			]);
			if (!workflow || workflow.isArchived || !workflow.settings?.availableInMCP) {
				throw new OperationalError('Workflow not found');
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
					: '\n- Workflow is not active, it can only be triggered after clicking "Listen for test	 event" button in the n8n editor.'
			}`;

			// Remove sensitive information
			// TODO: Check what else should be removed
			workflow.pinData = undefined;
			workflow.nodes.forEach((node) => {
				node.credentials = undefined;
			});

			return {
				content: [{ type: 'text', text: JSON.stringify({ workflow, triggerInfo: triggerNotice }) }],
			};
		},
	};
};
