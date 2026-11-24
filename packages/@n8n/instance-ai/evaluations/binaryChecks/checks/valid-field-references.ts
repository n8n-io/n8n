import { discoverOutputSchemaForNode, type JsonSchema } from '@n8n/workflow-sdk';

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
	/** The field path being read, e.g. `['body', 'email']` for `$json.body.email` */
	path: string[];
	/** The node name providing the data, or undefined for $json (upstream) */
	sourceNode: string | undefined;
	/** Where the reference starts in the expression */
	start: number;
	/** Where the reference ends, after any property access or call on it */
	end: number;
	/** False when a plain `.prop` read on the field would throw if the field is missing */
	safeWhenMissing: boolean;
}

/** Property access, optional chaining or calls that follow a matched reference. */
const ACCESS_TAIL = /^(?:\??\.\w+|(?:\?\.)?\[[^\]]*\]|(?:\?\.)?\(\))*/;
/** The text between two operands of one `??` / `||` chain. */
const FALLBACK_LINK = /^\s*\)*\s*(?:\?\?|\|\|)\s*\(*\s*$/;
/** One `.prop` / `?.prop` read in an access tail. A method name before `(` is not a field. */
const PATH_SEGMENT = /^\??\.(\w+)(?![\w(])/;

/** The nested field names read with dot access right after a field reference. */
function nestedPath(tail: string): string[] {
	const path: string[] = [];
	let rest = tail;
	for (let m = PATH_SEGMENT.exec(rest); m; m = PATH_SEGMENT.exec(rest)) {
		path.push(m[1]);
		rest = rest.slice(m[0].length);
	}
	return path;
}

function unescapeNodeName(raw: string): string {
	return raw.replace(/\\(.)/g, '$1');
}

/** Extract field references from a single expression string, in order of appearance. */
function extractFieldReferences(expression: string): FieldReference[] {
	const refs: FieldReference[] = [];
	const add = (m: RegExpMatchArray, field: string, sourceNode: string | undefined) => {
		const start = m.index ?? 0;
		const matchEnd = start + m[0].length;
		const tail = ACCESS_TAIL.exec(expression.slice(matchEnd))?.[0] ?? '';
		refs.push({
			path: [field, ...nestedPath(tail)],
			sourceNode,
			start,
			end: matchEnd + tail.length,
			safeWhenMissing: tail === '' || tail.startsWith('?.'),
		});
	};

	// $json.fieldName
	for (const m of expression.matchAll(JSON_FIELD_DOT)) add(m, m[1], undefined);

	// $json["fieldName"]
	for (const m of expression.matchAll(JSON_FIELD_BRACKET)) add(m, m[1], undefined);

	// $('NodeName')...json.fieldName
	for (const m of expression.matchAll(NAMED_NODE_FIELD_DOT)) add(m, m[3], unescapeNodeName(m[2]));

	// $('NodeName')...json["fieldName"]
	for (const m of expression.matchAll(NAMED_NODE_FIELD_BRACKET)) {
		add(m, m[3], unescapeNodeName(m[2]));
	}

	return refs.sort((x, y) => x.start - y.start);
}

/** Group references into `??` / `||` chains: each chain id is the index of its first reference. */
function fallbackChains(expression: string, refs: FieldReference[]): number[] {
	const chain: number[] = [];
	refs.forEach((ref, i) => {
		const linked = i > 0 && FALLBACK_LINK.test(expression.slice(refs[i - 1].end, ref.start));
		chain.push(linked ? chain[i - 1] : i);
	});
	return chain;
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

/** A closed object schema with the given top-level fields, whose values are not checked. */
function schemaWithFields(fields: string[]): JsonSchema {
	return { type: 'object', properties: Object.fromEntries(fields.map((f) => [f, {}])) };
}

/** Extract the known output schema for a node, or undefined if unknown. */
function getKnownOutputSchema(node: WorkflowNodeResponse): JsonSchema | undefined {
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
			return schemaWithFields(
				assignments.assignments.filter((a) => typeof a.name === 'string').map((a) => a.name!),
			);
		}
		return schemaWithFields([]);
	}

	// DataTable row operations: output includes user-defined columns + system columns
	if (node.type === DATA_TABLE_NODE_TYPE) {
		const params = node.parameters ?? {};
		const operation = typeof params.operation === 'string' ? params.operation : '';

		// Row insert/upsert/update return the row with all columns
		if (['insert', 'upsert', 'update'].includes(operation)) {
			const columns = params.columns as { value?: Record<string, unknown> } | undefined;
			const userFields = columns?.value ? Object.keys(columns.value) : [];
			return schemaWithFields([...userFields, ...DATA_TABLE_SYSTEM_FIELDS]);
		}

		// Row get/delete returns all table columns — can't know them statically
		return undefined;
	}

	// AI Agent nodes always output { output: string }
	if (AI_AGENT_TYPES.has(node.type)) {
		return schemaWithFields(['output']);
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

		if (schema?.properties) return schema;
	}

	// No schema available — can't validate
	return undefined;
}

type SchemaStep = { next: JsonSchema } | 'missing' | 'unknown';

/** Read one key of an object schema. Open objects accept keys they do not list. */
function stepInto(schema: JsonSchema, key: string): SchemaStep {
	const { properties, additionalProperties } = schema;
	if (properties && Object.hasOwn(properties, key)) return { next: properties[key] };
	if (typeof additionalProperties === 'object') return { next: additionalProperties };
	if (additionalProperties === true || !properties) return 'unknown';
	return 'missing';
}

type FieldState = 'present' | 'missing' | 'unknown';

/**
 * Only a missing top-level key is `missing`. Schema files list nested fields from
 * one sample response, so a missing nested key is `unknown`, not an error.
 */
function fieldState(schema: JsonSchema, path: string[]): FieldState {
	let current = schema;
	for (const [i, key] of path.entries()) {
		const step = stepInto(current, key);
		if (step === 'unknown') return 'present';
		if (step === 'missing') return i === 0 ? 'missing' : 'unknown';
		current = step.next;
	}
	return 'present';
}

/** The node a reference reads from: the named node, or the single upstream node for `$json`. */
function resolveSourceNode(
	ref: FieldReference,
	nodeName: string,
	nodeByName: Map<string, WorkflowNodeResponse>,
	upstreamMap: Map<string, string[]>,
): WorkflowNodeResponse | undefined {
	if (ref.sourceNode) return nodeByName.get(ref.sourceNode);
	const upstreamNames = upstreamMap.get(nodeName);
	// Multiple upstream nodes (merge): can't determine which
	return upstreamNames?.length === 1 ? nodeByName.get(upstreamNames[0]) : undefined;
}

// ---------------------------------------------------------------------------
// The check
// ---------------------------------------------------------------------------

export const validFieldReferences: BinaryCheck = {
	name: 'valid_field_references',
	description: 'Expressions reference fields that exist in upstream node output schemas',
	kind: 'deterministic',
	dimension: 'parameter_correctness',
	run(workflow: WorkflowResponse) {
		const nodes = workflow.nodes ?? [];

		const nodeByName = new Map(nodes.map((n) => [n.name, n]));
		const upstreamMap = buildUpstreamMap(workflow.connections ?? {});
		const invalid: string[] = [];
		let sawAnyFieldRef = false;

		for (const node of nodes) {
			if (!node.parameters) continue;

			const expressions = extractExpressionsFromParams(node.parameters);
			for (const expr of expressions) {
				const refs = extractFieldReferences(expr);
				if (refs.length > 0) sawAnyFieldRef = true;

				// present: the schema has the field or accepts unlisted keys;
				// missing: a known schema lacks the top-level key; unknown: no source or schema,
				// or a nested key that the schema does not list.
				const status = refs.map((ref) => {
					const sourceNode = resolveSourceNode(ref, node.name, nodeByName, upstreamMap);
					const schema = sourceNode ? getKnownOutputSchema(sourceNode) : undefined;
					if (!sourceNode || !schema) return { state: 'unknown' as const };
					const state = fieldState(schema, ref.path);
					return state === 'missing' ? { state, sourceNode } : { state };
				});
				const chain = fallbackChains(expr, refs);

				refs.forEach((ref, i) => {
					const result = status[i];
					if (result.state !== 'missing') return;
					// A missing field is fine when another alternative in its chain exists.
					const covered =
						ref.safeWhenMissing &&
						refs.some((_, j) => j !== i && chain[j] === chain[i] && status[j].state === 'present');
					if (covered) return;
					invalid.push(
						`"${ref.path[0]}" not in output of "${result.sourceNode.name}" (in node "${node.name}")`,
					);
				});
			}
		}

		if (!sawAnyFieldRef) return { pass: true, applicable: false };

		const unique = [...new Set(invalid)];

		return {
			pass: unique.length === 0,
			...(unique.length > 0
				? { comment: `Field references to non-existent output fields: ${unique.join(', ')}` }
				: {}),
		};
	},
};
