/**
 * Pin Data Utilities
 *
 * Shared functions for determining which nodes need pin data,
 * discovering output schemas, inferring schemas from execution data,
 * and normalizing pin data format.
 *
 * Used by the MCP test tools and AI workflow builder.
 */

import type { INode, INodeExecutionData, IPinData } from 'n8n-workflow';
import { HTTP_REQUEST_NODE_TYPE } from 'n8n-workflow';

import {
	discoverSchemasForNode,
	findSchemaForOperation,
	generateJsonSchemaFromData,
	type JsonSchema,
} from './generate-types';

// =============================================================================
// Pin Data Eligibility
// =============================================================================

/**
 * Callback to determine if a node is a trigger node.
 * Consumers provide this because trigger detection requires node type
 * registry access, which varies between runtime contexts.
 */
export type IsTriggerNodeFn = (node: INode) => boolean;

/**
 * Determine if a node needs pin data for test execution.
 *
 * Nodes that need pin data (can't execute without real services):
 * - Trigger nodes (can't fire without real events)
 * - Nodes with credentials configured (would fail without valid credentials)
 * - HTTP Request nodes (call external services directly)
 *
 * All other nodes (Set, If, Switch, Code, Merge, etc.)
 * should execute normally to test the workflow logic.
 *
 * @param node The workflow node to check
 * @param isTriggerNode Callback that returns true if the node is a trigger node.
 *   When not provided, trigger detection is skipped (only credentials and HTTP Request are checked).
 */
export function needsPinData(node: INode, isTriggerNode?: IsTriggerNodeFn): boolean {
	if (isTriggerNode?.(node)) {
		return true;
	}

	if (node.credentials && Object.keys(node.credentials).length > 0) {
		return true;
	}

	if (node.type === HTTP_REQUEST_NODE_TYPE) {
		return true;
	}

	return false;
}

// =============================================================================
// Schema Discovery
// =============================================================================

/**
 * Discover the output JSON Schema for a node from its type definition.
 *
 * Combines `discoverSchemasForNode` + `findSchemaForOperation` with a
 * single-schema fallback when no resource/operation discriminators exist.
 *
 * @param nodeType Full node type string (e.g. 'n8n-nodes-base.slack')
 * @param typeVersion The node's version number
 * @param parameters Optional node parameters containing resource/operation
 * @returns The discovered JSON Schema, or undefined if none found
 */
export function discoverOutputSchemaForNode(
	nodeType: string,
	typeVersion: number,
	parameters?: { resource?: string; operation?: string },
): JsonSchema | undefined {
	if (!nodeType) return undefined;

	const version = typeof typeVersion === 'number' ? typeVersion : Number(typeVersion);
	const schemas = discoverSchemasForNode(nodeType, version);
	if (schemas.length === 0) return undefined;

	const resource = parameters?.resource ?? '';
	const operation = parameters?.operation ?? '';

	if (resource || operation) {
		const match = findSchemaForOperation(schemas, resource, operation);
		return match?.schema;
	}

	if (schemas.length === 1) {
		return schemas[0].schema;
	}

	return undefined;
}

// =============================================================================
// Execution Data Schema Inference
// =============================================================================

/**
 * Infer JSON Schemas from execution run data for multiple nodes.
 *
 * Takes already-fetched run data (consumers are responsible for how they
 * obtain it) and returns a schema per node, derived from the first output
 * item's shape. No actual data values are retained.
 *
 * @param runData Map of node names to their execution output items
 * @returns Map of node names to inferred JSON Schemas
 */
export function inferSchemasFromRunData(
	runData: Record<string, INodeExecutionData[]>,
): Record<string, JsonSchema> {
	const schemas: Record<string, JsonSchema> = {};

	for (const [nodeName, nodeData] of Object.entries(runData)) {
		if (!nodeData?.[0]) continue;

		const firstItem = nodeData[0].json;
		if (!firstItem || Object.keys(firstItem).length === 0) continue;

		const schema = generateJsonSchemaFromData(firstItem);
		if (schema) {
			schemas[nodeName] = schema;
		}
	}

	return schemas;
}

// =============================================================================
// Pin Data Normalization
// =============================================================================

/**
 * Normalize pin data items to ensure each has a "json" wrapper.
 * LLM clients may send flat objects like [{"id": "123"}] instead of
 * the required [{"json": {"id": "123"}}] format.
 */
export function normalizePinData(pinData: IPinData): IPinData {
	const normalized: IPinData = {};
	for (const [nodeName, items] of Object.entries(pinData)) {
		normalized[nodeName] = items.map((item) => {
			// Items with a valid json property (must be an object/IDataObject) pass through.
			// Malformed items (e.g. { json: "string" }) are treated as flat objects and wrapped,
			// since INodeExecutionData.json must be a Record, not a primitive.
			if ('json' in item && typeof item.json === 'object' && item.json !== null) {
				return item;
			}
			return { json: item } as INodeExecutionData;
		});
	}
	return normalized;
}
