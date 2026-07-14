import type { User } from '@n8n/db';
import z from 'zod';

import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { successResult } from '../tool-response';
import { getSdkReferenceHint } from '../workflow-validation.utils';
import { detectInvalidAiToolSource } from './connection-structure-check';
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
	warnings: z
		.array(
			z.object({
				code: z.string().describe('The warning code identifying the type of warning'),
				message: z.string().describe('The warning message'),
				nodeName: z.string().optional().describe('The node that triggered the warning'),
				parameterPath: z
					.string()
					.optional()
					.describe('The parameter path that triggered the warning'),
			}),
		)
		.optional()
		.describe('Validation warnings (if any)'),
	errors: z.array(z.string()).optional().describe('Validation errors (if invalid)'),
	hint: z
		.string()
		.optional()
		.describe(
			'Actionable hint for recovering from the error. When present, follow the suggested action before retrying.',
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that validates n8n Workflow SDK code.
 * Parses and validates the code, returning the workflow JSON if valid or errors if not.
 */
export const createValidateWorkflowCodeTool = (
	user: User,
	telemetry: Telemetry,
	nodeTypes: NodeTypes,
): ToolDefinition<typeof inputSchema> => ({
	name: CODE_BUILDER_VALIDATE_TOOL.toolName,
	config: {
		description:
			'Validate n8n Workflow SDK code. Required before creating or updating workflows from code. If you have not already read get_sdk_reference, call that first; guessing SDK syntax commonly creates invalid workflows.',
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
			const handler = new ParseValidateHandler({
				generatePinData: false,
				nodeTypesProvider: nodeTypes,
			});
			const strippedCode = stripImportStatements(code);
			const result = await handler.parseAndValidate(strippedCode);

			const invalidToolSourceError = detectInvalidAiToolSource(
				result.workflow,
				nodeTypes,
				telemetryPayload,
				telemetry,
			);
			if (invalidToolSourceError) {
				return successResult(outputSchema, { valid: false, errors: [invalidToolSourceError] });
			}

			telemetryPayload.results = {
				success: true,
				data: {
					nodeCount: result.workflow.nodes.length,
					warningCount: result.warnings.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return successResult(outputSchema, {
				valid: true,
				nodeCount: result.workflow.nodes.length,
				...(result.warnings.length > 0 ? { warnings: result.warnings } : {}),
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const hint = getSdkReferenceHint(error);

			// Invalid code is a successful validation outcome, not a tool failure:
			// the agent self-corrects from the structured `valid: false` + errors.
			return successResult(outputSchema, {
				valid: false,
				errors: [errorMessage],
				...(hint ? { hint } : {}),
			});
		}
	},
});
