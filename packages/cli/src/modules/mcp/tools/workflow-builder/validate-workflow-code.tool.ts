import type { User } from '@n8n/db';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	isNodeConnectionType,
	validateWorkflowGroups,
	type IConnections,
	type INode,
	type INodeConnections,
} from 'n8n-workflow';
import z from 'zod';

import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';
import { makeGetNodeTypeForGrouping } from '@/workflow-helpers';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { getSdkReferenceHint } from '../workflow-validation.utils';
import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { CODE_BUILDER_VALIDATE_TOOL } from './constants';

/** Warning code carried by node-group rule violations in the tool response. */
export const INVALID_NODE_GROUP_WARNING_CODE = 'INVALID_NODE_GROUP';

export type ValidateWorkflowCodeToolOptions = {
	/**
	 * `102_mcp_canvas_groups` rollout flag: when true, node-group rule violations
	 * are surfaced as warnings and traced in telemetry. Off by default — the tool
	 * then behaves exactly as before groups were validated.
	 */
	canvasGroupsEnabled?: boolean;
};

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
 * Bridges the SDK's connections to `n8n-workflow`'s `IConnections`. The two
 * declare duplicate but formally separate connection types (the SDK types
 * `IConnection.type` as plain `string`), so the values are re-keyed through the
 * `isNodeConnectionType` guard. Serializer output only ever carries known
 * connection types; if an unknown one ever slips through, that connection is
 * skipped here and the save path still rejects the workflow.
 */
function toWorkflowConnections(connections: WorkflowJSON['connections']): IConnections {
	const bySourceNode: IConnections = {};
	for (const [sourceNode, byType] of Object.entries(connections ?? {})) {
		const nodeConnections: INodeConnections = {};
		for (const [connectionType, outputs] of Object.entries(byType)) {
			nodeConnections[connectionType] = outputs.map(
				(outputConnections) =>
					outputConnections?.flatMap((connection) =>
						isNodeConnectionType(connection.type) ? [{ ...connection, type: connection.type }] : [],
					) ?? null,
			);
		}
		bySourceNode[sourceNode] = nodeConnections;
	}
	return bySourceNode;
}

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
		console.log('[🤖 VALIDATE TOOL] groups: ', options.canvasGroupsEnabled);

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

			// `102_mcp_canvas_groups` rollout: surface node-group rule violations at
			// validate time, with the same messages the save path rejects with. Flag
			// off: output and telemetry are identical to before groups existed.
			const groupWarnings: Array<{ code: string; message: string }> = [];
			let groupViolationCodes: string[] = [];
			if (options.canvasGroupsEnabled && (result.workflow.nodeGroups?.length ?? 0) > 0) {
				// The group validator only reads id/name/type (+ typeVersion via
				// getNodeType); map the SDK's NodeJSON (optional name/parameters)
				// to the INode shape it expects. Parameters are never read, so an
				// empty object is passed instead of bridging the parameter types.
				const groupValidationNodes: INode[] = result.workflow.nodes.map((node) => ({
					id: node.id,
					name: node.name ?? '',
					type: node.type,
					typeVersion: node.typeVersion,
					position: node.position,
					parameters: {},
				}));
				const groupsResult = validateWorkflowGroups({
					nodes: groupValidationNodes,
					connectionsBySourceNode: toWorkflowConnections(result.workflow.connections),
					nodeGroups: result.workflow.nodeGroups,
					getNodeType: makeGetNodeTypeForGrouping(nodeTypes),
				});
				if (!groupsResult.valid) {
					groupWarnings.push(
						...groupsResult.violations.map((violation) => ({
							code: INVALID_NODE_GROUP_WARNING_CODE,
							message: violation.message,
						})),
					);
					groupViolationCodes = [
						...new Set(groupsResult.violations.map((violation) => violation.code)),
					];
				}
			}

			telemetryPayload.results = {
				success: true,
				data: {
					nodeCount: result.workflow.nodes.length,
					// SDK validation warnings only — group violations are counted
					// separately so the metric keeps its meaning across flag cohorts.
					warningCount: result.warnings.length,
					...(options.canvasGroupsEnabled
						? {
								groupCount: result.workflow.nodeGroups?.length ?? 0,
								groupViolationCount: groupWarnings.length,
								...(groupViolationCodes.length > 0 ? { groupViolationCodes } : {}),
							}
						: {}),
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const response: Record<string, unknown> = {
				valid: true,
				nodeCount: result.workflow.nodes.length,
			};

			const warnings = [...result.warnings, ...groupWarnings];
			if (warnings.length > 0) {
				response.warnings = warnings;
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
