/**
 * Read-only node-discovery tools given to the Specialist.
 *
 * Backed by the same `NodeSearchEngine` the legacy `nodes` tool uses, so
 * specialists get the same fuzzy / multi-word / connection-type-aware
 * search the rest of instance-ai relies on.
 */

import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { NodeContext } from '../node-context';

const NODE_SEARCH_LIMIT_DEFAULT = 8;

const aiConnectionTypeSchema = z.enum([
	'ai_languageModel',
	'ai_memory',
	'ai_tool',
	'ai_outputParser',
	'ai_vectorStore',
	'ai_retriever',
	'ai_reranker',
	'ai_embedding',
	'ai_textSplitter',
	'ai_document',
]);

export function createNodeInfoTools(ctx: NodeContext) {
	const searchNodes = new Tool('search_nodes')
		.description(
			'Fuzzy-search the n8n node catalogue. Use for triggers, integrations, ' +
				'and utility nodes (Set / IF / Code / Merge). Multi-word queries are ' +
				'supported. Returns matching nodes ranked by relevance + builder hints.',
		)
		.input(
			z.object({
				query: z.string().describe('Free-form keyword(s), e.g. "slack post message"'),
				limit: z.number().int().min(1).max(20).optional(),
			}),
		)
		.output(
			z.object({
				results: z.array(
					z.object({
						name: z.string(),
						displayName: z.string(),
						description: z.string(),
						version: z.number(),
						builderHint: z.string().optional(),
					}),
				),
				totalResults: z.number(),
			}),
		)
		.handler(async ({ query, limit }) => {
			const engine = await ctx.engine();
			const results = engine.searchByName(query, limit ?? NODE_SEARCH_LIMIT_DEFAULT);
			return {
				results: results.map((r) => ({
					name: r.name,
					displayName: r.displayName,
					description: r.description,
					version: r.version,
					...(r.builderHintMessage !== undefined && { builderHint: r.builderHintMessage }),
				})),
				totalResults: results.length,
			};
		});

	const searchSubNodes = new Tool('search_sub_nodes')
		.description(
			'Search for sub-nodes that connect to an AI Agent / Chain via an ai_* ' +
				'port. Use this when you need a Chat Model (ai_languageModel), Memory ' +
				'(ai_memory), Tool (ai_tool), Output Parser (ai_outputParser), Vector ' +
				'Store (ai_vectorStore), etc. Optionally filter by name.',
		)
		.input(
			z.object({
				connectionType: aiConnectionTypeSchema,
				query: z.string().optional().describe('Optional name filter, e.g. "openai"'),
				limit: z.number().int().min(1).max(20).optional(),
			}),
		)
		.output(
			z.object({
				results: z.array(
					z.object({
						name: z.string(),
						displayName: z.string(),
						description: z.string(),
						version: z.number(),
						builderHint: z.string().optional(),
					}),
				),
				totalResults: z.number(),
			}),
		)
		.handler(async ({ connectionType, query, limit }) => {
			const engine = await ctx.engine();
			const results = engine.searchByConnectionType(
				connectionType,
				limit ?? NODE_SEARCH_LIMIT_DEFAULT,
				query,
			);
			return {
				results: results.map((r) => ({
					name: r.name,
					displayName: r.displayName,
					description: r.description,
					version: r.version,
					...(r.builderHintMessage !== undefined && { builderHint: r.builderHintMessage }),
				})),
				totalResults: results.length,
			};
		});

	const getNodeType = new Tool('get_node_type')
		.description(
			'Get the TypeScript parameter definition for a node so its parameters ' +
				'can be filled in correctly. Pass discriminators (resource / operation / mode) ' +
				'when known so the returned shape is precise.',
		)
		.input(
			z.object({
				nodeType: z.string(),
				version: z.string().optional(),
				resource: z.string().optional(),
				operation: z.string().optional(),
				mode: z.string().optional(),
			}),
		)
		.output(
			z.object({
				content: z.string().optional(),
				version: z.string().optional(),
				error: z.string().optional(),
				builderHint: z.string().optional(),
			}),
		)
		.handler(async ({ nodeType, version, resource, operation, mode }) => {
			const service = ctx.service;
			if (!service.getNodeTypeDefinition) {
				return { error: 'Node type definition service not available' };
			}
			const def = await service.getNodeTypeDefinition(nodeType, {
				...(version !== undefined && { version }),
				...(resource !== undefined && { resource }),
				...(operation !== undefined && { operation }),
				...(mode !== undefined && { mode }),
			});
			if (!def) return { error: `No definition for ${nodeType}` };
			return {
				...(def.content !== undefined && { content: def.content }),
				...(def.version !== undefined && { version: def.version }),
				...(def.error !== undefined && { error: def.error }),
				...(def.builderHint !== undefined && { builderHint: def.builderHint }),
			};
		});

	const listDiscriminators = new Tool('list_node_discriminators')
		.description(
			'List available resource / operation discriminators for a node — call this ' +
				'before get_node_type so you can pass the correct resource + operation.',
		)
		.input(z.object({ nodeType: z.string() }))
		.output(
			z.object({
				resources: z
					.array(z.object({ name: z.string(), operations: z.array(z.string()) }))
					.optional(),
				note: z.string().optional(),
			}),
		)
		.handler(async ({ nodeType }) => {
			if (!ctx.service.listDiscriminators) {
				return { note: 'Discriminators not available on this instance' };
			}
			const disc = await ctx.service.listDiscriminators(nodeType);
			if (!disc) return { note: `${nodeType} is a flat node (no discriminators).` };
			return { resources: disc.resources };
		});

	return { searchNodes, searchSubNodes, getNodeType, listDiscriminators };
}
