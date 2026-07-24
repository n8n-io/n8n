import type { User } from '@n8n/db';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	isNodeConnectionType,
	isSafeObjectProperty,
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
 *
 * Node names and connection types come from submitted code, so keys that
 * resolve to object internals (`__proto__`, `constructor`, ...) are skipped —
 * assigning them onto a plain object would mutate its prototype instead of
 * creating an own property, silently corrupting the re-keyed connections.
 */
function toWorkflowConnections(connections: WorkflowJSON['connections']): IConnections {
	const bySourceNode: IConnections = {};
	for (const [sourceNode, byType] of Object.entries(connections ?? {})) {
		if (!isSafeObjectProperty(sourceNode)) continue;
		const nodeConnections: INodeConnections = {};
		for (const [connectionType, outputs] of Object.entries(byType)) {
			if (!isSafeObjectProperty(connectionType)) continue;
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
