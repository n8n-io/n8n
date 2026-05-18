import type { WorkflowJSON } from '@n8n/workflow-sdk';
import {
	getConnectionTypes,
	NodeConnectionTypes,
	type INodeOutputConfiguration,
	type NodeConnectionType,
} from 'n8n-workflow';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';

/**
 * Look up a node type's declared outputs. Returns `undefined` when the type is
 * unknown or its outputs are an expression (dynamic). Returns the static list
 * when it can be resolved.
 */
export type NodeOutputsResolver = (
	type: string,
	version: number,
) => Array<NodeConnectionType | INodeOutputConfiguration> | undefined;

export interface InvalidAiToolSource {
	sourceNode: string;
	sourceType: string;
	targets: string[];
}

/**
 * True when the node type can legitimately produce an `ai_tool` output, based
 * on its declared outputs. Conservative for cases we cannot resolve
 * statically:
 *
 * - Type names ending in `Tool` are accepted unconditionally. n8n auto-wraps
 *   `<x>Tool` requests to the underlying `<x>` node at lookup time, so its
 *   declared outputs (often `main`) no longer reflect the tool-wrapped shape.
 * - Unknown types and dynamic `outputs` expressions are accepted as well;
 *   we can't prove they're invalid, so we don't block creation on them.
 */
function isValidAiToolSourceType(
	type: string,
	version: number,
	resolveOutputs: NodeOutputsResolver,
): boolean {
	if (type.endsWith('Tool')) return true;

	const outputs = resolveOutputs(type, version);
	if (!outputs) return true;

	return getConnectionTypes(outputs).includes(NodeConnectionTypes.AiTool);
}

/**
 * Find `ai_tool` connections whose source node type does not declare an
 * `ai_tool` output. The agent node is the canonical case: it only outputs
 * `main`, so wiring it as a tool to another agent produces a workflow the
 * editor cannot render or reconnect. Returns one entry per offending source
 * node with its downstream targets.
 */
export function findInvalidAiToolSources(
	workflow: WorkflowJSON,
	resolveOutputs: NodeOutputsResolver,
): InvalidAiToolSource[] {
	const nodesByName = new Map<string, { type: string; typeVersion: number }>();
	for (const node of workflow.nodes) {
		if (node.name) {
			nodesByName.set(node.name, { type: node.type, typeVersion: node.typeVersion ?? 1 });
		}
	}

	const violations: InvalidAiToolSource[] = [];

	for (const [sourceNode, byType] of Object.entries(workflow.connections ?? {})) {
		const toolOutputs = byType?.[NodeConnectionTypes.AiTool];
		if (!Array.isArray(toolOutputs)) continue;

		const sourceMeta = nodesByName.get(sourceNode);
		if (!sourceMeta) continue;

		if (isValidAiToolSourceType(sourceMeta.type, sourceMeta.typeVersion, resolveOutputs)) continue;

		const targets: string[] = [];
		for (const outputs of toolOutputs) {
			if (!outputs) continue;
			for (const conn of outputs) {
				if (conn?.node) targets.push(conn.node);
			}
		}

		if (targets.length > 0) {
			violations.push({ sourceNode, sourceType: sourceMeta.type, targets });
		}
	}

	return violations;
}

/**
 * Format a violation list into a single human-readable message suitable for
 * returning to the MCP client.
 */
export function formatInvalidAiToolSourceMessage(violations: InvalidAiToolSource[]): string {
	const lines = violations.map(({ sourceNode, sourceType, targets }) => {
		const targetList = targets.map((t) => `'${t}'`).join(', ');
		return `'${sourceNode}' (${sourceType}) cannot be used as a tool for ${targetList} — its node type does not produce an 'ai_tool' output.`;
	});
	return [
		'Invalid connection: a node was wired as a tool to an agent, but its type does not produce an ai_tool output.',
		...lines,
		"Use a node whose type produces an 'ai_tool' output — typically any node with a 'Tool' suffix (e.g. '@n8n/n8n-nodes-langchain.toolCalculator', '@n8n/n8n-nodes-langchain.toolHttpRequest', or '@n8n/n8n-nodes-langchain.agentTool' for sub-agent calls).",
	].join(' ');
}

/**
 * Build a `NodeOutputsResolver` backed by the runtime NodeTypes registry.
 * Falls back to `undefined` for unknown / dynamic / unloadable types so the
 * caller treats those as "can't prove invalid".
 */
export function createNodeOutputsResolver(nodeTypes: NodeTypes): NodeOutputsResolver {
	return (type, version) => {
		try {
			const nodeType = nodeTypes.getByNameAndVersion(type, version);
			const outputs = nodeType?.description?.outputs;
			if (!Array.isArray(outputs)) return undefined;
			return outputs;
		} catch {
			return undefined;
		}
	};
}

/**
 * Run the invalid-ai_tool-source check and, if any violations are found,
 * track a failure telemetry event and return an MCP error response. Returns
 * `null` when the workflow is clean so the caller can continue normally.
 *
 * The caller controls the structured output shape via `buildOutput`, since
 * `validate_workflow_code` returns `{ valid: false, errors: [...] }` while
 * `create_workflow_from_code` returns `{ error }`.
 */
export function buildInvalidAiToolSourceErrorResponse<T extends Record<string, unknown>>(
	workflow: WorkflowJSON,
	nodeTypes: NodeTypes,
	buildOutput: (errorMessage: string) => T,
	telemetryPayload: UserCalledMCPToolEventPayload,
	telemetry: Telemetry,
): {
	content: Array<{ type: 'text'; text: string }>;
	structuredContent: T;
	isError: true;
} | null {
	const violations = findInvalidAiToolSources(workflow, createNodeOutputsResolver(nodeTypes));
	if (violations.length === 0) return null;

	const errorMessage = formatInvalidAiToolSourceMessage(violations);

	telemetryPayload.results = { success: false, error: errorMessage };
	telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

	const output = buildOutput(errorMessage);
	return {
		content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
		structuredContent: output,
		isError: true,
	};
}
