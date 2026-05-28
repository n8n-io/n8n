/**
 * Expression Path Validator Plugin
 *
 * Validates that $json and $('NodeName') expressions reference fields
 * that exist in predecessor node outputs.
 */

import { isNodeChain, type GraphNode, type NodeInstance } from '../../../types/base';
import { filterMethodsFromPath } from '../../string-utils';
import { extractExpressions, parseExpression, hasPath } from '../../validation-helpers';
import type { ValidatorPlugin, ValidationIssue, PluginContext } from '../types';

/**
 * Resolve the target node name from a connection target.
 * Handles both NodeInstance and InputTarget.
 */
function resolveTargetNodeName(target: unknown): string | undefined {
	if (!target) return undefined;

	// InputTarget shape: { node: NodeInstance, inputIndex: number }
	if (
		typeof target === 'object' &&
		'node' in target &&
		typeof (target as { node: unknown }).node === 'object'
	) {
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
 * Find all predecessors for a node by scanning all outgoing connections.
 */
function findPredecessors(nodeName: string, nodes: ReadonlyMap<string, GraphNode>): string[] {
	const predecessors: string[] = [];

	// Scan all nodes' connections to find which ones connect to this node
	for (const [sourceNodeName, graphNode] of nodes) {
		const mainConns = graphNode.connections.get('main');
		if (mainConns) {
			for (const [_outputIndex, targets] of mainConns) {
				for (const target of targets) {
					if (target.node === nodeName) {
						predecessors.push(sourceNodeName);
					}
				}
			}
		}

		// Also check connections declared via node's .to()
		if (typeof graphNode.instance.getConnections === 'function') {
			const connections = graphNode.instance.getConnections();
			for (const conn of connections) {
				const targetName = resolveTargetNodeName(conn.target);
				if (targetName === nodeName) {
					predecessors.push(sourceNodeName);
				}
			}
		}
	}

	return [...new Set(predecessors)];
}

/**
 * Validate that $json.path exists in predecessor outputs
 */
function validateJsonPath(
	nodeName: string,
	paramPath: string,
	fieldPath: string[],
	predecessors: string[],
	outputShapes: Map<string, Record<string, unknown>>,
	issues: ValidationIssue[],
): void {
	const validIn: string[] = [];
	const invalidIn: string[] = [];

	for (const pred of predecessors) {
		const shape = outputShapes.get(pred);
		if (shape) {
			if (hasPath(shape, fieldPath)) {
				validIn.push(pred);
			} else {
				invalidIn.push(pred);
			}
		}
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
				outputShapes.set(mapKey, unwrapItemJson(output[0] as Record<string, unknown>));
			}
		}

		// Second: fall back to node config pinData for nodes without output declarations
		for (const [mapKey, graphNode] of ctx.nodes) {
			if (!outputShapes.has(mapKey)) {
				const nodePinData = graphNode.instance.config?.pinData;
				if (nodePinData && nodePinData.length > 0) {
					outputShapes.set(mapKey, unwrapItemJson(nodePinData[0] as Record<string, unknown>));
				}
			}
		}

		// Third: fall back to workflow-level pinData for nodes without output or config pinData
		if (ctx.pinData) {
			for (const [nodeName, pinData] of Object.entries(ctx.pinData)) {
				// Only use pinData if we don't already have output from config
				if (!outputShapes.has(nodeName) && pinData.length > 0) {
					outputShapes.set(nodeName, unwrapItemJson(pinData[0] as Record<string, unknown>));
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
