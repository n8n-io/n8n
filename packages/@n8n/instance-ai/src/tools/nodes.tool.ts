/**
 * Node tools shared by the workflow and Agent builders: search_nodes, get_node_types,
 * get_node_parameter_options, and execute_node.
 */
import { Tool } from '@n8n/agents';
import {
	AI_CONNECTION_TYPES,
	NodeSearchEngine,
	categoryList,
	suggestedNodesData,
	type CategorySuggestedNode,
	type SearchableNodeType,
} from '@n8n/ai-utilities/node-catalog';
import {
	UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS,
	getLegacyBuilderToolNames,
	isAgentToolNodeType,
	buildExecuteNodeSessionGrantKey,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
	NODE_RESOURCE_GRANT_FALLBACK_KEYS,
} from '@n8n/api-types';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import { isToolType } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import { RESOURCE_EXPLORATION_UNAVAILABLE } from '../constants/resource-exploration';
import type { ExploreResourcesParams, InstanceAiContext, NodeDescription } from '../types';
import { needsModelSelection } from './nodes/model-selection';
import { pickPreferredChatModelNode } from './nodes/preferred-chat-model';
import { addSetupPreference, type NodeWithSetupPreference } from './nodes/setup-preference';
import { buildCredentialMap } from './workflows/resolve-credentials';
import { DOMAIN_TOOL_IDS } from './tool-ids';

const unsupportedAgentNodeOperations = new Set<string>(UNSUPPORTED_AGENT_NODE_TOOL_OPERATIONS);

const isUnsupportedEphemeralNodeOperation = (operation: unknown): operation is string =>
	typeof operation === 'string' && unsupportedAgentNodeOperations.has(operation);

const unsupportedEphemeralNodeOperationMessage = (operation: string): string =>
	`Operation "${operation}" requires a persistent workflow and is not supported for agent tool execution. ` +
	'Choose a non-waiting operation. For human approval, configure the intended action and set ' +
	'requireApproval: true.';

// ── Action schemas ──────────────────────────────────────────────────────────

const NODE_TYPE_ID_DESCRIPTION = 'Node type ID, e.g. "n8n-nodes-base.httpRequest"';
const METHOD_NAME_DESCRIPTION =
	"Exact method name from the node's @searchListMethod/@loadOptionsMethod annotation — read it via `get_node_types` first, never guess.";
const METHOD_TYPE_DESCRIPTION =
	'"listSearch" for @searchListMethod (supports filter/pagination); "loadOptions" for @loadOptionsMethod. Match the annotation.';
const CURRENT_NODE_PARAMETERS_DESCRIPTION =
	'Current node parameters for dependent lookups — e.g. sheetsSearch needs documentId { __rl: true, mode: "id", value: "<spreadsheetId>" }. Check displayOptions in the type definition.';
const NODE_TYPES_ARRAY_DESCRIPTION =
	'Node type IDs for node-level lookups (max 10). For split nodes (e.g. Slack, Gmail, Google Sheets), pass the object form WITH resource/operation (or mode) discriminators when you know them — a bare string errors with the resource→operations index for resource/operation nodes, and returns all mode variants for mode-split nodes.';

const nodeRequestObjectSchema = z.object({
	nodeType: z.string().describe(NODE_TYPE_ID_DESCRIPTION),
	version: z
		.union([z.string(), z.number()])
		.optional()
		.describe('Version, e.g. "4.3", 4.3, or "v43"'),
	resource: z.string().optional().describe('Resource discriminator for split nodes'),
	operation: z.string().optional().describe('Operation discriminator for split nodes'),
	mode: z.string().optional().describe('Mode discriminator for split nodes'),
});

export const nodeRequestSchema = z.union([
	z.string().describe(NODE_TYPE_ID_DESCRIPTION),
	nodeRequestObjectSchema,
]);

export type NodeTypeRequest = z.infer<typeof nodeRequestSchema>;

const MAX_EXECUTE_TIMEOUT_MS = 60_000;

const executeNodeFieldsShape = {
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
};

const executeNodeInputSchema = z.object(executeNodeFieldsShape);

type ExecuteInput = z.infer<typeof executeNodeInputSchema>;

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	resourceName: z.string().optional(),
	severity: instanceAiConfirmationSeveritySchema,
});

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

