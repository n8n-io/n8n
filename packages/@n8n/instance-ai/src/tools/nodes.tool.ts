/**
 * Consolidated nodes tool — list, search, describe, type-definition, suggested,
 * explore-resources, execute.
 */
import { Tool } from '@n8n/agents';
import {
	AI_CONNECTION_TYPES,
	NodeSearchEngine,
	categoryList,
	suggestedNodesData,
	type CategorySuggestedNode,
	type NodeSearchResult,
	type SearchableNodeType,
} from '@n8n/ai-utilities/node-catalog';
import {
	buildExecuteNodeSessionGrantKey,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
	NODE_RESOURCE_GRANT_FALLBACK_KEYS,
} from '@n8n/api-types';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext, NodeDescription } from '../types';
import { filterSearchResultsWithJev } from './nodes/filter-search-results';
import { pickPreferredChatModelNode } from './nodes/preferred-chat-model';
import { addSetupPreference, type NodeWithSetupPreference } from './nodes/setup-preference';
import { buildCredentialMap } from './workflows/resolve-credentials';

// ── Action schemas ──────────────────────────────────────────────────────────

const NODE_TYPE_ID_DESCRIPTION = 'Node type ID, e.g. "n8n-nodes-base.httpRequest"';
const METHOD_NAME_DESCRIPTION =
	'Exact method name from the node\'s @searchListMethod/@loadOptionsMethod annotation — read it via `action: "type-definition"` first, never guess.';
const METHOD_TYPE_DESCRIPTION =
	'"listSearch" for @searchListMethod (supports filter/pagination); "loadOptions" for @loadOptionsMethod. Match the annotation.';
const CURRENT_NODE_PARAMETERS_DESCRIPTION =
	'Current node parameters for dependent lookups — e.g. sheetsSearch needs documentId { __rl: true, mode: "id", value: "<spreadsheetId>" }. Check displayOptions in the type definition.';
const NODE_TYPES_ARRAY_DESCRIPTION =
	'Node type IDs for node-level lookups (max 10). For split nodes (e.g. Slack, Gmail, Google Sheets), pass the object form WITH resource/operation (or mode) discriminators when you know them — a bare string errors with the resource→operations index for resource/operation nodes, and returns all mode variants for mode-split nodes.';
const NODE_QUERY_DESCRIPTION =
	'Search query or array of search queries to filter by name or description (e.g. "slack" or ["whatsapp", "gemini"])';

const listAction = z.object({
	action: z.literal('list').describe('List available node types'),
	query: z
		.union([z.string(), z.array(z.string())])
		.optional()
		.describe(NODE_QUERY_DESCRIPTION),
	gatewayCreditsOnly: z
		.boolean()
		.optional()
		.describe(
			'When true, return only nodes supported by Gateway credits (each carries an `aiGateway` field with minVersion/operations). Use to answer "which nodes support Gateway credits?".',
		),
});

const searchAction = z.object({
	action: z
		.literal('search')
		.describe(
			'Search node types by name or AI connection type. Pass a single service name ("Slack") or an array of service names (["WhatsApp", "Gemini", "Google Sheets"]) in query/queries to search multiple services in one call.',
		),
	query: z
		.union([z.string(), z.array(z.string())])
		.optional()
		.describe(NODE_QUERY_DESCRIPTION),
	queries: z
		.array(z.string())
		.optional()
		.describe(
			'Array of search queries to search multiple services in one call (e.g. ["whatsapp", "gemini"])',
		),
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
	nodeType: z.string().describe(NODE_TYPE_ID_DESCRIPTION),
});

const nodeRequestObjectSchema = z
	.object({
		nodeType: z.string().describe(NODE_TYPE_ID_DESCRIPTION),
		version: z.string().optional().describe('Version, e.g. "4.3" or "v43"'),
		resource: z.string().optional().describe('Resource discriminator for split nodes'),
		operation: z.string().optional().describe('Operation discriminator for split nodes'),
		mode: z.string().optional().describe('Mode discriminator for split nodes'),
		detail: z
			.enum(['full', 'compact'])
			.optional()
			.describe('Set "full" to bypass pruning and return the complete unfiltered definition'),
	})
	.passthrough();

