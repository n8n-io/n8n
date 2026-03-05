import { type User, WorkflowEntity } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { CODE_BUILDER_VALIDATE_TOOL, MCP_UPDATE_WORKFLOW_TOOL } from './constants';

import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to update'),
	code: z
		.string()
		.describe(
			`Full TypeScript/JavaScript workflow code using the n8n Workflow SDK. Must be validated first with ${CODE_BUILDER_VALIDATE_TOOL.toolName}.`,
		),
	name: z
		.string()
		.max(128)
		.optional()
		.describe('Optional workflow name. If not provided, uses the name from the code.'),
	description: z
		.string()
		.max(255)
		.optional()
		.describe(
			'Short workflow description summarizing what it does (1-2 sentences, max 255 chars).',
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that updates a workflow in n8n from validated SDK code.
 * Parses the code, validates it, and updates the existing workflow.
 * Only workflows that are available in MCP can be updated.
 */
export const createUpdateWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowService: WorkflowService,
	urlService: UrlService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
	config: {
		description: `Update an existing workflow in n8n from validated SDK code. Parses the code into a workflow and saves the changes. Always validate with ${CODE_BUILDER_VALIDATE_TOOL.toolName} first.`,
		inputSchema,
		annotations: {
			title: MCP_UPDATE_WORKFLOW_TOOL.displayTitle,
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowId,
		code,
		name,
		description,
	}: {
		workflowId: string;
		code: string;
		name?: string;
		description?: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
			parameters: { workflowId, codeLength: code.length, hasName: !!name },
		};

		try {
			// Fetch the workflow to check if it's available in MCP
			const existingWorkflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
				'workflow:update',
			]);

			if (!existingWorkflow) {
				throw new Error("Workflow not found or you don't have permission to update it.");
			}

			if (!existingWorkflow.settings?.availableInMCP) {
				throw new Error(
					'This workflow is not available in MCP. Only workflows created via MCP can be updated.',
				);
			}

			const { ParseValidateHandler, stripImportStatements } = await import(
				'@n8n/ai-workflow-builder'
			);

			const handler = new ParseValidateHandler({ generatePinData: false });
			const strippedCode = stripImportStatements(code);
			const result = await handler.parseAndValidate(strippedCode);
			const workflowJson = result.workflow;

			const workflowUpdateData = new WorkflowEntity();
			Object.assign(workflowUpdateData, {
				name: name ?? workflowJson.name,
				...(description !== undefined ? { description } : {}),
				nodes: workflowJson.nodes,
				connections: workflowJson.connections,
				settings: workflowJson.settings,
				pinData: workflowJson.pinData,
				meta: { ...workflowJson.meta, aiBuilderAssisted: true },
			});

			const updatedWorkflow = await workflowService.update(user, workflowUpdateData, workflowId, {
				aiBuilderAssisted: true,
			});

			const baseUrl = urlService.getInstanceBaseUrl();
			const workflowUrl = `${baseUrl}/workflow/${updatedWorkflow.id}`;

			telemetryPayload.results = {
				success: true,
				data: {
					workflowId: updatedWorkflow.id,
					nodeCount: updatedWorkflow.nodes.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								workflowId: updatedWorkflow.id,
								name: updatedWorkflow.name,
								nodeCount: updatedWorkflow.nodes.length,
								url: workflowUrl,
							},
							null,
							2,
						),
					},
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({ error: errorMessage }, null, 2),
					},
				],
				isError: true,
			};
		}
	},
});
