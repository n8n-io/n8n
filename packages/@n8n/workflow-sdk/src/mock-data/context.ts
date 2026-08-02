import { DATA_TABLE_SYSTEM_COLUMNS } from 'n8n-workflow';

import { findEnvelopeKey } from './ai-root-shapes';
import type {
	DataTableColumnInfo,
	DeclaredFieldContract,
	NodeSchemaContext,
	OutputParserContext,
	OutputSchemaLookup,
} from './types';
import type { NodeJSON, WorkflowJSON } from '../types/base';

export const INFORMATION_EXTRACTOR_NODE_TYPE = '@n8n/n8n-nodes-langchain.informationExtractor';

/**
 * Assemble the per-node contexts the generation prompt is built from.
 * Schema enrichment happens through the injected lookup (consumers pass
 * n8n-core's `__schema__` resolver); absent lookup = no schema sections.
 * `dataTableColumns` (node name → real table columns) comes from consumers
 * with instance access — the pinned rows must mirror those exact keys.
 */
export function buildSchemaContexts(
	nodes: NodeJSON[],
	outputSchemaLookup?: OutputSchemaLookup,
	outputParserTargets?: Map<string, OutputParserContext>,
	dataTableColumns?: Record<string, DataTableColumnInfo[]>,
): NodeSchemaContext[] {
	return nodes.map((node) => {
		const params = node.parameters as Record<string, unknown> | undefined;
		const resource = typeof params?.resource === 'string' ? params.resource : undefined;
		const operation = typeof params?.operation === 'string' ? params.operation : undefined;
		// An information extractor declares its output schema in its OWN
		// parameters (there is no parser sub-node to read it from) — surface it
		// through the same outputParser slot so the prompt embeds it.
		const outputParser =
			(node.name ? outputParserTargets?.get(node.name) : undefined) ??
			(node.type === INFORMATION_EXTRACTOR_NODE_TYPE
				? extractInformationExtractorSchema(params)
				: undefined);

		const schema = outputSchemaLookup?.({
			type: node.type,
			typeVersion: node.typeVersion,
			resource,
			operation,
			hasOutputParser: node.name ? outputParserTargets?.has(node.name) === true : false,
		});

		const nodeName = node.name ?? node.type;
		const columns = dataTableColumns?.[nodeName];

		return {
			nodeName,
			nodeType: node.type,
			typeVersion: node.typeVersion,
			resource,
			operation,
			schema,
			outputParser,
			dataTableColumns: columns,
			declaredFields: buildDeclaredFieldContract(node.type, schema, outputParser, columns),
		};
	});
}

/**
 * Envelope key the parsed fields sit under, if any. Shared with the prompt
 * builder so the shape asked for and the shape enforced can't drift: the
 * extractor always wraps in `output` even when the `__schema__` lookup is
 * unavailable, while parser targets get theirs from the resolved with-parser
 * schema variant.
 */
export function resolveEnvelopeKey(
	nodeType: string,
	schema: Record<string, unknown> | undefined,
): string | undefined {
	return (
		findEnvelopeKey(schema) ?? (nodeType === INFORMATION_EXTRACTOR_NODE_TYPE ? 'output' : undefined)
	);
}

/**
 * Derive the field-name contract pinned items are validated against.
 * Data Table columns are exact (real rows always carry every column);
 * schema-declared fields allow a subset (optional fields may be absent).
 */
function buildDeclaredFieldContract(
	nodeType: string,
	schema: Record<string, unknown> | undefined,
	outputParser: OutputParserContext | undefined,
	columns: DataTableColumnInfo[] | undefined,
): DeclaredFieldContract | undefined {
	if (columns && columns.length > 0) {
		return {
			keys: [...DATA_TABLE_SYSTEM_COLUMNS, ...columns.map((c) => c.name)],
			exact: true,
			source: 'data-table-columns',
		};
	}

	if (outputParser?.schemaText) {
		const keys = deriveTopLevelKeys(outputParser.schemaText, outputParser.schemaIsExample);
		if (keys.length > 0) {
			const envelopeKey = resolveEnvelopeKey(nodeType, schema);
			return { keys, envelopeKey, exact: false, source: 'declared-schema' };
		}
	}

	return undefined;
}

/** Top-level field names of a JSON Schema (`properties` keys) or an example object. */
function deriveTopLevelKeys(schemaText: string, isExample: boolean): string[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(schemaText);
	} catch {
		return [];
	}
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return [];
	const record = parsed as Record<string, unknown>;
	if (isExample) return Object.keys(record);
	const properties = record.properties;
	if (typeof properties !== 'object' || properties === null) return [];
	return Object.keys(properties);
}

/**
 * Read the information extractor's own declared schema off its parameters:
 * `fromAttributes` holds an attribute list (synthesized into a JSON Schema
 * here), `fromJson` an example object, `manual` a JSON Schema — mirroring the
 * fields the structured output parser node uses.
 */
