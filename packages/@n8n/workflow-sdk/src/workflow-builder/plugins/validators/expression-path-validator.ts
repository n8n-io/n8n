/**
 * Expression Path Validator Plugin
 *
 * Validates that $json and $('NodeName') expressions reference fields
 * that exist in predecessor node outputs.
 */

import {
	isNodeChain,
	resolveErrorOutputIndex,
	type GraphNode,
	type NodeInstance,
} from '../../../types/base';
import { filterMethodsFromPath, parseVersion } from '../../string-utils';
import { extractExpressions, parseExpression, hasPath } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Resolve the target node name from a connection target.
 * Handles both NodeInstance and InputTarget.
 */
function resolveTargetNodeName(target: unknown): string | undefined {
	if (!target) return undefined;

	// InputTarget shape: { node: NodeInstance, inputIndex: number }
	if (typeof target === 'object' && 'node' in target && typeof target.node === 'object') {
		const nodeTarget = (target as { node: { name?: string } }).node;
		return nodeTarget?.name;
	}

	// NodeChain - resolve to head node (the actual direct connection target)
	if (isNodeChain(target)) {
		return target.head.name;
	}

	// Direct NodeInstance shape
	if (typeof target === 'object' && 'name' in target) {
		return (target as { name: string }).name;
	}

	return undefined;
}

/**
 * A direct predecessor of a node. `isErrorOutput` is true when the connection
 * leaves the source node's error output, whose items carry an `error` field.
 */
interface Predecessor {
	name: string;
	isErrorOutput: boolean;
}

function isErrorOutputIndex(graphNode: GraphNode, outputIndex: number): boolean {
	const { config, type, version } = graphNode.instance;
	if (config?.onError !== 'continueErrorOutput') return false;
	const errorIndex = resolveErrorOutputIndex({
		type,
		typeVersion: parseVersion(version),
		parameters: config.parameters,
	});
	return outputIndex === errorIndex;
}

/**
 * Classify a connection from a source node. Connections declared with
 * `.onError()` use the `error` connection type at output 0; connections in the
 * `main` type leave the error output only at the type-specific error index.
 */
function isErrorConnection(
	graphNode: GraphNode,
	connectionType: string | undefined,
	outputIndex: number,
): boolean {
	if (connectionType === 'error') return true;
	return isErrorOutputIndex(graphNode, outputIndex);
}

/**
 * Collect, for each connection from a source node to `nodeName`, whether it
 * leaves the error output. Reads both the connections map and connections
 * declared via the node's .to() / .onError().
 */
function findConnectionKindsTo(nodeName: string, graphNode: GraphNode): boolean[] {
	const kinds: boolean[] = [];

	for (const [connectionType, outputs] of graphNode.connections) {
		if (connectionType !== 'main' && connectionType !== 'error') continue;
		for (const [outputIndex, targets] of outputs) {
			if (targets.some((target) => target.node === nodeName)) {
				kinds.push(isErrorConnection(graphNode, connectionType, outputIndex));
			}
		}
	}

	if (typeof graphNode.instance.getConnections === 'function') {
		for (const conn of graphNode.instance.getConnections()) {
			if (resolveTargetNodeName(conn.target) === nodeName) {
				kinds.push(isErrorConnection(graphNode, conn.connectionType, conn.outputIndex));
			}
		}
	}

	return kinds;
}

/**
 * Find all predecessors for a node by scanning all outgoing connections.
 * A source node appears at most once for each output kind (success or error).
 */
function findPredecessors(nodeName: string, nodes: ReadonlyMap<string, GraphNode>): Predecessor[] {
	const predecessors = new Map<string, Predecessor>();

	for (const [sourceNodeName, graphNode] of nodes) {
		for (const isErrorOutput of findConnectionKindsTo(nodeName, graphNode)) {
			predecessors.set(`${sourceNodeName}:${isErrorOutput}`, {
				name: sourceNodeName,
				isErrorOutput,
			});
		}
	}

	return [...predecessors.values()];
}

/** Label a predecessor in messages, so its success and error outputs read apart. */
function describePredecessor(pred: Predecessor): string {
	return pred.isErrorOutput ? `${pred.name} (error output)` : pred.name;
}

/**
 * Check whether a predecessor outputs `fieldPath`. Returns undefined when the
 * output shape of the predecessor is unknown.
 *
 * An error output item is the node's input item plus `error`, not the node's
 * normal output. Any path under `error` is valid, because its content varies
 * by node. Other paths come from the unknown input, so they stay unknown.
 */
function predecessorHasPath(
	pred: Predecessor,
	fieldPath: string[],
	outputShapes: Map<string, Record<string, unknown>>,
): boolean | undefined {
	if (pred.isErrorOutput) return fieldPath[0] === 'error' ? true : undefined;
	const shape = outputShapes.get(pred.name);
	return shape ? hasPath(shape, fieldPath) : undefined;
}

/**
 * Validate that $json.path exists in predecessor outputs
 */