export const nodeRequestSchema = z.union([
	z.string().describe(NODE_TYPE_ID_DESCRIPTION),
	nodeRequestObjectSchema,
]);

export type NodeTypeRequest = z.infer<typeof nodeRequestSchema>;

const typeDefinitionAction = z.object({
	action: z
		.literal('type-definition')
		.describe(
			'Get TypeScript type definitions for nodes — exact parameter names, enum values, credential types, display conditions, and `@builderHint` annotations.',
		),
	nodeTypes: z.array(nodeRequestSchema).min(1).max(10).describe(NODE_TYPES_ARRAY_DESCRIPTION),
});

const suggestedAction = z.object({
	action: z
		.literal('suggested')
		.describe(
			'Get curated node recommendations by category. Call first when the workflow fits a known category.',
		),
	categories: z
		.array(z.string())
		.min(1)
		.max(3)
		.describe(`Workflow technique categories: ${categoryList.join(', ')}`),
});

const exploreResourcesAction = z.object({
	action: z
		.literal('explore-resources')
		.describe("Query live credential-backed resource lists for a node's RLC parameters"),
	nodeType: z.string().describe(NODE_TYPE_ID_DESCRIPTION),
	version: z.number().describe('Node version, e.g. 4.7'),
	methodName: z.string().describe(METHOD_NAME_DESCRIPTION),
	methodType: z.enum(['listSearch', 'loadOptions']).describe(METHOD_TYPE_DESCRIPTION),
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
		.describe(CURRENT_NODE_PARAMETERS_DESCRIPTION),
});

const MAX_EXECUTE_TIMEOUT_MS = 60_000;

// Envelope mirrors a workflow-sdk node so the agent can pass a node it is
// building verbatim. Credentials take the resolved `{ id, name }` form only —
// the SDK's placeholder/new-credential forms have no stored row to execute with.
const executeAction = z.object({
	action: z
		.literal('execute')
		.describe(
			'Execute a single node standalone with real credentials and return its real output ' +
				'items. Use it to learn the exact output shape of a node before wiring downstream ' +
				"expressions, or to test one node in isolation. Always read the node's " +
				'`action: "type-definition"` first and build the parameters from it — never guess ' +
				'parameter names, resource/operation values, or the version. The node really runs — ' +
				'side effects happen (messages get sent, rows get written). ' +
				'Expressions referencing other nodes cannot resolve; binary ' +
				'output is returned as metadata only.',
		),
	type: z.string().min(1).describe(NODE_TYPE_ID_DESCRIPTION),
	version: z.number().describe('Node version, e.g. 4.7'),
	config: z
		.object({
			parameters: z
				.record(z.unknown())
				.describe('Node parameters — same shape as workflow-sdk NodeConfig.parameters'),
			credentials: z
				.record(
					z.object({
						id: z.string().nullable(),
						name: z.string(),
						__aiGatewayManaged: z.boolean().optional(),
					}),
				)
				.optional()
				.describe(
					'Resolved credential references by credential type, e.g. { slackApi: { id, name } }. ' +
						'Ask the user which credentials to use if there are multiple credentials available - ' +
						'do not pick a credential on your own',
				),
		})
		.describe('Node config — same shape as a workflow-sdk node config'),
	input: z
		.array(z.object({ json: z.record(z.unknown()) }))
		.optional()
		.describe('Input items for the node (defaults to one empty item)'),
	timeoutMs: z.number().int().positive().max(MAX_EXECUTE_TIMEOUT_MS).optional(),
});

type ExecuteInput = z.infer<typeof executeAction>;

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	resourceName: z.string().optional(),
	severity: instanceAiConfirmationSeveritySchema,
});

const fullInputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		listAction,
		searchAction,
		describeAction,
		typeDefinitionAction,
		suggestedAction,
		exploreResourcesAction,
		executeAction,
	]),
);

type FullInput = z.infer<typeof fullInputSchema>;

