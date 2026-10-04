/**
 * Consolidated nodes tool — list, search, describe, type-definition, suggested,
 * explore-resources, execute.
 */
import { Tool, type ToolContext } from '@n8n/agents';
import {
	AI_CONNECTION_TYPES,
	NodeSearchEngine,
	categoryList,
	suggestedNodesData,
	type CategorySuggestedNode,
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
import {
	actionRow,
	actionRowsOfNode,
	builtInRowOf,
	catalogRowsBesideModules,
	contractReplacementOf,
	derivedActionIds,
	derivedActionsNamedBy,
	derivedModulePath,
	derivedNodeView,
	flowStepRowOf,
	hasDerivedModule,
	namesDisplayName,
	nearestNextActions,
	nextNodeIdOfNodeType,
	supplierActionsOf,
	nextNodeModule,
	nextNodeView,
	searchNextActions,
	type DeriveSource,
	type NextNodeModule,
} from './next-modules';
import type { InstanceAiContext, NodeDescription } from '../types';
import { warmWorkspace } from '../workspace/warm-workspace';
import { needsModelSelection } from './nodes/model-selection';
import { pickPreferredChatModelNode } from './nodes/preferred-chat-model';
import { addSetupPreference, type NodeWithSetupPreference } from './nodes/setup-preference';
import { buildCredentialMap } from './workflows/resolve-credentials';
import { isTriggerNodeType } from './workflows/workflow-json-utils';

// ── Action schemas ──────────────────────────────────────────────────────────

const NODE_TYPE_ID_DESCRIPTION = 'Node type ID, e.g. "n8n-nodes-base.httpRequest"';
const METHOD_NAME_DESCRIPTION =
	'Exact method name from the node\'s @searchListMethod/@loadOptionsMethod annotation — read it via `action: "type-definition"` first, never guess.';
const METHOD_TYPE_DESCRIPTION =
	'"listSearch" for @searchListMethod (supports filter/pagination); "loadOptions" for @loadOptionsMethod. Match the annotation.';
const CURRENT_NODE_PARAMETERS_DESCRIPTION =
	'Current node parameters for dependent lookups — e.g. sheetsSearch needs documentId { __rl: true, mode: "id", value: "<spreadsheetId>" }. Check displayOptions in the type definition.';
const NODE_TYPES_ARRAY_DESCRIPTION =
	'Node type IDs for node-level lookups (max 5). For split nodes (e.g. Slack, Gmail, Google Sheets), pass the object form WITH resource/operation (or mode) discriminators when you know them — a bare string errors with the resource→operations index for resource/operation nodes, and returns all mode variants for mode-split nodes.';
const MODULE_NODE_TYPES_ARRAY_DESCRIPTION =
	'Max 5. A module id ("notion") or an action id ("notion.databasePage.getAll") returns the module. For other split nodes, pass the object form with resource/operation (or mode).';
const GATEWAY_SEARCH_DESCRIPTION =
	'When the task fits a service covered by n8n Connect (web search, scraping, document parsing — no API key needed), surface that option too; list the covered set with `nodes(action="list", gatewayCreditsOnly=true)`.';

const listAction = z.object({
	action: z
		.literal('list')
		.describe(
			'List available node types. When picking a service node for a task (web search, scraping, ' +
				'document parsing), also consider services covered by n8n Connect (they run on Gateway ' +
				'credits, no API key needed) — pass `gatewayCreditsOnly=true` to see the covered set.',
		),
	query: z
		.string()
		.optional()
		.describe('Search query to filter by name or description (e.g. "slack", "http")'),
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
			'Search node types by name or AI connection type. Use for service-specific discovery — short service names like "Gmail" or "Slack", not full task phrases. ' +
				GATEWAY_SEARCH_DESCRIPTION,
		),
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

// Node contracts: build discovery actions keep every field and describe typed modules.
const moduleSearchAction = searchAction.extend({
	action: z
		.literal('search')
		.describe(
			'Search nodes by service and operation, e.g. "notion get many pages", or by AI connection type. ' +
				'`nodeModules` holds the typed or derived module of each service: import it and call its actions. ' +
				'`builtIns` are flow steps of `@n8n/workflow-sdk/next` that replace catalog nodes. ' +
				'Pass `queries` with every service of the workflow in one call, also HTTP. ' +
				'Call it in the same step as `load_skill`, not after it.',
		),
	connectionType: searchAction.shape.connectionType.describe('AI sub-node connection type'),
	limit: searchAction.shape.limit.describe('Max results (default 10, at most 20)'),
	queries: z
		.array(z.string())
		.min(1)
		.max(6)
		.optional()
		.describe('One short query per service, e.g. ["notion get many pages", "http request"]'),
});

const describeAction = z.object({
	action: z.literal('describe').describe('Get detailed description of a node type'),
	nodeType: z.string().describe(NODE_TYPE_ID_DESCRIPTION),
});

const nodeRequestObjectSchema = z.object({
	nodeType: z.string().describe(NODE_TYPE_ID_DESCRIPTION),
	version: z.string().optional().describe('Version, e.g. "4.3" or "v43"'),
	resource: z.string().optional().describe('Resource discriminator for split nodes'),
	operation: z.string().optional().describe('Operation discriminator for split nodes'),
	mode: z.string().optional().describe('Mode discriminator for split nodes'),
});

export const nodeRequestSchema = z.union([
	z.string().describe(NODE_TYPE_ID_DESCRIPTION),
	nodeRequestObjectSchema,
]);

export type NodeTypeRequest = z.infer<typeof nodeRequestSchema>;

const moduleNodeRequestSchema = z.union([
	z.string().describe('Node type ID, module id, or action id'),
	nodeRequestObjectSchema,
]);

const typeDefinitionAction = z.object({
	action: z
		.literal('type-definition')
		.describe(
			'Get TypeScript type definitions for nodes — exact parameter names, enum values, credential types, display conditions, and `@builderHint` annotations.',
		),
	nodeTypes: z.array(nodeRequestSchema).min(1).max(5).describe(NODE_TYPES_ARRAY_DESCRIPTION),
});

const moduleTypeDefinitionAction = z.object({
	action: z
		.literal('type-definition')
		.describe(
			'Get node definitions. A module id or an action id returns the module text. Other nodes return TypeScript definitions.',
		),
	nodeTypes: z
		.array(moduleNodeRequestSchema)
		.min(1)
		.max(5)
		.describe(MODULE_NODE_TYPES_ARRAY_DESCRIPTION),
});

const suggestedAction = z.object({
	action: z
		.literal('suggested')
		.describe(
			'Get curated node recommendations by category. Call first when the workflow fits a known category. ' +
				'The curated list is a starting point, not the full set: also add any n8n Connect covered services ' +
				'relevant to the category (they run on Gateway credits, no API key needed). Check coverage with ' +
				'`nodes(action="list", gatewayCreditsOnly=true)` or `credentials(action="search-types", gatewayCreditsOnly=true)`.',
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

const moduleSuggestedAction = suggestedAction.extend({
	action: suggestedAction.shape.action.describe(
		'Get curated nodes by category. Call first when the workflow fits a known category. The list is not complete: also consider nodes that run on Gateway credits.',
	),
});

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

const moduleFullInputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		listAction,
		moduleSearchAction,
		describeAction,
		moduleTypeDefinitionAction,
		moduleSuggestedAction,
		exploreResourcesAction,
		executeAction,
	]),
);

type FullInput = z.infer<typeof moduleFullInputSchema>;

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

async function handleList(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'list' }>,
) {
	const nodes = await context.nodeService.listAvailable({
		query: input.query,
		gatewayCreditsOnly: input.gatewayCreditsOnly,
	});
	return { nodes };
}

type SearchInput = Extract<FullInput, { action: 'search' }>;

/**
 * Verified community nodes that the query names and that the instance has not installed. The
 * build refuses them until the package is installed, so the agent must ask the user first.
 */
async function notInstalledPartOf(
	context: InstanceAiContext,
	input: SearchInput,
): Promise<{
	notInstalled?: Array<{ name: string; displayName: string; description: string; install: string }>;
}> {
	if (!input.query || input.connectionType || !context.nodeService.searchUninstalledNodes)
		return {};
	const nodes = await context.nodeService.searchUninstalledNodes(input.query);
	if (!nodes.length) return {};
	return {
		notInstalled: nodes.map(({ packageName, ...node }) => ({
			...node,
			install: `Not installed. Ask the user before you use it: an instance owner or admin must install the package '${packageName}' in Settings > Community nodes.`,
		})),
	};
}

async function handleSearch(
	context: InstanceAiContext,
	input: SearchInput,
	cache: SearchEngineCache,
) {
	const [nodeTypes, notInstalledPart] = await Promise.all([
		context.nodeService.listSearchable(),
		notInstalledPartOf(context, input).catch((error: unknown) => {
			context.logger.warn('Failed to list uninstalled community nodes for the search', { error });
			return {};
		}),
	]);
	let engine = cache.engine;
	if (!engine || cache.nodeTypes !== nodeTypes || cache.nodeCount !== nodeTypes.length) {
		cache.nodeTypes = nodeTypes;
		cache.nodeCount = nodeTypes.length;
		engine = new NodeSearchEngine(nodeTypes);
		cache.engine = engine;
	}

	let results;
	if (input.connectionType) {
		results = engine.searchByConnectionType(input.connectionType, input.limit, input.query);
	} else if (input.query) {
		results = engine.searchByName(input.query, input.limit);
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
		return { results: enriched, totalResults: enriched.length, ...notInstalledPart };
	}

	const credentialMap = await buildCredentialMap(context.credentialService);
	const suggestedModelNode = pickPreferredChatModelNode(credentialMap.keys());
	if (!suggestedModelNode) {
		return { results: enriched, totalResults: enriched.length, ...notInstalledPart };
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
		...notInstalledPart,
	};
}

const MAX_SEARCH_LIMIT = 20;

/** About 8k tokens: six typed module views fit, and catalog rows are cut first. */
const MAX_SEARCH_BYTES = 32_000;

/**
 * A module node or an SDK step replaces its catalog hits, and a derived module replaces a hit
 * that the query names. When a module covers the query, or the query names an SDK step, the
 * other hits are one-line rows. Otherwise they keep their catalog rows.
 */
async function searchOneWithModules(
	context: InstanceAiContext,
	input: SearchInput,
	cache: SearchEngineCache,
) {
	const query = input.query ?? '';
	const catalog = await handleSearch(context, input, cache);
	const notInstalledPart = catalog.notInstalled ? { notInstalled: catalog.notInstalled } : {};
	const namesHit = (hit: { displayName: string }) => namesDisplayName(query, hit.displayName);
	const builtInHits = catalog.results.filter((hit) => builtInRowOf(hit.name) !== undefined);
	const builtIns = [...new Set(builtInHits.flatMap((hit) => builtInRowOf(hit.name) ?? []))];
	const moduleHits = catalog.results.filter((hit) => builtInRowOf(hit.name) === undefined);
	const coveredNodes = moduleHits.flatMap((hit) => nextNodeIdOfNodeType(hit.name) ?? []);
	const unmoduled = moduleHits.filter((hit) => nextNodeIdOfNodeType(hit.name) === undefined);
	// A catalog node that the query names gets its derived module, when it has one.
	const derived = input.connectionType
		? []
		: unmoduled
				.filter((hit) => namesHit(hit) && hasDerivedModule(hit.name, context))
				.map((hit) => hit.name);
	const results = unmoduled.filter((hit) => !derived.includes(hit.name));
	// A sub-node search gets the sub-node actions of the module nodes that replace its hits.
	const suppliers = input.connectionType
		? supplierActionsOf(coveredNodes, input.connectionType)
		: [];
	const typed = input.connectionType
		? {
				nodes: [...new Set(suppliers.map(({ node }) => node.id))],
				actions: suppliers.map(({ id }) => id),
				otherActions: [],
				coversQuery: false,
			}
		: searchNextActions(
				query,
				coveredNodes,
				moduleHits.filter(namesHit).flatMap((hit) => nextNodeIdOfNodeType(hit.name) ?? []),
			);
	const { otherActions, coversQuery } = typed;
	const nodes = [...typed.nodes, ...derived];
	const actions = [
		...typed.actions,
		...derived.flatMap((nodeType) => derivedActionsNamedBy(nodeType, context, query)),
	];
	const namesBuiltIn = builtInHits.some(namesHit);
	// A named SDK step does the job, so the actions behind it (condition.if for when) are noise.
	const otherActionsPart = otherActions.length && !namesBuiltIn ? { otherActions } : {};
	const builtInsPart = builtIns.length ? { builtIns } : {};
	if (nodes.length || namesBuiltIn) {
		// Other catalog hits of a query that the modules match fully are noise, unless the
		// query names them, e.g. the legacy agent for "AI agent".
		const shown = coversQuery ? results.filter(namesHit) : results;
		const otherNodes = catalogRowsBesideModules(shown, nodes);
		return {
			nodes,
			actions,
			...builtInsPart,
			...otherActionsPart,
			...(otherNodes.length ? { otherNodes } : {}),
			...notInstalledPart,
		};
	}
	return {
		nodes,
		actions,
		...builtInsPart,
		...otherActionsPart,
		results,
		totalResults: results.length,
		...notInstalledPart,
	};
}

type ModuleSearch = Awaited<ReturnType<typeof searchOneWithModules>>;

function moduleSearchResponse(
	queries: ReadonlyArray<string | undefined>,
	single: boolean,
	searches: readonly ModuleSearch[],
	nodeModules: readonly NextNodeModule[],
) {
	const modulesPart = nodeModules.length ? { nodeModules } : {};
	if (single) {
		const [{ nodes: _nodes, actions: _actions, ...search }] = searches;
		return { ...modulesPart, ...search };
	}
	return {
		...modulesPart,
		searches: searches.map(({ nodes, actions: _actions, ...search }, index) => ({
			query: queries[index],
			...(nodes.length ? { modules: nodes } : {}),
			...search,
		})),
	};
}

const byteSizeOf = (value: unknown) => Buffer.byteLength(JSON.stringify(value));

const countDown = (from: number) => Array.from({ length: from + 1 }, (_, index) => from - index);

const rowCountOf = (search: ModuleSearch) => ('results' in search ? search.results.length : 0);

/**
 * Keep a search answer under `MAX_SEARCH_BYTES`. Catalog rows go first, the same number from
 * each query, then modules from the end. A `cut` note says what went and how to get it.
 */
function withinSearchBudget(
	searches: readonly ModuleSearch[],
	nodeModules: readonly NextNodeModule[],
	respond: (searches: readonly ModuleSearch[], nodeModules: readonly NextNodeModule[]) => object,
) {
	const withRows = (cap: number) =>
		searches.map((search) =>
			'results' in search ? { ...search, results: search.results.slice(0, cap) } : search,
		);
	const fits = (kept: readonly ModuleSearch[], modules: readonly NextNodeModule[]) =>
		byteSizeOf(respond(kept, modules)) <= MAX_SEARCH_BYTES;
	const rowCap =
		countDown(Math.max(0, ...searches.map(rowCountOf))).find((cap) =>
			fits(withRows(cap), nodeModules),
		) ?? 0;
	const kept = withRows(rowCap);
	const moduleCount =
		countDown(nodeModules.length).find((count) => fits(kept, nodeModules.slice(0, count))) ?? 0;
	const response = respond(kept, nodeModules.slice(0, moduleCount));
	const cutRows =
		searches.reduce((total, search) => total + rowCountOf(search), 0) -
		kept.reduce((total, search) => total + rowCountOf(search), 0);
	const cutModules = nodeModules.slice(moduleCount).map(({ node }) => node);
	if (!cutRows && !cutModules.length) return response;
	const parts = [
		...(cutRows ? [`${cutRows} catalog rows (search with fewer queries for them)`] : []),
		...(cutModules.length
			? [`the modules ${cutModules.join(', ')} (get them with type-definition)`]
			: []),
	];
	return { ...response, cut: `Cut to ${MAX_SEARCH_BYTES / 1000} KB: ${parts.join('; ')}.` };
}

/**
 * Each module goes inline once per call, also when several queries name its node. It shows
 * the types of the actions that some query names.
 */
async function handleModuleSearch(
	context: InstanceAiContext,
	input: SearchInput,
	cache: SearchEngineCache,
) {
	const queryList = 'queries' in input ? input.queries : undefined;
	const queries = queryList ?? [input.query];
	const limit = Math.min(input.limit, MAX_SEARCH_LIMIT);
	const searches = await Promise.all(
		queries.map(
			async (query) => await searchOneWithModules(context, { ...input, query, limit }, cache),
		),
	);
	const shownActions = new Set(searches.flatMap(({ actions }) => actions));
	const nodeModules = [...new Set(searches.flatMap(({ nodes }) => nodes))].flatMap(
		(nodeId) =>
			nextNodeView(nodeId, shownActions) ?? derivedNodeView(nodeId, context, shownActions) ?? [],
	);
	if (nodeModules.length) warmWorkspace(context);
	return withinSearchBudget(searches, nodeModules, (kept, modules) =>
		moduleSearchResponse(queries, !queryList, kept, modules),
	);
}

/**
 * The module of a module id, an action id, or a catalog node type that a module replaces. An
 * SDK step replaces its node type before a module does, and a typed module before a derived
 * one. A request with a resource and an operation gets the view that types their actions, or
 * the catalog definition when no action runs them.
 */
function moduleOfRequest(
	request: NodeTypeRequest,
	source: DeriveSource,
): NextNodeModule | undefined {
	const nodeType = typeof request === 'string' ? request : request.nodeType;
	const direct = nextNodeModule(nodeType);
	if (direct) return direct;
	if (builtInRowOf(nodeType)) return undefined;
	const nodeId = nextNodeIdOfNodeType(nodeType);
	const { resource, operation } = typeof request === 'string' ? {} : request;
	if (nodeId === undefined) {
		if (resource === undefined && operation === undefined) {
			return derivedNodeView(nodeType, source);
		}
		const shown = derivedActionIds(nodeType, source, { resource, operation });
		return shown.length ? derivedNodeView(nodeType, source, new Set(shown)) : undefined;
	}
	if (resource === undefined || operation === undefined) {
		const nodeModule = nextNodeModule(nodeId);
		const hint = `// The typed module for ${nodeType}. For an operation without an action, request ${nodeType} with resource and operation.\n`;
		// A derived AI node takes only derived providers, never a provider of a typed module.
		const derived = hasDerivedModule(nodeType, source)
			? `// A derived AI node takes the derived provider: import { ${nodeType.slice(nodeType.lastIndexOf('.') + 1)} } from '@n8n/nodes/${derivedModulePath(nodeType)}'.\n`
			: '';
		return nodeModule && { ...nodeModule, module: `${hint}${derived}${nodeModule.module}` };
	}
	const replacement = contractReplacementOf({
		type: nodeType,
		parameters: { resource, operation },
	});
	if (replacement?.nodeId !== nodeId) return undefined;
	return nextNodeView(nodeId, new Set(replacement.actions.map(({ id }) => id)));
}

async function handleDescribe(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'describe' }>,
) {
	const nodeModule = context.nodeContractsEnabled
		? moduleOfRequest(input.nodeType, context)
		: undefined;
	if (nodeModule) return { found: true, name: input.nodeType, ...nodeModule };

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

/** The module text goes in `content`, the field that carries TypeScript definitions. */
function resolveModuleDefinition(request: NodeTypeRequest, source: DeriveSource) {
	const nodeType = typeof request === 'string' ? request : request.nodeType;
	const nodeModule = moduleOfRequest(request, source);
	if (!nodeModule) return undefined;
	return { nodeType, node: nodeModule.node, import: nodeModule.import, content: nodeModule.module };
}

/**
 * The node type version of a legacy definition. The catalog names it by its file, e.g. `v22`
 * for 2.2, so the version line of the definition is read first.
 */
function definitionVersion(result: { content: string; version?: string }): string {
	const declared = /^\s*version: (\d+(?:\.\d+)?);$/m.exec(result.content)?.[1];
	if (declared) return declared;
	return result.version && /^\d+(?:\.\d+)?$/.test(result.version) ? result.version : '<version>';
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
			const nodeType = typeof req === 'string' ? req : req.nodeType;
			const flowStepRow = context.nodeContractsEnabled ? flowStepRowOf(nodeType) : undefined;
			if (flowStepRow) {
				return {
					nodeType,
					content: '',
					error: `The flow SDK builds ${nodeType}. Use its step instead: ${flowStepRow}`,
				};
			}
			const moduleDefinition = context.nodeContractsEnabled
				? resolveModuleDefinition(req, context)
				: undefined;
			if (moduleDefinition) {
				warmWorkspace(context);
				return moduleDefinition;
			}

			const options = typeof req === 'string' ? undefined : req;
			const builtInRow = context.nodeContractsEnabled ? builtInRowOf(nodeType) : undefined;
			const moduleNode =
				context.nodeContractsEnabled && !builtInRow ? nextNodeIdOfNodeType(nodeType) : undefined;
			const actions = moduleNode ? actionRowsOfNode(moduleNode) : [];

			const result = await context.nodeService.getNodeTypeDefinition!(nodeType, options);

			const nearest =
				context.nodeContractsEnabled && (!result || result.error)
					? nearestNextActions(nodeType)
					: [];
			if (nearest.length) {
				return {
					nodeType,
					content: '',
					error: `No action '${nodeType}'. The nearest actions follow; request one by id.`,
					actions: nearest.map(actionRow),
				};
			}

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
					...(actions.length ? { actions } : {}),
				};
			}

			// The agent maps a classic definition to a guessed module unless told how to use it.
			// A flow starts only from a trigger, so a trigger gets trigger(), not node().
			// Its `…Node` type reads like a type argument of node(), so the hint says what types the output.
			const version = definitionVersion(result);
			const nodeCall = `node({ name, type: '${nodeType}', version: ${version}, parameters, sample }) from '@n8n/workflow-sdk/next'`;
			const sampleNote = 'Its `sample` items type the output, not type arguments.';
			const noModuleHint = builtInRow
				? `// Use the flow step instead of node(): ${builtInRow}\n`
				: !context.nodeContractsEnabled
					? ''
					: moduleNode
						? `// The typed module has no action for this operation. Use ${nodeCall}. ${sampleNote}\n`
						: isTriggerNodeType(nodeType)
							? `// No typed module. Start the flow with trigger({ name, type: '${nodeType}', version: ${version}, parameters, sample }) from '@n8n/workflow-sdk/next'.\n`
							: `// No typed module. Use ${nodeCall}, or provider({ … }) for an AI provider. ${sampleNote}\n`;
			return {
				nodeType,
				version: result.version,
				content: `${noModuleHint}${result.content}`,
				...(result.builderHint ? { builderHint: result.builderHint } : {}),
				...(result.deprecated ? { deprecated: true } : {}),
				...(actions.length ? { actions } : {}),
			};
		}),
	);

	return { definitions };
}