// ── Handlers ────────────────────────────────────────────────────────────────

async function enrichSearchResults(
	context: InstanceAiContext,
	results: ReturnType<NodeSearchEngine['searchByName']>,
) {
	// Enrich results with discriminator and credential setup metadata when available.
	const enriched = await Promise.all(
		results.map(async (r) => {
			const [node, discriminators] = await Promise.all([
				enrichWithSetupPreference(context, r, r.version),
				context.nodeService.listDiscriminators?.(r.name) ?? Promise.resolve(null),
			]);

			return discriminators ? { ...node, discriminators } : node;
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

function getOrBuildSearchEngine(
	nodeTypes: SearchableNodeType[],
	cache: SearchEngineCache,
): NodeSearchEngine {
	let engine = cache.engine;
	if (!engine || cache.nodeTypes !== nodeTypes || cache.nodeCount !== nodeTypes.length) {
		cache.nodeTypes = nodeTypes;
		cache.nodeCount = nodeTypes.length;
		engine = new NodeSearchEngine(nodeTypes);
		cache.engine = engine;
	}
	return engine;
}

/** Resolve TypeScript type definitions for a validated list of node requests. */
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
			const nodeType = typeof req === 'string' ? req : req.nodeType;
			if (!nodeType) {
				return {
					nodeType: '',
					content: '',
					error: 'Node type ID is required.',
				};
			}

			if (
				typeof req !== 'string' &&
				isToolType(nodeType, { includeHitl: false }) &&
				isUnsupportedEphemeralNodeOperation(req.operation)
			) {
				return {
					nodeType,
					content: '',
					error: `Node "${nodeType}": ${unsupportedEphemeralNodeOperationMessage(req.operation)}`,
				};
			}

			const options =
				typeof req === 'string'
					? undefined
					: {
							...(req.version !== undefined ? { version: String(req.version) } : {}),
							...(req.resource ? { resource: req.resource } : {}),
							...(req.operation ? { operation: req.operation } : {}),
							...(req.mode ? { mode: req.mode } : {}),
						};

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
				...(result.builderHint ? { builderHint: result.builderHint } : {}),
				...(result.deprecated ? { deprecated: true } : {}),
				...(result.unavailable ? { unavailable: result.unavailable } : {}),
				...(result.aiGateway ? { aiGateway: result.aiGateway } : {}),
				...(result.webhooks ? { webhooks: result.webhooks } : {}),
				...(result.polling ? { polling: result.polling } : {}),
				...(result.triggerPanel !== undefined ? { triggerPanel: result.triggerPanel } : {}),
			};
		}),
	);

	return { definitions };
}