interface SearchEngineCache {
	nodeTypes?: SearchableNodeType[];
	nodeCount?: number;
	engine?: NodeSearchEngine;
}

async function enrichWithSetupPreference<T extends { name: string }>(
	context: InstanceAiContext,
	node: T,
	version?: number,
): Promise<NodeWithSetupPreference<T>> {
	try {
		const description = await context.nodeService.getDescription(node.name, version);
		if (description.properties.some(({ type }) => type === 'credentialsSelect')) return node;

		return addSetupPreference(node, description.credentials?.map(({ name }) => name) ?? []);
	} catch {
		return node;
	}
}

function cleanNodeInputs(inputs: unknown): unknown {
	if (typeof inputs === 'string' && inputs.startsWith('={{')) {
		if (inputs.includes("'ai_tool'") || inputs.includes('"ai_tool"')) {
			return ['main', 'ai_tool'];
		}
		return ['main'];
	}
	return inputs;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleList(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'list' }>,
) {
	const queryString = Array.isArray(input.query) ? input.query.join(' ') : input.query;
	const nodes = await context.nodeService.listAvailable({
		query: queryString,
		gatewayCreditsOnly: input.gatewayCreditsOnly,
	});
	return { nodes };
}

async function handleSearch(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'search' }>,
	cache: SearchEngineCache,
) {
	const nodeTypes = await context.nodeService.listSearchable();
	let engine = cache.engine;
	if (!engine || cache.nodeTypes !== nodeTypes || cache.nodeCount !== nodeTypes.length) {
		cache.nodeTypes = nodeTypes;
		cache.nodeCount = nodeTypes.length;
		engine = new NodeSearchEngine(nodeTypes);
		cache.engine = engine;
	}

	let queryList: string[] = [];
	if (Array.isArray(input.queries) && input.queries.length > 0) {
		queryList = input.queries.map((q) => String(q).trim()).filter(Boolean);
	} else if (Array.isArray(input.query)) {
		queryList = input.query.map((q) => String(q).trim()).filter(Boolean);
	} else if (typeof input.query === 'string' && input.query.trim().length > 0) {
		queryList = [input.query.trim()];
	}

	let results: NodeSearchResult[] = [];
	if (input.connectionType) {
		results = engine.searchByConnectionType(input.connectionType, input.limit, queryList[0]);
	} else if (queryList.length > 0) {
		const perQueryResults = await Promise.all(
			queryList.map(async (q) => {
				const raw = engine.searchByName(q, input.limit);
				return await filterSearchResultsWithJev(q, raw, { limit: input.limit });
			}),
		);
		const seenNames = new Set<string>();
		for (const list of perQueryResults) {
			for (const item of list) {
				if (!seenNames.has(item.name)) {
					seenNames.add(item.name);
					results.push(item);
				}
			}
		}
	} else {
		return { results: [], totalResults: 0 };
	}

	// Enrich results with discriminator and credential setup metadata when available.
	const enriched = await Promise.all(
		results.map(async (r) => {
			const [node, discriminators] = await Promise.all([
				enrichWithSetupPreference(context, r, r.version),
				context.nodeService.listDiscriminators?.(r.name) ?? Promise.resolve(null),
			]);

			const cleanedNode =
				typeof node.inputs === 'string' && node.inputs.startsWith('={{')
					? { ...node, inputs: cleanNodeInputs(node.inputs) }
					: node;

			return discriminators ? { ...cleanedNode, discriminators } : cleanedNode;
		}),
	);

	// Steer the language model subnode toward a provider the user already has a
	// credential for, so the builder stops defaulting to OpenAI when only another
	// provider is configured. Only hits the credential list when relevant.
	const hasLanguageModelRequirement = enriched.some((r) =>
		r.subnodeRequirements?.some((req) => req.connectionType === 'ai_languageModel'),
	);
	if (!hasLanguageModelRequirement) {
		return { results: enriched, totalResults: enriched.length };
	}

	const credentialMap = await buildCredentialMap(context.credentialService);
	const suggestedModelNode = pickPreferredChatModelNode(credentialMap.keys());
	if (!suggestedModelNode) {
		return { results: enriched, totalResults: enriched.length };
	}

	const withSuggestions = enriched.map((r) =>
		r.subnodeRequirements
			? {
					...r,
					subnodeRequirements: r.subnodeRequirements.map((req) =>
						req.connectionType === 'ai_languageModel'
							? { ...req, suggestedNode: suggestedModelNode }
							: req,
					),
				}
			: r,
	);

	return {
		results: withSuggestions,
		totalResults: withSuggestions.length,
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

/**
 * Resolve TypeScript type definitions for a validated list of node requests.
 * Used by the consolidated `nodes` tool's `type-definition` action.
 */
async function resolveNodeTypeDefinitions(
	context: InstanceAiContext,
	nodeTypes: NodeTypeRequest[],
) {
	if (!context.nodeService.getNodeTypeDefinition) {
		return {
			definitions: nodeTypes.map((req) => ({
				nodeType: typeof req === 'string' ? req : req.nodeType,
				content: '',
				error: 'Node type definitions are not available.',
			})),
		};
	}

	const definitions = await Promise.all(
		nodeTypes.map(async (req) => {
			const requestedNodeType = typeof req === 'string' ? req : req.nodeType;
			const options = typeof req === 'string' ? undefined : req;

			let result = await context.nodeService.getNodeTypeDefinition!(requestedNodeType, options);

			let resolvedNodeType = requestedNodeType;

			// If not found or errored, try alternative standard package prefix candidates
			if (!result || result.error) {
				const candidateTypes: string[] = [];
				if (requestedNodeType.startsWith('n8n-nodes-base.')) {
					candidateTypes.push(
						`@n8n/n8n-nodes-langchain.${requestedNodeType.slice('n8n-nodes-base.'.length)}`,
					);
				} else if (requestedNodeType.startsWith('@n8n/n8n-nodes-langchain.')) {
					candidateTypes.push(
						`n8n-nodes-base.${requestedNodeType.slice('@n8n/n8n-nodes-langchain.'.length)}`,
					);
				} else if (!requestedNodeType.includes('.')) {
					candidateTypes.push(`n8n-nodes-base.${requestedNodeType}`);
					candidateTypes.push(`@n8n/n8n-nodes-langchain.${requestedNodeType}`);
				}

				for (const candidate of candidateTypes) {
					const candidateOptions = options ? { ...options, nodeType: candidate } : undefined;
					const fallbackResult = await context.nodeService.getNodeTypeDefinition!(
						candidate,
						candidateOptions,
					);
					if (fallbackResult && !fallbackResult.error) {
						result = fallbackResult;
						resolvedNodeType = candidate;
						break;
					}
				}
			}

			if (!result) {
				return {
					nodeType: requestedNodeType,
					content: '',
					error: `No type definition found for '${requestedNodeType}'.`,
				};
			}

			if (result.error) {
				return {
					nodeType: requestedNodeType,
					content: '',
					error: result.error,
				};
			}

			return {
				nodeType: resolvedNodeType,
				version: result.version,
				content: result.content,
				...(result.builderHint ? { builderHint: result.builderHint } : {}),
				...(result.deprecated ? { deprecated: true } : {}),
			};
		}),
	);

	return { definitions };
}

async function handleTypeDefinition(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'type-definition' }>,
) {
	// Native tool validation uses the flattened top-level schema (required for
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

	return await resolveNodeTypeDefinitions(context, parsed.data.nodeTypes);
}

async function handleSuggested(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'suggested' }>,
) {
	const results: Array<{
		category: string;
		description: string;
		patternHint: string;
		suggestedNodes: Array<NodeWithSetupPreference<CategorySuggestedNode>>;
	}> = [];
	const unknownCategories: string[] = [];

	for (const cat of input.categories) {
		const data = suggestedNodesData[cat];
		if (data) {
			const suggestedNodes = await Promise.all(
				data.nodes.map(async (node) => await enrichWithSetupPreference(context, node)),
			);
			results.push({
				category: cat,
				description: data.description,
				patternHint: data.patternHint,
				suggestedNodes,
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

/** True when the property is not gated on `resource`, or is gated on the resolved one. */
function isShownForResource(
	property: NodeDescription['properties'][number],
	resource: string | undefined,
): boolean {
	const shownFor = property.displayOptions?.show?.resource;
	if (!Array.isArray(shownFor)) return true;
	return resource !== undefined && shownFor.includes(resource);
}

/** Description for the 45 node types that carry no parameter worth naming (If, Filter, Sort, ...). */
const EXECUTE_DESCRIPTION_FALLBACK = 'Single run';

/**
 * Human-readable subjects for the execute-node approval card: the node the card names in its
 * title (`Google Sheets node`) and what the call does below it (`Sheet Within Document > Append
 * Row`). Falls back to the node type ID and the raw parameter values when the node description
 * or its option lists don't resolve.
 */
async function buildExecuteNodeLabels(
	context: InstanceAiContext,
	input: ExecuteInput,
): Promise<{ resourceName: string; message: string }> {
	let description: NodeDescription | undefined;
	try {
		description = await context.nodeService.getDescription(input.type, input.version);
	} catch {
		// Keep the raw node type in the prompt.
	}
	const properties = description?.properties ?? [];

	/**
	 * A split node declares one `operation` property for each resource, so the same operation
	 * value can carry a different label under another resource — only the properties shown for
	 * the resolved resource may name it. An omitted parameter falls back to the node default at
	 * runtime, so the prompt resolves it the same way and names the call the user really gets.
	 */
	const resolveParameter = (name: string, resource?: string) => {
		const declaredBy = properties.filter(
			(property) => property.name === name && isShownForResource(property, resource),
		);
		const value = input.config.parameters[name] ?? declaredBy[0]?.default;
		if (typeof value !== 'string' || value.length === 0) return undefined;
		const option = declaredBy
			.flatMap((property) => property.options ?? [])
			.find((candidate) => candidate.value === value);
		return { value, label: option?.name ?? value };
	};

	const resource = resolveParameter('resource');
	const operation = resolveParameter('operation', resource?.value);
	let label = [resource?.label, operation?.label].filter(Boolean).join(' > ');
	for (const name of NODE_RESOURCE_GRANT_FALLBACK_KEYS) {
		if (label) break;
		label = resolveParameter(name)?.label ?? '';
	}

	return {
		resourceName: `${description?.displayName ?? input.type} node`,
		message: label || EXECUTE_DESCRIPTION_FALLBACK,
	};
}

async function handleExecute(
	context: InstanceAiContext,
	rawInput: ExecuteInput,
	resumeData: z.infer<typeof instanceAiApprovalResumeSchema> | undefined | null,
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>,
) {
	const { executeNodeService } = context;
	if (!executeNodeService) {
		return {
			status: 'error' as const,
			error: { message: 'Node execution is not available on this instance' },
		};
	}

	// The flattened runtime schema makes every variant field optional — re-assert
	// the variant contract so a missing field returns a structured error.
	const parsedInput = executeAction.safeParse(rawInput);
	if (!parsedInput.success) {
		return {
			status: 'error' as const,
			error: {
				message: parsedInput.error.issues
					.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
					.join('; '),
			},
		};
	}
	const input = parsedInput.data;

	const validation = validateNodeConfig(input.type, input.version, input.config);
	// Missing discriminators fall back to node defaults at runtime, so they don't block.
	const blockingErrors = validation.errors.filter((error) => !error.missingDiscriminator);
	if (blockingErrors.length > 0) {
		return {
			status: 'error' as const,
			error: {
				message: `Node parameters do not match the schema for ${input.type} v${input.version}`,
				issues: blockingErrors.map(({ path, message }) => ({ path, message })),
			},
		};
	}

	if (context.permissions?.executeNode === 'blocked') {
		return {
			status: 'error' as const,
			denied: true,
			reason: 'Action blocked by admin',
		};
	}

	const grantKey = buildExecuteNodeSessionGrantKey(input.type, input.config.parameters);
	const requireApproval = context.requireRunWorkflowApproval === true;
	// A scoped `always_allow` names the workflow IDs it covers, and a standalone node run has no
	// workflow ID to match, so a scoped override never covers this call.
	const scopedRunOverride =
		context.allowedRunWorkflowIds !== undefined || context.allowedRunWorkflowNames !== undefined;
	const allowedByScope =
		!requireApproval && !scopedRunOverride && context.permissions?.executeNode === 'always_allow';
	const allowedBySessionGrant =
		!requireApproval &&
		grantKey !== null &&
		context.sessionApprovedToolKeys?.has(grantKey) === true;
	const needsApproval = !allowedByScope && !allowedBySessionGrant;

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await suspend({
			requestId: nanoid(),
			...(await buildExecuteNodeLabels(context, input)),
			severity: 'warning' as const,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { status: 'error' as const, denied: true, reason: 'User denied the action' };
	}

	if (resumeData?.approved && resumeData.scope === 'session' && grantKey !== null) {
		await context.grantSessionToolApproval?.(grantKey);
	}

	return await executeNodeService.execute({
		type: input.type,
		version: input.version,
		config: input.config,
		input: input.input,
		timeoutMs: input.timeoutMs,
	});
}

// ── Tool factory ────────────────────────────────────────────────────────────

export function createNodesTool(
	context: InstanceAiContext,
	surface: 'full' | 'orchestrator' = 'full',
) {
	const searchEngineCache: SearchEngineCache = {};

	if (surface === 'orchestrator') {
		const orchestratorExploreAction = z.object({
			action: z
				.literal('explore-resources')
				.describe("Query real resources for a node's RLC parameters"),
			nodeType: z.string().describe('Node type ID, e.g. "n8n-nodes-base.httpRequest"'),
			version: z.number().describe('Node version, e.g. 4.7'),
			methodName: z.string().describe(METHOD_NAME_DESCRIPTION),
			methodType: z.enum(['listSearch', 'loadOptions']).describe(METHOD_TYPE_DESCRIPTION),
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
				.describe(CURRENT_NODE_PARAMETERS_DESCRIPTION),
		});

		const orchestratorInputSchema = sanitizeInputSchema(
			z.discriminatedUnion('action', [typeDefinitionAction, orchestratorExploreAction]),
		);

		type OrchestratorInput = z.infer<typeof orchestratorInputSchema>;

		return new Tool('nodes')
			.description(
				"Read node type definitions or query real resources for a node's RLC parameters " +
					'(e.g. list Google Sheets, OpenAI models, Slack channels). Use `type-definition` ' +
					'first to read `@searchListMethod` / `@loadOptionsMethod` annotations, then ' +
					'`explore-resources` with the real method name and a credential.',
			)
			.input(orchestratorInputSchema)
			.handler(async (input: OrchestratorInput) => {
				switch (input.action) {
					case 'type-definition':
						return await handleTypeDefinition(context, input);
					case 'explore-resources':
						return await handleExploreResources(context, input);
				}
			})
			.build();
	}

	return new Tool('nodes')
		.description(
			'Work with n8n node types. Use `suggested` for known workflow categories, `search` for service-specific discovery, `type-definition` before configuring nodes, `explore-resources` for live credential-backed lists, and `execute` to run one node standalone (requires user approval, real side effects).',
		)
		.input(fullInputSchema)
		.suspend(suspendSchema)
		.resume(instanceAiApprovalResumeSchema)
		.handler(async (input: FullInput, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'search':
					return await handleSearch(context, input, searchEngineCache);
				case 'describe':
					return await handleDescribe(context, input);
				case 'type-definition':
					return await handleTypeDefinition(context, input);
				case 'suggested':
					return await handleSuggested(context, input);
				case 'explore-resources':
					return await handleExploreResources(context, input);
				case 'execute':
					return await handleExecute(context, input, ctx.resumeData, ctx.suspend);
			}
		})
		.build();
}
