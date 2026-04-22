import { discoverOutputSchemaForNode } from '@n8n/workflow-sdk';

import type { WorkflowNodeResponse, WorkflowResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';
import { SET_NODE_TYPE, extractExpressionsFromParams } from '../utils';

// ---------------------------------------------------------------------------
// Expression field reference extraction
// ---------------------------------------------------------------------------

/**
 * Patterns that capture field paths from $json references in expressions.
 *
 * - `$json.fieldName` or `$json["fieldName"]` — references the immediately upstream node
 * - `$('NodeName').item.json.fieldName` — references a specific node
 */
const JSON_FIELD_DOT = /\$json\.(\w+)/g;
const JSON_FIELD_BRACKET = /\$json\[['"]([^'"]+)['"]\]/g;
const NAMED_NODE_FIELD_DOT =
	/\$\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)(?:\.first\(\)|\.\w+)*\.json\.(\w+)/g;
const NAMED_NODE_FIELD_BRACKET =
	/\$\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*\)(?:\.first\(\)|\.\w+)*\.json\[['"]([^'"]+)['"]\]/g;

interface FieldReference {
	/** The field name being accessed */
	field: string;
	/** The node name providing the data, or undefined for $json (upstream) */
	sourceNode: string | undefined;
}

function unescapeNodeName(raw: string): string {
	return raw.replace(/\\(.)/g, '$1');
}

/** Extract field references from a single expression string. */
function extractFieldReferences(expression: string): FieldReference[] {
	const refs: FieldReference[] = [];

	// $json.fieldName
	for (const m of expression.matchAll(JSON_FIELD_DOT)) {
		refs.push({ field: m[1], sourceNode: undefined });
	}

	// $json["fieldName"]
	for (const m of expression.matchAll(JSON_FIELD_BRACKET)) {
		refs.push({ field: m[1], sourceNode: undefined });
	}

	// $('NodeName')...json.fieldName
	for (const m of expression.matchAll(NAMED_NODE_FIELD_DOT)) {
		refs.push({ field: m[3], sourceNode: unescapeNodeName(m[2]) });
	}

	// $('NodeName')...json["fieldName"]
	for (const m of expression.matchAll(NAMED_NODE_FIELD_BRACKET)) {
		refs.push({ field: m[3], sourceNode: unescapeNodeName(m[2]) });
	}

	return refs;
}

// ---------------------------------------------------------------------------
// Upstream node resolution
// ---------------------------------------------------------------------------

/** Build a map from target node name to its immediate upstream (source) node names. */
function buildUpstreamMap(connections: Record<string, unknown>): Map<string, string[]> {
	const upstream = new Map<string, string[]>();

	for (const [sourceName, outputs] of Object.entries(connections)) {
		if (typeof outputs !== 'object' || outputs === null) continue;

		for (const connectionGroup of Object.values(outputs as Record<string, unknown>)) {
			if (!Array.isArray(connectionGroup)) continue;
			for (const outputSlot of connectionGroup) {
				if (!Array.isArray(outputSlot)) continue;
				for (const link of outputSlot) {
					if (typeof link === 'object' && link !== null && 'node' in link) {
						const target = (link as { node: string }).node;
						const existing = upstream.get(target);
						if (existing) {
							existing.push(sourceName);
						} else {
							upstream.set(target, [sourceName]);
						}
					}
				}
			}
		}
	}

	return upstream;
}

// ---------------------------------------------------------------------------
// Schema-based field resolution
// ---------------------------------------------------------------------------

const DATA_TABLE_NODE_TYPE = 'n8n-nodes-base.dataTable';
/** DataTable system columns always present in row output. */
const DATA_TABLE_SYSTEM_FIELDS = ['id', 'createdAt', 'updatedAt'];
const AI_AGENT_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.agent',
	'@n8n/n8n-nodes-langchain.openAi',
]);
/** Node types whose output is dynamic and can't be statically checked. */
const DYNAMIC_OUTPUT_TYPES = new Set([
	'n8n-nodes-base.code',
	'n8n-nodes-base.function',
	'n8n-nodes-base.functionItem',
	'n8n-nodes-base.executeWorkflow',
	'n8n-nodes-base.httpRequest',
]);

