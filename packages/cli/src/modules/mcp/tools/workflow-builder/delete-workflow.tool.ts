import type { TelemetryProxy } from '@n8n/backend-services';
import type { OperationContext, User } from '@n8n/db';
import { Container } from '@n8n/di';
import z from 'zod';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { MCP_ARCHIVE_WORKFLOW_TOOL } from './constants';
import { McpConfirmationService } from '../../mcp-confirmation.service';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type {
	ToolDefinition,
	ToolHandlerResult,
	UserCalledMCPToolEventPayload,
} from '../../mcp.types';
import { getMcpWorkflow } from '../workflow-validation.utils';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to archive'),
} satisfies z.ZodRawShape;

const outputSchema = {
	archived: z.boolean().describe('Whether the workflow was archived'),
	workflowId: z.string().describe('The ID of the archived workflow'),
	name: z.string().describe('The name of the archived workflow'),
} satisfies z.ZodRawShape;

/**
 * MCP tool that archives a workflow in n8n by ID.
 */
export const createArchiveWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowService: WorkflowService,
	telemetry: TelemetryProxy,
	collaborationService: CollaborationService,
	ctx: OperationContext = {},
): ToolDefinition<typeof inputSchema, ToolHandlerResult> => ({
	name: MCP_ARCHIVE_WORKFLOW_TOOL.toolName,
	config: {
		description: 'Archive a workflow in n8n by its ID.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_ARCHIVE_WORKFLOW_TOOL.displayTitle,
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId }: { workflowId: string }, extra?: unknown) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_ARCHIVE_WORKFLOW_TOOL.toolName,
			parameters: { workflowId },
		};

		try {
			const existing = await getMcpWorkflow(
				workflowId,
				user,
				['workflow:delete'],
				workflowFinderService,
			);

			const confirmed = await Container.get(McpConfirmationService).confirm(extra, user, {
				tool: MCP_ARCHIVE_WORKFLOW_TOOL.toolName,
				args: { workflowId },
				message: `Archive ${existing.name} (ID: ${workflowId})`,
				approval: {
					approvalDetails: { action: 'archive-workflow', name: existing.name, id: workflowId },
					resourceName: existing.name,
					severity: 'warning',
				},
			});
			if (confirmed.kind === 'ask') return confirmed.result;
			if (confirmed.kind !== 'proceed') {
				throw new Error(
					confirmed.kind === 'declined'
						? 'The user declined to archive the workflow.'
						: 'The confirmation does not match this request. Ask again.',
				);
			}

			await collaborationService.ensureWorkflowEditable(workflowId);

			const workflow = await workflowService.archive(user, workflowId, { skipArchived: true }, ctx);

			if (!workflow) {
				throw new Error("Workflow not found or you don't have permission to archive it.");
			}

			void collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

			telemetryPayload.results = {
				success: true,
				data: { workflowId },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = {
				archived: true,
				workflowId,
				name: workflow.name,
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { error: errorMessage };

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