async function handleTypeDefinition(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'type-definition' }>,
	loadSkill: ToolContext['loadSkill'],
) {
	// Native tool validation uses the flattened top-level schema (required for
	// Anthropic's `type: "object"` constraint), which makes every variant field
	// optional. Re-assert the variant contract so missing/invalid inputs return
	// a structured error the model can self-correct from, instead of crashing
	// downstream on `input.nodeTypes.map`.
	const parsed = (
		context.nodeContractsEnabled ? moduleTypeDefinitionAction : typeDefinitionAction
	).safeParse(input);
	if (!parsed.success) {
		return {
			definitions: [],
			error: parsed.error.issues
				.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
				.join('; '),
		};
	}

	const result = await resolveNodeTypeDefinitions(context, parsed.data.nodeTypes);
	if (loadSkill && (await needsModelSelection(context.nodeService, result.definitions))) {
		await loadSkill('model-selection');
	}
	return result;
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
			z.discriminatedUnion('action', [
				context.nodeContractsEnabled ? moduleTypeDefinitionAction : typeDefinitionAction,
				orchestratorExploreAction,
			]),
		);

		type OrchestratorInput = z.infer<typeof orchestratorInputSchema>;

		return new Tool('nodes')
			.description(
				context.nodeContractsEnabled
					? "Read node definitions or query real resources for a node's RLC parameters " +
							'(e.g. list Google Sheets, OpenAI models, Slack channels). Use `type-definition` for all nodes in one call. ' +
							'`explore-resources` needs the method name from a `@searchListMethod` / `@loadOptionsMethod` annotation in a TypeScript definition.'
					: "Read node type definitions or query real resources for a node's RLC parameters " +
							'(e.g. list Google Sheets, OpenAI models, Slack channels). Use `type-definition` ' +
							'first to read `@searchListMethod` / `@loadOptionsMethod` annotations, then ' +
							'`explore-resources` with the real method name and a credential.',
			)
			.input(orchestratorInputSchema)
			.handler(async (input: OrchestratorInput, ctx) => {
				switch (input.action) {
					case 'type-definition':
						return await handleTypeDefinition(context, input, ctx.loadSkill);
					case 'explore-resources':
						return await handleExploreResources(context, input);
				}
			})
			.build();
	}

	return new Tool('nodes')
		.description(
			context.nodeContractsEnabled
				? 'Work with n8n node types. Use `suggested` for known workflow categories, `search` to find services and their typed node modules, `type-definition` for all other nodes you configure in one call, `explore-resources` for live credential-backed lists, and `execute` to run one node standalone (requires user approval, real side effects).'
				: 'Work with n8n node types. Use `suggested` for known workflow categories, `search` for service-specific discovery, `type-definition` before configuring nodes, `explore-resources` for live credential-backed lists, and `execute` to run one node standalone (requires user approval, real side effects).',
		)
		.input(context.nodeContractsEnabled ? moduleFullInputSchema : fullInputSchema)
		.suspend(suspendSchema)
		.resume(instanceAiApprovalResumeSchema)
		.handler(async (input: FullInput, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'search':
					if (context.nodeContractsEnabled) {
						return await handleModuleSearch(context, input, searchEngineCache);
					}
					return await handleSearch(context, input, searchEngineCache);
				case 'describe':
					return await handleDescribe(context, input);
				case 'type-definition':
					return await handleTypeDefinition(context, input, ctx.loadSkill);
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