/** Extract the known output field names for a node, or undefined if unknown. */
function getKnownOutputFields(node: WorkflowNodeResponse): Set<string> | undefined {
	// Set nodes: output fields are only known when the node doesn't pass through
	// input fields. The include parameter (default 'all') or includeOtherFields
	// boolean (v3.3+) controls this. We can only infer exact output when neither
	// passes input through.
	if (node.type === SET_NODE_TYPE) {
		const params = node.parameters ?? {};
		const include = params.include as string | undefined;
		const includeOtherFields = params.includeOtherFields as boolean | undefined;

		// Default is 'all' / true — input fields pass through, so output is unknown
		if (includeOtherFields === true || (include !== undefined && include !== 'none')) {
			return undefined;
		}

		// If neither is explicitly set, the default behavior passes input through
		if (include === undefined && includeOtherFields === undefined) return undefined;

		const assignments = params.assignments as
			| { assignments?: Array<{ name?: string }> }
			| undefined;
		if (Array.isArray(assignments?.assignments)) {
			return new Set(
				assignments.assignments.filter((a) => typeof a.name === 'string').map((a) => a.name!),
			);
		}
		return new Set();
	}

	// DataTable row operations: output includes user-defined columns + system columns
	if (node.type === DATA_TABLE_NODE_TYPE) {
		const params = node.parameters ?? {};
		const operation = typeof params.operation === 'string' ? params.operation : '';

		// Row insert/upsert/update return the row with all columns
		if (['insert', 'upsert', 'update'].includes(operation)) {
			const columns = params.columns as { value?: Record<string, unknown> } | undefined;
			const userFields = columns?.value ? Object.keys(columns.value) : [];
			return new Set([...userFields, ...DATA_TABLE_SYSTEM_FIELDS]);
		}

		// Row get/delete returns all table columns — can't know them statically
		return undefined;
	}

	// AI Agent nodes always output { output: string }
	if (AI_AGENT_TYPES.has(node.type)) {
		return new Set(['output']);
	}

	// Dynamic output nodes — can't check statically
	if (DYNAMIC_OUTPUT_TYPES.has(node.type)) {
		return undefined;
	}

	// Try __schema__ discovery via workflow-sdk
	if (node.typeVersion !== undefined) {
		const params = node.parameters ?? {};
		const resource = typeof params.resource === 'string' ? params.resource : undefined;
		const operation = typeof params.operation === 'string' ? params.operation : undefined;

		const schema = discoverOutputSchemaForNode(node.type, node.typeVersion, {
			resource,
			operation,
		});

		if (schema?.properties) {
			return new Set(Object.keys(schema.properties));
		}
	}

	// No schema available — can't validate
	return undefined;
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

export const validFieldReferences: BinaryCheck = {
	name: 'valid_field_references',
	description: 'Expressions reference fields that exist in upstream node output schemas',
	kind: 'deterministic',
	run(workflow: WorkflowResponse) {
		const nodes = workflow.nodes ?? [];
		if (nodes.length === 0) return { pass: true };

		const nodeByName = new Map(nodes.map((n) => [n.name, n]));
		const upstreamMap = buildUpstreamMap(workflow.connections ?? {});
		const invalid: string[] = [];

		for (const node of nodes) {
			if (!node.parameters) continue;

			const expressions = extractExpressionsFromParams(node.parameters);
			for (const expr of expressions) {
				const refs = extractFieldReferences(expr);
				for (const ref of refs) {
					// Determine which node provides the data
					let sourceNode: WorkflowNodeResponse | undefined;

					if (ref.sourceNode) {
						// Explicit reference: $('NodeName').item.json.field
						sourceNode = nodeByName.get(ref.sourceNode);
					} else {
						// Implicit reference: $json.field — use first upstream node
						const upstreamNames = upstreamMap.get(node.name);
						if (upstreamNames && upstreamNames.length === 1) {
							sourceNode = nodeByName.get(upstreamNames[0]);
						}
						// Multiple upstream nodes (merge) — can't determine which, skip
					}

					if (!sourceNode) continue;

					const knownFields = getKnownOutputFields(sourceNode);
					if (!knownFields) continue; // No schema — skip gracefully

					if (!knownFields.has(ref.field)) {
						invalid.push(
							`"${ref.field}" not in output of "${sourceNode.name}" (in node "${node.name}")`,
						);
					}
				}
			}
		}

		const unique = [...new Set(invalid)];

		return {
			pass: unique.length === 0,
			...(unique.length > 0
				? { comment: `Field references to non-existent output fields: ${unique.join(', ')}` }
				: {}),
		};
	},
};
