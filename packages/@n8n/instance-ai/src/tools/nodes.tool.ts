/**
 * Consolidated nodes tool — list, search, describe, type-definition, suggested, explore-resources.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { NodeSearchEngine } from './nodes/node-search-engine';
import { AI_CONNECTION_TYPES } from './nodes/node-search-engine.types';
import { categoryList, suggestedNodesData } from './nodes/suggested-nodes-data';

// ── Action schemas ──────────────────────────────────────────────────────────

const listAction = z.object({
	action: z.literal('list').describe('List available node types'),
	query: z
		.string()
		.optional()
		.describe('Search query to filter by name or description (e.g. "slack", "http")'),
});

const searchAction = z.object({
	action: z.literal('search').describe('Search node types by name or AI connection type'),
	query: z
		.string()
		.optional()
		.describe('Search query to filter by name or description (e.g. "slack", "http")'),
	connectionType: z
		.enum(AI_CONNECTION_TYPES)
		.optional()
		.describe('Filter results by AI sub-node connection type.'),
	limit: z
		.number()
		.optional()
		.default(10)
		.describe('Maximum number of results to return (default: 10)'),
});

const describeAction = z.object({
	action: z.literal('describe').describe('Get detailed description of a node type'),
	nodeType: z.string().describe('Node type ID, e.g. "n8n-nodes-base.httpRequest"'),
});

const nodeRequestSchema = z.union([
	z.string().describe('Simple node type ID, e.g. "n8n-nodes-base.httpRequest"'),
	z.object({
		nodeType: z.string().describe('Node type ID, e.g. "n8n-nodes-base.httpRequest"'),
		version: z.string().optional().describe('Version, e.g. "4.3" or "v43"'),
		resource: z.string().optional().describe('Resource discriminator for split nodes'),
		operation: z.string().optional().describe('Operation discriminator for split nodes'),
		mode: z.string().optional().describe('Mode discriminator for split nodes'),
	}),
]);

const typeDefinitionAction = z.object({
	action: z.literal('type-definition').describe('Get TypeScript type definitions for nodes'),
	nodeTypes: z
		.array(nodeRequestSchema)
		.min(1)
		.max(5)
		.describe(
			'Node type IDs to get definitions for (max 5). Each entry may be a plain node type string (e.g. "n8n-nodes-base.slack") or an object with `nodeType` plus optional `resource`/`operation`/`mode`/`version` discriminators.',
		),
});

const suggestedAction = z.object({
	action: z.literal('suggested').describe('Get curated node recommendations by category'),
	categories: z
		.array(z.string())
		.min(1)
		.max(3)
		.describe(`Workflow technique categories: ${categoryList.join(', ')}`),
});

const exploreResourcesAction = z.object({
	action: z
		.literal('explore-resources')
		.describe("Query real resources for a node's RLC parameters"),
	nodeType: z.string().describe('Node type ID, e.g. "n8n-nodes-base.httpRequest"'),
	version: z.number().describe('Node version, e.g. 4.7'),
	methodName: z
		.string()
		.describe(
			"The exact method name from the node's @searchListMethod or @loadOptionsMethod annotation. " +
				'Call `action: "type-definition"` first to read the real method name from the type definition — ' +
				'do not invent or guess method names; they must match the annotation exactly.',
		),
	methodType: z
		.enum(['listSearch', 'loadOptions'])
		.describe(
			'"listSearch" for @searchListMethod annotations (supports filter/pagination); ' +
				'"loadOptions" for @loadOptionsMethod annotations. ' +
				'Pick the one matching the annotation you found in the type definition.',
		),
	credentialType: z.string().describe('Credential type key, e.g. "googleSheetsOAuth2Api"'),
	credentialId: z.string().describe('Credential ID from list-credentials'),
	filter: z.string().optional().describe('Search/filter text to narrow results'),
	paginationToken: z
		.string()
		.optional()
		.describe('Pagination token from a previous call to get more results'),
	currentNodeParameters: z
		.record(z.unknown())
		.optional()
		.describe(
			'Current node parameters for dependent lookups. Some methods need prior selections — ' +
				'e.g. sheetsSearch needs documentId: { __rl: true, mode: "id", value: "spreadsheetId" } ' +
				'to list sheets within that spreadsheet. Check displayOptions in the type definition.',
		),
});

const fullInputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		listAction,
		searchAction,
		describeAction,
		typeDefinitionAction,
		suggestedAction,
		exploreResourcesAction,
	]),
);

type FullInput = z.infer<typeof fullInputSchema>;

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleList(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'list' }>,
) {
	const nodes = await context.nodeService.listAvailable({
		query: input.query,
	});
	return { nodes };
}

async function handleSearch(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'search' }>,
) {
	const nodeTypes = await context.nodeService.listSearchable();
	const engine = new NodeSearchEngine(nodeTypes);

	let results;
	if (input.connectionType) {
		results = engine.searchByConnectionType(input.connectionType, input.limit, input.query);
	} else if (input.query) {
		results = engine.searchByName(input.query, input.limit);
	} else {
		return { results: [], totalResults: 0 };
	}

	// Enrich results with discriminator info (resources/operations) when available
	const enriched = await Promise.all(
		results.map(async (r) => {
			if (!context.nodeService.listDiscriminators) return r;
			const disc = await context.nodeService.listDiscriminators(r.name);
			if (!disc) return r;
			return { ...r, discriminators: disc };
		}),
	);

	return {
		results: enriched,
		totalResults: enriched.length,
	};
}

async function handleDescribe(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'describe' }>,
) {
	try {
		const desc = await context.nodeService.getDescription(input.nodeType);
		return { found: true, ...desc };
	} catch {
		return {
			found: false,
			error: `Node type "${input.nodeType}" not found. Use the search action to discover available node types.`,
			name: input.nodeType,
			displayName: '',
			description: '',
			properties: [],
			inputs: [],
			outputs: [],
		};
	}
}

async function handleTypeDefinition(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'type-definition' }>,
) {
	// Mastra validates against the flattened top-level schema (required for
	// Anthropic's `type: "object"` constraint), which makes every variant field
	// optional. Re-assert the variant contract so missing/invalid inputs return
	// a structured error the model can self-correct from, instead of crashing
	// downstream on `input.nodeTypes.map`.
	const parsed = typeDefinitionAction.safeParse(input);
	if (!parsed.success) {
		return {
			definitions: [],
			error: parsed.error.issues
				.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
				.join('; '),
		};
	}
	const { nodeTypes } = parsed.data;

	if (!context.nodeService.getNodeTypeDefinition) {
		return {
			definitions: nodeTypes.map((req: z.infer<typeof nodeRequestSchema>) => ({
				nodeType: typeof req === 'string' ? req : req.nodeType,
				content: '',
				error: 'Node type definitions are not available.',
			})),
		};
	}

	const definitions = await Promise.all(
		nodeTypes.map(async (req: z.infer<typeof nodeRequestSchema>) => {
			const nodeType = typeof req === 'string' ? req : req.nodeType;
			const options = typeof req === 'string' ? undefined : req;

			const result = await context.nodeService.getNodeTypeDefinition!(nodeType, options);

			if (!result) {
				return {
					nodeType,
					content: '',
					error: `No type definition found for '${nodeType}'.`,
				};
			}

			if (result.error) {
				return {
					nodeType,
					content: '',
					error: result.error,
				};
			}

			return {
				nodeType,
				version: result.version,
				content: result.content,
			};
		}),
	);

	return { definitions };
}

// eslint-disable-next-line @typescript-eslint/require-await
async function handleSuggested(input: Extract<FullInput, { action: 'suggested' }>) {
	const results: Array<{
		category: string;
		description: string;
		patternHint: string;
		suggestedNodes: Array<{ name: string; note?: string }>;
	}> = [];
	const unknownCategories: string[] = [];

	for (const cat of input.categories) {
		const data = suggestedNodesData[cat];
		if (data) {
			results.push({
				category: cat,
				description: data.description,
				patternHint: data.patternHint,
				suggestedNodes: data.nodes,
			});
		} else {
			unknownCategories.push(cat);
		}
	}

	return { results, unknownCategories };
}

async function handleExploreResources(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'explore-resources' }>,
) {
	if (!context.nodeService.exploreResources) {
		return {
			results: [],
			error: 'Resource exploration is not available.',
		};
	}

	try {
		const result = await context.nodeService.exploreResources(input);
		return {
			results: result.results,
			paginationToken: result.paginationToken,
			...(result.builderHint ? { builderHint: result.builderHint } : {}),
		};
	} catch (error) {
		return {
			results: [],
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createNodesTool(
	context: InstanceAiContext,
	surface: 'full' | 'orchestrator' = 'full',
) {
	if (surface === 'orchestrator') {
		const orchestratorExploreAction = z.object({
			action: z
				.literal('explore-resources')
				.describe("Query real resources for a node's RLC parameters"),
			nodeType: z.string().describe('Node type ID, e.g. "n8n-nodes-base.httpRequest"'),
			version: z.number().describe('Node version, e.g. 4.7'),
			methodName: z
				.string()
				.describe(
					"The exact method name from the node's @searchListMethod or @loadOptionsMethod annotation. " +
						'Call `action: "type-definition"` first to read the real method name from the type definition — ' +
						'do not invent or guess method names; they must match the annotation exactly.',
				),
			methodType: z
				.enum(['listSearch', 'loadOptions'])
				.describe(
					'"listSearch" for @searchListMethod annotations (supports filter/pagination); ' +
						'"loadOptions" for @loadOptionsMethod annotations. ' +
						'Pick the one matching the annotation you found in the type definition.',
				),
			credentialType: z.string().describe('Credential type key, e.g. "googleSheetsOAuth2Api"'),
			credentialId: z.string().describe('Credential ID from list-credentials'),
			filter: z.string().optional().describe('Search/filter text to narrow results'),
			paginationToken: z
				.string()
				.optional()
				.describe('Pagination token from a previous call to get more results'),
			currentNodeParameters: z
				.record(z.unknown())
				.optional()
				.describe(
					'Current node parameters for dependent lookups. Some methods need prior selections — ' +
						'e.g. sheetsSearch needs documentId: { __rl: true, mode: "id", value: "spreadsheetId" } ' +
						'to list sheets within that spreadsheet. Check displayOptions in the type definition.',
				),
		});

		const orchestratorInputSchema = sanitizeInputSchema(
			z.discriminatedUnion('action', [typeDefinitionAction, orchestratorExploreAction]),
		);

		type OrchestratorInput = z.infer<typeof orchestratorInputSchema>;

		return createTool({
			id: 'nodes',
			description:
				"Read node type definitions or query real resources for a node's RLC parameters " +
				'(e.g. list Google Sheets, OpenAI models, Slack channels). Use `type-definition` ' +
				'first to read `@searchListMethod` / `@loadOptionsMethod` annotations, then ' +
				'`explore-resources` with the real method name and a credential.',
			inputSchema: orchestratorInputSchema,
			execute: async (input: OrchestratorInput) => {
				switch (input.action) {
					case 'type-definition':
						return await handleTypeDefinition(context, input);
					case 'explore-resources':
						return await handleExploreResources(context, input);
				}
			},
		});
	}

	return createTool({
		id: 'nodes',
		description:
			'Work with n8n node types — discover, search, describe, get type definitions, and explore real resources.',
		inputSchema: fullInputSchema,
		execute: async (input: FullInput) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'search':
					return await handleSearch(context, input);
				case 'describe':
					return await handleDescribe(context, input);
				case 'type-definition':
					return await handleTypeDefinition(context, input);
				case 'suggested':
					return await handleSuggested(input);
				case 'explore-resources':
					return await handleExploreResources(context, input);
			}
		},
	});
}
