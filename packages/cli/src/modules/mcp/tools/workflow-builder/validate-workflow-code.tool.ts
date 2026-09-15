import type { User } from '@n8n/db';
import { toEngineConnections, toGroupValidationNodes } from '@n8n/workflow-sdk';
import { validateWorkflowGroups } from 'n8n-workflow';
import z from 'zod';

import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';
import { makeGetNodeTypeForGrouping } from '@/workflow-helpers';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { getSdkReferenceHint } from '../workflow-validation.utils';
import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { CODE_BUILDER_VALIDATE_TOOL, MAX_WORKFLOW_CODE_LENGTH } from './constants';

export type ValidateWorkflowCodeToolOptions = {
	/**
	 * `102_mcp_canvas_groups` rollout flag: when true, node-group rule violations
	 * are reported as validation errors (`valid: false`) — they hard-block the
	 * save path — and traced in telemetry. Off by default — the tool then
	 * behaves exactly as before groups were validated.
	 */
	canvasGroupsEnabled?: boolean;
};

const inputSchema = {
	code: z
		.string()
		.max(MAX_WORKFLOW_CODE_LENGTH)
		.describe(
			`Full TypeScript/JavaScript workflow code using the n8n Workflow SDK. Must include the workflow export. Max ${MAX_WORKFLOW_CODE_LENGTH} characters.`,
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
	options: ValidateWorkflowCodeToolOptions = {},
): ToolDefinition<typeof inputSchema> => ({
	name: CODE_BUILDER_VALIDATE_TOOL.toolName,
	config: {
		description:
			'Validate n8n Workflow SDK code. Required before creating or updating workflows from code. If you have not already read get_workflow_sdk_reference, call that first; guessing SDK syntax commonly creates invalid workflows.',
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

			const invalidToolSourceResponse = buildInvalidAiToolSourceErrorResponse(
				result.workflow,
				nodeTypes,
				(errorMessage) => ({ valid: false, errors: [errorMessage] }),
				telemetryPayload,
				telemetry,
			);
			if (invalidToolSourceResponse) return invalidToolSourceResponse;

			// `102_mcp_canvas_groups` rollout: report node-group rule violations as
			// validation errors, with the same messages the save path rejects with —
			// like the ai_tool-source check above, they hard-block saving. Flag off:
			// output and telemetry are identical to before groups existed.
			if (options.canvasGroupsEnabled && (result.workflow.nodeGroups?.length ?? 0) > 0) {
				const groupsResult = validateWorkflowGroups({
					nodes: toGroupValidationNodes(result.workflow.nodes),
					connectionsBySourceNode: toEngineConnections(result.workflow.connections),
					nodeGroups: result.workflow.nodeGroups,
					getNodeType: makeGetNodeTypeForGrouping(nodeTypes),
				});
				if (!groupsResult.valid) {
					const errorMessages = groupsResult.violations.map((violation) => violation.message);

					telemetryPayload.results = {
						success: false,
						error: errorMessages.join(' '),
						data: {
							groupCount: result.workflow.nodeGroups?.length ?? 0,
							groupViolationCount: groupsResult.violations.length,
							groupViolationCodes: [
								...new Set(groupsResult.violations.map((violation) => violation.code)),
							],
						},
					};
					telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

					const output = { valid: false, errors: errorMessages };
					return {
						content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
						structuredContent: output,
						isError: true,
					};
				}
			}

			telemetryPayload.results = {
				success: true,
				data: {
					nodeCount: result.workflow.nodes.length,
					warningCount: result.warnings.length,
					// Rollout monitoring for `102_mcp_canvas_groups`; absent when the
					// flag is off so the payload stays identical across cohorts.
					...(options.canvasGroupsEnabled
						? { groupCount: result.workflow.nodeGroups?.length ?? 0 }
						: {}),
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

			const hint = getSdkReferenceHint(error);

			const output = {
				valid: false,
				errors: [errorMessage],
				...(hint ? { hint } : {}),
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