function extractInformationExtractorSchema(
	params: Record<string, unknown> | undefined,
): OutputParserContext | undefined {
	if (!params) return undefined;
	const schemaType = typeof params.schemaType === 'string' ? params.schemaType : 'fromAttributes';

	if (schemaType === 'fromAttributes') {
		const attributesWrapper = params.attributes as Record<string, unknown> | undefined;
		const attributes = Array.isArray(attributesWrapper?.attributes)
			? attributesWrapper.attributes
			: [];
		const properties: Record<string, unknown> = {};
		const required: string[] = [];
		for (const attribute of attributes) {
			if (typeof attribute !== 'object' || attribute === null) continue;
			const { name, type, description } = attribute as Record<string, unknown>;
			if (typeof name !== 'string' || name.length === 0) continue;
			properties[name] = {
				type: typeof type === 'string' ? type : 'string',
				...(typeof description === 'string' && description ? { description } : {}),
			};
			if ((attribute as Record<string, unknown>).required === true) required.push(name);
		}
		if (Object.keys(properties).length === 0) return undefined;
		return {
			schemaText: JSON.stringify({ type: 'object', properties, required }, null, 2),
			schemaIsExample: false,
		};
	}

	const candidate = schemaType === 'manual' ? params.inputSchema : params.jsonSchemaExample;
	const schemaText = schemaDeclarationText(candidate);
	if (schemaText) {
		return { schemaText, schemaIsExample: schemaType !== 'manual' };
	}
	return undefined;
}

/**
 * Schema declarations are JSON strings in the editor, but eval builders
 * sometimes store them as raw objects — those still declare the field names
 * the pin must follow, so read both forms.
 */
export function schemaDeclarationText(candidate: unknown): string | undefined {
	if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim();
	if (typeof candidate === 'object' && candidate !== null) {
		try {
			return JSON.stringify(candidate);
		} catch {
			return undefined;
		}
	}
	return undefined;
}

/**
 * Map AI root node name → structured output parser context, discovered from
 * `ai_outputParser` connections (parser node is the connection SOURCE, the
 * root is the target). Roots with a parser wrap their result in an
 * `{ output: <parsed object> }` envelope at runtime — pinned data must match
 * that envelope or downstream `$json.output.*` references resolve undefined.
 */
export function findOutputParserTargets(workflow: WorkflowJSON): Map<string, OutputParserContext> {
	const result = new Map<string, OutputParserContext>();
	const nodesByName = new Map<string, NodeJSON>();
	for (const node of workflow.nodes) {
		if (node.name) nodesByName.set(node.name, node);
	}

	for (const [sourceName, nodeConns] of Object.entries(workflow.connections ?? {})) {
		const parserConns = (nodeConns as Record<string, unknown>).ai_outputParser;
		if (!Array.isArray(parserConns)) continue;
		const parserNode = nodesByName.get(sourceName);
		const context = extractParserContext(parserNode);

		for (const group of parserConns) {
			if (!Array.isArray(group)) continue;
			for (const conn of group) {
				if (typeof conn !== 'object' || conn === null || !('node' in conn)) continue;
				result.set((conn as { node: string }).node, context);
			}
		}
	}

	return result;
}

/** Read the schema/example text off a structured output parser node's parameters. */
function extractParserContext(parserNode: NodeJSON | undefined): OutputParserContext {
	const params = parserNode?.parameters as Record<string, unknown> | undefined;
	if (!params) return { schemaIsExample: false };

	const schemaType = typeof params.schemaType === 'string' ? params.schemaType : 'fromJson';
	// `manual` mode holds a JSON Schema in `inputSchema`; `fromJson` holds an
	// example object in `jsonSchemaExample`; parser versions <1.2 only have
	// the JSON Schema field `jsonSchema`.
	const manualSchema = schemaType === 'manual' ? params.inputSchema : undefined;
	const legacySchema = params.jsonSchema;
	const example = schemaType !== 'manual' ? params.jsonSchemaExample : undefined;

	for (const [candidate, isExample] of [
		[manualSchema, false],
		[example, true],
		[legacySchema, false],
	] as Array<[unknown, boolean]>) {
		const schemaText = schemaDeclarationText(candidate);
		if (schemaText) {
			return { schemaText, schemaIsExample: isExample };
		}
	}

	return { schemaIsExample: false };
}

/**
 * Collect the direct downstream consumers of a node, with their parameters.
 * Pinned output must use the exact field names those consumers read — the
 * generator otherwise invents plausible-but-wrong column names (e.g.
 * 'signature' where a Code node reads 'last_details') and correctly-built
 * comparisons see empty values.
 */
export function collectDownstreamConsumers(
	workflow: WorkflowJSON,
	nodeName: string,
): Array<{ name: string; type: string; parameters: string }> {
	const childNames = new Set<string>();
	const nodeConns = workflow.connections[nodeName];
	if (nodeConns) {
		for (const outputConnections of Object.values(nodeConns as Record<string, unknown>)) {
			if (!Array.isArray(outputConnections)) continue;
			for (const outputGroup of outputConnections) {
				if (!Array.isArray(outputGroup)) continue;
				for (const conn of outputGroup) {
					if (typeof conn === 'object' && conn !== null && 'node' in conn) {
						childNames.add((conn as { node: string }).node);
					}
				}
			}
		}
	}

	const consumers: Array<{ name: string; type: string; parameters: string }> = [];
	for (const node of workflow.nodes) {
		if (!node.name || !childNames.has(node.name)) continue;
		let parameters = '';
		try {
			parameters = JSON.stringify(node.parameters ?? {});
		} catch {
			parameters = '';
		}
		if (parameters.length > 2000) parameters = parameters.slice(0, 2000) + '…';
		consumers.push({ name: node.name, type: node.type, parameters });
	}
	return consumers;
}
