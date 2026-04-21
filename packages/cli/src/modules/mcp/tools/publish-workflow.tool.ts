import type { User } from '@n8n/db';
import { jsonStringify, ensureError } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to publish'),
	versionId: z
		.string()
		.optional()
		.describe(
			'Optional version ID to publish. If not provided, publishes the current draft version.',
		),
});

type PublishWorkflowOutput = {
	success: boolean;
	workflowId: string;
	activeVersionId: string | null;
	error?: string;
};

const outputSchema = {
	success: z.boolean(),
	workflowId: z.string(),
	activeVersionId: z.string().nullable(),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

export const createPublishWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowService: WorkflowService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'publish_workflow',
	config: {
		description:
			'Publish (activate) a workflow to make it available for production execution. This creates an active version from the current draft.',
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Publish Workflow',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId, versionId }: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'publish_workflow',
			parameters: { workflowId, versionId },
		};

		try {
			await getMcpWorkflow(workflowId, user, ['workflow:publish'], workflowFinderService);

			const activatedWorkflow = await workflowService.activateWorkflow(user, workflowId, {
				versionId,
				source: 'n8n-mcp',
			});

			const output: PublishWorkflowOutput = {
				success: true,
				workflowId: activatedWorkflow.id,
				activeVersionId: activatedWorkflow.activeVersionId,
			};

			telemetryPayload.results = {
				success: true,
				data: {
					workflow_id: workflowId,
					active_version_id: activatedWorkflow.activeVersionId,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const output: PublishWorkflowOutput = {
				success: false,
				workflowId,
				activeVersionId: null,
				error: error.message,
			};

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		}
	},
});