function validateJsonPath(
	nodeName: string,
	paramPath: string,
	fieldPath: string[],
	predecessors: Predecessor[],
	outputShapes: Map<string, Record<string, unknown>>,
	issues: ValidationIssue[],
): void {
	const validIn: string[] = [];
	const invalidIn: string[] = [];

	for (const pred of predecessors) {
		const found = predecessorHasPath(pred, fieldPath, outputShapes);
		if (found === true) validIn.push(describePredecessor(pred));
		if (found === false) invalidIn.push(describePredecessor(pred));
	}

	const fieldPathStr = fieldPath.join('.');

	if (invalidIn.length > 0 && validIn.length === 0) {
		issues.push({
			code: 'INVALID_EXPRESSION_PATH',
			message: `'${nodeName}' parameter '${paramPath}' uses $json.${fieldPathStr} but no predecessor outputs this field.`,
			severity: 'warning',
			nodeName,
			parameterPath: paramPath,
		});
	} else if (invalidIn.length > 0 && validIn.length > 0) {
		issues.push({
			code: 'PARTIAL_EXPRESSION_PATH',
			message: `'${nodeName}' parameter '${paramPath}' uses $json.${fieldPathStr} - exists in [${validIn.join(', ')}] but NOT in [${invalidIn.join(', ')}].`,
			severity: 'warning',
			nodeName,
			parameterPath: paramPath,
		});
	}
}

/**
 * Validate that $('NodeName').item.json.path references a valid field
 */
function validateNodePath(
	nodeName: string,
	paramPath: string,
	referencedNode: string,
	fieldPath: string[],
	outputShapes: Map<string, Record<string, unknown>>,
	issues: ValidationIssue[],
): void {
	const shape = outputShapes.get(referencedNode);

	if (shape && !hasPath(shape, fieldPath)) {
		issues.push({
			code: 'INVALID_EXPRESSION_PATH',
			message: `'${nodeName}' parameter '${paramPath}' uses $('${referencedNode}').item.json.${fieldPath.join('.')} but '${referencedNode}' doesn't output this field.`,
			severity: 'warning',
			nodeName,
			parameterPath: paramPath,
		});
	}
}

/**
 * Unwrap the `json` property from an n8n output item.
 * Output items are stored as `{ json: { field: value } }` but expressions
 * reference fields directly (e.g. `$json.field`), so we need to unwrap.
 */
function unwrapItemJson(item: Record<string, unknown>): Record<string, unknown> {
	if ('json' in item && typeof item.json === 'object' && item.json !== null) {
		return item.json as Record<string, unknown>;
	}
	return item;
}

/**
 * Validator for expression paths.
 *
 * Checks for:
 * - $json paths that don't exist in predecessor outputs
 * - $('NodeName').item.json paths that don't exist in referenced node output
 *
 * This is a workflow-level validator that uses pinData and node config output
 * to determine available fields.
 */
export const expressionPathValidator: ValidatorPlugin = {
	id: 'core:expression-path',
	name: 'Expression Path Validator',
	priority: 20,

	validateNode(
		_node: NodeInstance<string, string, unknown>,
		_graphNode: GraphNode,
		_ctx: PluginContext,
	): ValidationIssue[] {
		// Node-level validation is empty - all validation happens at workflow level
		return [];
	},

	validateWorkflow(ctx: PluginContext): ValidationIssue[] {
		const issues: ValidationIssue[] = [];

		// Build output shapes from node config's output property first, then fall back to pinData
		const outputShapes = new Map<string, Record<string, unknown>>();

		// First: collect output declarations from node configs (LLM-generated)
		for (const [mapKey, graphNode] of ctx.nodes) {
			const output = graphNode.instance.config?.output;
			if (output && output.length > 0) {
				outputShapes.set(mapKey, unwrapItemJson(output[0]));
			}
		}

		// Second: fall back to node config pinData for nodes without output declarations
		for (const [mapKey, graphNode] of ctx.nodes) {
			if (!outputShapes.has(mapKey)) {
				const nodePinData = graphNode.instance.config?.pinData;
				if (nodePinData && nodePinData.length > 0) {
					outputShapes.set(mapKey, unwrapItemJson(nodePinData[0]));
				}
			}
		}

		// Third: fall back to workflow-level pinData for nodes without output or config pinData
		if (ctx.pinData) {
			for (const [nodeName, pinData] of Object.entries(ctx.pinData)) {
				// Only use pinData if we don't already have output from config
				if (!outputShapes.has(nodeName) && pinData.length > 0) {
					outputShapes.set(nodeName, unwrapItemJson(pinData[0]));
				}
			}
		}

		// Skip if no output data declared
		if (outputShapes.size === 0) {
			return issues;
		}

		for (const [mapKey, graphNode] of ctx.nodes) {
			const params = graphNode.instance.config?.parameters;
			if (!params) continue;

			const expressions = extractExpressions(params);
			const predecessors = findPredecessors(mapKey, ctx.nodes);

			for (const { expression, path } of expressions) {
				const parsed = parseExpression(expression);
				// Filter out JS methods from field path (e.g., "output.includes" -> "output")
				const filteredFieldPath = filterMethodsFromPath(parsed.fieldPath);

				if (parsed.type === '$json' && filteredFieldPath.length > 0) {
					validateJsonPath(mapKey, path, filteredFieldPath, predecessors, outputShapes, issues);
				}

				if (parsed.type === '$node' && parsed.nodeName && filteredFieldPath.length > 0) {
					validateNodePath(mapKey, path, parsed.nodeName, filteredFieldPath, outputShapes, issues);
				}
			}
		}

		return issues;
	},
};
