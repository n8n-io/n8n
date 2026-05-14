import { Tool } from '@n8n/agents';
import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

/**
 * Resolve a structured, LLM-readable description of a node's parameter
 * schema. In production this is wired to
 * `NodeCatalogService.getNodeTypes([{ nodeId, version, resource?, operation? }])`,
 * which returns the TypeScript type definitions used by all builder flows.
 *
 * Returning a Promise so we can lazy-load the catalog in production without
 * leaking DI calls into module load.
 */
export type LookupNodeSchema = (input: {
	nodeType: string;
	version: number;
	resource?: string;
	operation?: string;
}) => Promise<string>;

export type NodeSchemaRequest = {
	nodeType: string;
	version: number;
	resource?: string;
	operation?: string;
};

export type LookupNodeSchemas = (input: NodeSchemaRequest[]) => Promise<string>;

const nodeSchemaRequestSchema = z.object({
	nodeType: z.string().min(1).describe('Canonical node id, e.g. `n8n-nodes-base.googleSheets`'),
	version: z.number().min(1).describe('Node typeVersion'),
	resource: z
		.string()
		.optional()
		.describe('Optional: narrow the schema to a single resource (e.g. "sheet")'),
	operation: z
		.string()
		.optional()
		.describe('Optional: narrow the schema to a single operation (e.g. "append")'),
});

const inputSchema = nodeSchemaRequestSchema;

const batchInputSchema = z.object({
	nodes: z
		.array(nodeSchemaRequestSchema)
		.min(1)
		.max(5)
		.describe('Node schemas to fetch in one tool call. Use this for multiple candidates.'),
});

export function createGetNodeSchemaTool(lookupNodeSchema: LookupNodeSchema): BuiltTool {
	return new Tool('get_node_schema')
		.description(
			'Fetch the parameter schema for a single node type so you can fill `propose_nodes.candidates[].parameters`. ' +
				'Call this BEFORE `propose_nodes` for any non-trivial single candidate. ' +
				'Returns TypeScript-style declarations describing every parameter — name, type, default, and which are required. ' +
				'You can narrow the result by passing `resource` / `operation` when the node uses them (most service nodes do). ' +
				'After fetching the schema, fill every required parameter in the proposed candidate with the best value inferable from the user prompt and prior workflow context; use `null` for values you cannot infer (specific IDs, URLs, queries, search terms, sheet names, etc.) and the user will set them via the parameter panel. ' +
				'Never use placeholder strings like "YOUR_VALUE" or "<your sheet>".',
		)
		.input(inputSchema)
		.handler(async (input) => {
			try {
				const schema = await lookupNodeSchema(input);
				return { schema };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					error: 'schema-lookup-failed',
					nodeType: input.nodeType,
					message,
					hint:
						'The node type may be unknown or the catalog is unavailable. ' +
						'Proceed with best-effort parameters or pick a different node type.',
				};
			}
		})
		.build();
}

export function createGetNodeSchemasTool(lookupNodeSchemas: LookupNodeSchemas): BuiltTool {
	return new Tool('get_node_schemas')
		.description(
			'Fetch parameter schemas for multiple node types in one call. Use this before `propose_nodes` when considering 2-5 candidate nodes. ' +
				'Returns TypeScript-style declarations describing parameters — name, type, default, and which are required. ' +
				'Pass `resource` / `operation` for each node when it uses them so each schema is narrowed down. ' +
				'After fetching the schemas, fill every required parameter in `propose_nodes.candidates[].parameters` with the best value inferable from the user prompt and prior workflow context; use `null` for values you cannot infer. ' +
				'Never use placeholder strings like "YOUR_VALUE" or "<your sheet>".',
		)
		.input(batchInputSchema)
		.handler(async (input) => {
			try {
				const schema = await lookupNodeSchemas(input.nodes);
				return { schema };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return {
					error: 'schema-lookup-failed',
					nodes: input.nodes.map((node) => ({
						nodeType: node.nodeType,
						version: node.version,
					})),
					message,
					hint:
						'One or more node types may be unknown or the catalog is unavailable. ' +
						'Proceed with best-effort parameters or pick different node types.',
				};
			}
		})
		.build();
}
