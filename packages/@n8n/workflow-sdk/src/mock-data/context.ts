import type { NodeSchemaContext, OutputParserContext, OutputSchemaLookup } from './types';
import type { NodeJSON, WorkflowJSON } from '../types/base';

/**
 * Assemble the per-node contexts the generation prompt is built from.
 * Schema enrichment happens through the injected lookup (consumers pass
 * n8n-core's `__schema__` resolver); absent lookup = no schema sections.
 */
export function buildSchemaContexts(
	nodes: NodeJSON[],
	outputSchemaLookup?: OutputSchemaLookup,
	outputParserTargets?: Map<string, OutputParserContext>,
): NodeSchemaContext[] {
	return nodes.map((node) => {
		const params = node.parameters as Record<string, unknown> | undefined;
		const resource = typeof params?.resource === 'string' ? params.resource : undefined;
		const operation = typeof params?.operation === 'string' ? params.operation : undefined;
		const outputParser = node.name ? outputParserTargets?.get(node.name) : undefined;

		const schema = outputSchemaLookup?.({
			type: node.type,
			typeVersion: node.typeVersion,
			resource,
			operation,
			hasOutputParser: outputParser !== undefined,
		});

		return {
			nodeName: node.name ?? node.type,
			nodeType: node.type,
			typeVersion: node.typeVersion,
			resource,
			operation,
			schema,
			outputParser,
		};
	});
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
		if (typeof candidate === 'string' && candidate.trim().length > 0) {
			return { schemaText: candidate.trim(), schemaIsExample: isExample };
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
