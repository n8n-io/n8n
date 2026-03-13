import type { User } from '@n8n/db';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { Telemetry } from '@/telemetry';

import { CODE_BUILDER_VALIDATE_TOOL } from './constants';

const inputSchema = {
	code: z
		.string()
		.describe(
			'Full TypeScript/JavaScript workflow code using the n8n Workflow SDK. Must include the workflow export.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	valid: z.boolean().describe('Whether the workflow code is valid'),
	nodeCount: z.number().optional().describe('The number of nodes in the workflow (if valid)'),
	warnings: z.array(z.string()).optional().describe('Validation warnings (if any)'),
	errors: z.array(z.string()).optional().describe('Validation errors (if invalid)'),
} satisfies z.ZodRawShape;

/**
 * MCP tool that validates n8n Workflow SDK code.
 * Parses and validates the code, returning the workflow JSON if valid or errors if not.
 */
export const createValidateWorkflowCodeTool = (
	user: User,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: CODE_BUILDER_VALIDATE_TOOL.toolName,
	config: {
		description:
			'Validate n8n Workflow SDK code. Parses the code into a workflow and checks for errors. Returns the workflow JSON if valid, or detailed error messages to fix. Always validate before creating a workflow.',
		inputSchema,
		outputSchema,
		annotations: {
			title: CODE_BUILDER_VALIDATE_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ code }: { code: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: CODE_BUILDER_VALIDATE_TOOL.toolName,
			parameters: { codeLength: code.length },
		};

		try {
			const { ParseValidateHandler, stripImportStatements } = await import(
				'@n8n/ai-workflow-builder'
			);
			const handler = new ParseValidateHandler({ generatePinData: false });
			const strippedCode = stripImportStatements(code);
			const result = await handler.parseAndValidate(strippedCode);

			telemetryPayload.results = {
				success: true,
				data: {
					nodeCount: result.workflow.nodes.length,
					warningCount: result.warnings.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const response: Record<string, unknown> = {
				valid: true,
				nodeCount: result.workflow.nodes.length,
			};

			if (result.warnings.length > 0) {
				response.warnings = result.warnings;
			}

			return {
				content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
				structuredContent: response,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = {
				valid: false,
				errors: [errorMessage],
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