async function handleSuggested(
	context: InstanceAiContext,
	categories: string[],
	toNodeName: (name: string) => string | undefined = (name) => name,
) {
	const results: Array<{
		category: string;
		description: string;
		patternHint: string;
		suggestedNodes: Array<NodeWithSetupPreference<CategorySuggestedNode>>;
	}> = [];
	const unknownCategories: string[] = [];

	for (const cat of categories) {
		const data = suggestedNodesData[cat];
		if (data) {
			const nodes = data.nodes.flatMap((node) => {
				const name = toNodeName(node.name);
				return name ? [{ ...node, name }] : [];
			});
			const suggestedNodes = await Promise.all(
				nodes.map(async (node) => await enrichWithSetupPreference(context, node)),
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

/**
 * Curated categories list workflow nodes such as `gmail`. An n8n Agent can only run the
 * `*Tool` variant, so map each name to that variant and drop nodes without one.
 */
async function buildAgentToolNameResolver(
	context: InstanceAiContext,
): Promise<(name: string) => string | undefined> {
	const available = new Set((await context.nodeService.listSearchable()).map((n) => n.name));
	return (name) => {
		if (isAgentToolNodeType(name) && available.has(name)) return name;
		const toolName = `${name}Tool`;
		return isAgentToolNodeType(toolName) && available.has(toolName) ? toolName : undefined;
	};
}

async function handleExploreResources(context: InstanceAiContext, input: ExploreResourcesParams) {
	if (!context.nodeService.exploreResources) {
		return {
			results: [],
			error: RESOURCE_EXPLORATION_UNAVAILABLE,
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

	// Re-assert the contract so a missing field returns a structured error the model can fix.
	const parsedInput = executeNodeInputSchema.safeParse(rawInput);
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
	const allowedByScope = context.permissions?.executeNode === 'always_allow';
	const allowedBySessionGrant =
		grantKey !== null && context.sessionApprovedToolKeys?.has(grantKey) === true;
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

const searchNodesInputSchema = z.object({
	query: z
		.string()
		.optional()
		.describe('Search query to filter by name or description (e.g. "slack", "http")'),
	queries: z
		.array(z.string().min(1))
		.min(1)
		.max(10)
		.optional()
		.describe(
			'Batch of search queries (e.g. ["gmail", "slack", "http"]). Prefer batching multiple service lookups in one call.',
		),
	categories: z
		.array(z.string())
		.min(1)
		.max(3)
		.optional()
		.describe(
			`Curated workflow technique categories: ${categoryList.join(', ')}. Pass when the workflow fits a known category.`,
		),
	scope: z
		.enum(['all', 'agent_tool'])
		.optional()
		.default('all')
		.describe(
			'Filter scope: "all" (default) searches workflow and tool nodes; "agent_tool" restricts to executable *Tool nodes usable by an n8n Agent.',
		),
	connectionType: z
		.enum(AI_CONNECTION_TYPES)
		.optional()
		.describe('Filter results by AI sub-node connection type.'),
	gatewayCreditsOnly: z
		.boolean()
		.optional()
		.describe(
			'When true, return only nodes supported by Gateway credits (each carries an `aiGateway` field with minVersion/operations).',
		),
	limit: z
		.number()
		.optional()
		.default(10)
		.describe('Maximum number of results to return per query (default: 10)'),
});

export function createSearchNodesTool(context: InstanceAiContext) {
	const searchEngineCache: SearchEngineCache = {};

	return new Tool(DOMAIN_TOOL_IDS.SEARCH_NODES)
		.legacyNames(...getLegacyBuilderToolNames(DOMAIN_TOOL_IDS.SEARCH_NODES))
		.description(
			'Search n8n node types by service name, category, AI connection type, or Gateway credits coverage. ' +
				'Use `categories` for curated workflow category recommendations, `query` or `queries` for service-specific discovery ' +
				'(short service names like "Gmail" or "Slack", not full task phrases), `scope="agent_tool"` when finding executable *Tool ' +
				'nodes for an n8n Agent, and `gatewayCreditsOnly=true` to list services covered by Gateway credits (no API key needed). ' +
				'After finding a node, call `get_node_types` to read its parameter schema.',
		)
		.input(searchNodesInputSchema)
		.handler(async (input) => {
			const queryList = [
				...new Set([...(input.queries ?? []), ...(input.query ? [input.query] : [])]),
			];

			const hasCategoryLookup = Boolean(input.categories && input.categories.length > 0);
			const hasSearchLookup =
				queryList.length > 0 || Boolean(input.connectionType) || Boolean(input.gatewayCreditsOnly);

			const toCategoryNodeName =
				input.scope === 'agent_tool' && hasCategoryLookup
					? await buildAgentToolNameResolver(context)
					: undefined;
			const categories = input.categories ?? [];

			if (hasCategoryLookup && !hasSearchLookup) {
				return await handleSuggested(context, categories, toCategoryNodeName);
			}

			const categorySummary = hasCategoryLookup
				? await handleSuggested(context, categories, toCategoryNodeName)
				: undefined;

			if (input.gatewayCreditsOnly && !input.connectionType) {
				const queriesOrUndefined = queryList.length > 0 ? queryList : [undefined];
				const batches = await Promise.all(
					queriesOrUndefined.map(
						async (query) =>
							await context.nodeService.listAvailable({ query, gatewayCreditsOnly: true }),
					),
				);
				const nodesByName = new Map(batches.flat().map((n) => [n.name, n]));
				const nodes = [...nodesByName.values()];
				const filtered =
					input.scope === 'agent_tool' ? nodes.filter((n) => isAgentToolNodeType(n.name)) : nodes;
				return {
					nodes: filtered,
					results: filtered,
					totalResults: filtered.length,
					...(categorySummary
						? {
								categoryResults: categorySummary.results,
								unknownCategories: categorySummary.unknownCategories,
							}
						: {}),
				};
			}

			const nodeTypes = await context.nodeService.listSearchable();
			const engine = getOrBuildSearchEngine(nodeTypes, searchEngineCache);
			const nodeFilter = input.scope === 'agent_tool' ? isAgentToolNodeType : undefined;

			const matchedByName = new Map<string, ReturnType<NodeSearchEngine['searchByName']>[number]>();

			if (input.connectionType) {
				const queriesOrUndefined = queryList.length > 0 ? queryList : [undefined];
				for (const q of queriesOrUndefined) {
					const filterResults = Boolean(nodeFilter) || Boolean(input.gatewayCreditsOnly);
					const candidates = engine
						.searchByConnectionType(
							input.connectionType,
							filterResults ? nodeTypes.length : input.limit,
							q,
						)
						.filter((item) => !nodeFilter || nodeFilter(item.name))
						.filter((item) => !input.gatewayCreditsOnly || item.aiGateway)
						.slice(0, input.limit);
					for (const item of candidates) {
						if (!matchedByName.has(item.name)) matchedByName.set(item.name, item);
					}
				}
			} else if (queryList.length > 0) {
				for (const q of queryList) {
					for (const item of engine.searchByName(q, input.limit, nodeFilter)) {
						if (!matchedByName.has(item.name)) matchedByName.set(item.name, item);
					}
				}
			} else {
				return { results: [], totalResults: 0 };
			}

			const enriched = await enrichSearchResults(context, [...matchedByName.values()]);
			return {
				...enriched,
				...(categorySummary
					? {
							categoryResults: categorySummary.results,
							unknownCategories: categorySummary.unknownCategories,
						}
					: {}),
			};
		})
		.build();
}

const getNodeTypesInputSchema = z.object({
	nodeTypes: z.array(nodeRequestSchema).min(1).max(10).describe(NODE_TYPES_ARRAY_DESCRIPTION),
});

export function createGetNodeTypesTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.GET_NODE_TYPES)
		.legacyNames(...getLegacyBuilderToolNames(DOMAIN_TOOL_IDS.GET_NODE_TYPES))
		.description(
			'Get TypeScript type definitions and metadata for n8n nodes — exact parameter names, enum values, ' +
				'credential types, display conditions, `@builderHint` annotations, Gateway credits (`aiGateway`) metadata, ' +
				'and webhook/trigger details. For split nodes (e.g. Slack, Gmail, Google Sheets), ' +
				'pass the object form with `resource` and `operation` (or `mode`) discriminators.',
		)
		.input(getNodeTypesInputSchema)
		.handler(async (input, ctx) => {
			const result = await resolveNodeTypeDefinitions(context, input.nodeTypes);
			if (ctx.loadSkill && (await needsModelSelection(context.nodeService, result.definitions))) {
				await ctx.loadSkill('model-selection');
			}
			return result;
		})
		.build();
}

const getNodeParameterOptionsInputSchema = z.object({
	nodeType: z.string().describe(NODE_TYPE_ID_DESCRIPTION),
	version: z.number().optional().describe('Node version, e.g. 4.7'),
	nodeTypeVersion: z.number().optional().describe('Alias for version'),
	parameterPath: z
		.string()
		.optional()
		.describe(
			'Parameter path to resolve (preferred), e.g. "channelId", "documentId", "teamId", or "additionalFields.teamId". Resolves resourceLocator, loadOptionsMethod, and loadOptions routing automatically and returns ready-to-write `parameterValue` entries.',
		),
	methodName: z.string().optional().describe(METHOD_NAME_DESCRIPTION),
	methodType: z.enum(['listSearch', 'loadOptions']).optional().describe(METHOD_TYPE_DESCRIPTION),
	credentialType: z
		.string()
		.optional()
		.describe('Credential type key, e.g. "googleSheetsOAuth2Api" or "slackApi"'),
	credentialId: z.string().optional().describe('Credential ID from credential lookup or setup'),
	credentials: z
		.record(z.object({ id: z.string(), name: z.string() }))
		.optional()
		.describe(
			'Node credentials map (e.g. built from a credentials setup result), as an alternative to credentialType + credentialId.',
		),
	currentNodeParameters: z
		.record(z.unknown())
		.optional()
		.describe(CURRENT_NODE_PARAMETERS_DESCRIPTION),
	nodeParameters: z.record(z.unknown()).optional().describe('Alias for currentNodeParameters'),
	filter: z.string().optional().describe('Search/filter text to narrow results'),
	paginationToken: z
		.string()
		.optional()
		.describe('Pagination token from a previous call to get more results'),
});

export function createGetNodeParameterOptionsTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.GET_NODE_PARAMETER_OPTIONS)
		.legacyNames(...getLegacyBuilderToolNames(DOMAIN_TOOL_IDS.GET_NODE_PARAMETER_OPTIONS))
		.description(
			"Fetch live credential-backed options for a node's dynamic parameter (resourceLocator, loadOptionsMethod, or loadOptions routing) — " +
				'e.g. Google Sheets documents/tabs, Slack channels, Linear teams, or provider models. ' +
				'Pass `parameterPath` (preferred, e.g. "channelId" or "documentId") or `methodName` + `methodType` from `get_node_types`, ' +
				'along with `credentialType` + `credentialId` (or `credentials` map).',
		)
		.input(getNodeParameterOptionsInputSchema)
		.handler(async (input) => {
			const version = input.version ?? input.nodeTypeVersion;
			if (version === undefined) {
				return {
					ok: false as const,
					results: [],
					error: 'version: Required — provide the node version number.',
				};
			}

			const currentNodeParameters = input.currentNodeParameters ?? input.nodeParameters;

			if (input.parameterPath) {
				if (context.nodeService.resolveParameterOptions) {
					return await context.nodeService.resolveParameterOptions({
						nodeType: input.nodeType,
						version,
						parameterPath: input.parameterPath,
						nodeParameters: currentNodeParameters,
						credentials: input.credentials,
						credentialType: input.credentialType,
						credentialId: input.credentialId,
						filter: input.filter,
						paginationToken: input.paginationToken,
					});
				}

				return {
					ok: false as const,
					code: 'lookup_failed' as const,
					results: [],
					error: 'Parameter option lookup is not available.',
				};
			}

			if (input.methodName) {
				const firstCredEntry = input.credentials ? Object.entries(input.credentials)[0] : undefined;
				const credentialType = input.credentialType ?? firstCredEntry?.[0];
				const credentialId = input.credentialId ?? firstCredEntry?.[1]?.id;
				if (!input.methodType) {
					return {
						results: [],
						error: 'methodType is required when querying by methodName.',
					};
				}
				if (!credentialType || !credentialId) {
					return {
						results: [],
						error:
							'credentialType and credentialId (or credentials map) are required when querying by methodName.',
					};
				}
				return await handleExploreResources(context, {
					nodeType: input.nodeType,
					version,
					methodName: input.methodName,
					methodType: input.methodType,
					credentialType,
					credentialId,
					filter: input.filter,
					paginationToken: input.paginationToken,
					currentNodeParameters,
				});
			}

			return {
				results: [],
				error: 'Provide parameterPath (preferred) or methodName + methodType.',
			};
		})
		.build();
}

export function createExecuteNodeTool(context: InstanceAiContext) {
	return new Tool(DOMAIN_TOOL_IDS.EXECUTE_NODE)
		.legacyNames(
			...getLegacyBuilderToolNames(DOMAIN_TOOL_IDS.EXECUTE_NODE),
			// Only the `execute` action of the former combined nodes tool suspends, so approvals
			// saved under its names must resume here.
			DOMAIN_TOOL_IDS.NODES,
			...getLegacyBuilderToolNames(DOMAIN_TOOL_IDS.NODES),
		)
		.description(
			'Execute a single n8n node standalone with real credentials and return its real output items. ' +
				'Use it to perform a one-off operation or to learn the exact output shape of a node before wiring ' +
				'downstream expressions. Always read the node via `get_node_types` first and build the parameters ' +
				'from it — never guess parameter names, resource/operation values, or the version. The node really ' +
				'runs (requires user approval, real side effects). Expressions referencing other nodes cannot resolve; ' +
				'binary output is returned as metadata only.',
		)
		.input(sanitizeInputSchema(executeNodeInputSchema))
		.suspend(suspendSchema)
		.resume(instanceAiApprovalResumeSchema)
		.handler(async (input, ctx) => {
			return await handleExecute(context, input, ctx.resumeData, ctx.suspend);
		})
		.build();
}
