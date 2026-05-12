import type { NodeTypeParser } from '@n8n/ai-workflow-builder';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import * as fs from 'fs/promises';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import * as path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

type NodeRequest =
	| string
	| {
			nodeId: string;
			version?: string;
			resource?: string;
			operation?: string;
			mode?: string;
	  };

export type NodeFilter = (nodeId: string) => boolean;

export interface SearchNodesOptions {
	/**
	 * Optional predicate restricting which node IDs are included in search results.
	 * Each unique filter reference gets its own tool instance and result cache;
	 * callers should use module-level function references to avoid unbounded growth.
	 */
	nodeFilter?: NodeFilter;
}

export interface SearchNodesStructuredOptions {
	/** When true, only return nodes that declare at least one credential. */
	hasCredential?: boolean;
}

export interface StructuredNodeSearchResult {
	nodeId: string;
	displayName: string;
	description: string;
}

export interface NodeOperationInputSchema {
	type: 'object';
	properties: Record<string, unknown>;
	required?: string[];
}

export interface NodeOperationSchema {
	/**
	 * Stable identifier:
	 * - `<nodeId>.<resource>.<operation>` when the node has both discriminators
	 * - `<nodeId>.<operation>` when there is only an operation discriminator
	 * - `<nodeId>` when the node has no resource/operation discriminators
	 */
	id: string;
	resource?: string;
	/** Omitted for nodes without an operation discriminator. */
	operation?: string;
	displayName: string;
	description?: string;
	inputSchema: NodeOperationInputSchema;
}

export interface NodeSchema {
	nodeId: string;
	displayName: string;
	description: string;
	credentials: Array<{ name: string }>;
	operations: NodeOperationSchema[];
}

/** Default per-query result limit; matches the LLM-facing search tool. */
const STRUCTURED_SEARCH_LIMIT = 5;

/**
 * Tiny stop-word list to drop noise tokens from multi-word queries. Without this,
 * "send a message to slack" would emit a search for "to", "a", etc. which the
 * underlying engine matches against everything.
 */
const SEARCH_STOP_WORDS = new Set<string>([
	'a',
	'an',
	'the',
	'to',
	'from',
	'for',
	'with',
	'and',
	'or',
	'on',
	'in',
	'of',
	'at',
	'by',
	'is',
	'are',
	'be',
]);

/**
 * Expand a list of user-supplied queries into the actual list of strings the
 * search engine should be hit with. For each query we emit:
 *   1. the full original phrase (so phrase matches like "create tweet" win)
 *   2. each individual non-stop-word token (so "send message slack" hits
 *      Slack actions even when the engine can't fuzzy-match the whole phrase)
 * Duplicates and stop-words are dropped.
 */
function expandToTokens(queries: string[]): string[] {
	const out = new Set<string>();
	for (const raw of queries) {
		const trimmed = raw.trim();
		if (trimmed.length === 0) continue;

		// Keep the original phrase first — best for "create tweet" style queries.
		out.add(trimmed);

		// Then split on whitespace + common separators and keep each meaningful token.
		const tokens = trimmed
			.toLowerCase()
			.split(/[\s,;:/]+/)
			.filter((t) => t.length > 1 && !SEARCH_STOP_WORDS.has(t));
		for (const token of tokens) {
			out.add(token);
		}
	}
	return [...out];
}

interface InvokableTool<TInput> {
	invoke(input: TInput): Promise<string>;
}

interface SearchState {
	tool?: InvokableTool<{ queries: string[] }>;
	cache: Map<string, string>;
}

const UNFILTERED: unique symbol = Symbol('unfiltered');

interface StringOption {
	value: string;
	displayName: string;
	description?: string;
}

function extractStringOptions(property: INodeProperties): StringOption[] {
	if (!property.options || !Array.isArray(property.options)) return [];

	const result: StringOption[] = [];
	for (const opt of property.options) {
		if (typeof opt !== 'object' || opt === null) continue;
		if (!('name' in opt) || !('value' in opt)) continue;
		const value = (opt as { value: unknown }).value;
		if (typeof value !== 'string') continue;
		const name = (opt as { name: unknown }).name;
		const description = (opt as { description?: unknown }).description;
		result.push({
			value,
			displayName: typeof name === 'string' ? name : value,
			...(typeof description === 'string' ? { description } : {}),
		});
	}
	return result;
}

function valueMatches(condition: unknown, value: string): boolean {
	if (Array.isArray(condition)) return condition.includes(value);
	return condition === value;
}

function operationVisibleForResource(property: INodeProperties, resourceValue: string): boolean {
	const displayOptions = property.displayOptions;
	if (!displayOptions) return true;

	const showResource = displayOptions.show?.resource;
	if (showResource !== undefined && !valueMatches(showResource, resourceValue)) return false;

	const hideResource = displayOptions.hide?.resource;
	if (hideResource !== undefined && valueMatches(hideResource, resourceValue)) return false;

	return true;
}

function propertyVisibleForOperation(property: INodeProperties, operationValue: string): boolean {
	const displayOptions = property.displayOptions;
	if (!displayOptions) return true;

	const show = displayOptions.show ?? {};
	if (show.operation !== undefined && !valueMatches(show.operation, operationValue)) return false;

	const hide = displayOptions.hide ?? {};
	if (hide.operation !== undefined && valueMatches(hide.operation, operationValue)) return false;

	return true;
}

function propertyVisibleForResourceOperation(
	property: INodeProperties,
	resourceValue: string,
	operationValue: string,
): boolean {
	const displayOptions = property.displayOptions;
	if (!displayOptions) return true;

	const show = displayOptions.show ?? {};
	if (show.resource !== undefined && !valueMatches(show.resource, resourceValue)) return false;
	if (show.operation !== undefined && !valueMatches(show.operation, operationValue)) return false;

	const hide = displayOptions.hide ?? {};
	if (hide.resource !== undefined && valueMatches(hide.resource, resourceValue)) return false;
	if (hide.operation !== undefined && valueMatches(hide.operation, operationValue)) return false;

	return true;
}

/**
 * Property names that are credential-binding discriminators or auth helpers,
 * not user-supplied parameters. The Hub model is: the caller passes a
 * `credentialId` separately; the engine resolves the rest. So we strip these
 * out of the input schema to avoid leaking implementation details and to
 * keep the schema focused on user-meaningful fields.
 */
const CREDENTIAL_DISCRIMINATOR_PROPERTIES = new Set<string>([
	'authentication',
	'nodeCredentialType',
	'genericAuthType',
	'curlImport',
]);

function buildInputSchema(properties: INodeProperties[]): NodeOperationInputSchema {
	const props: Record<string, unknown> = {};
	const required: string[] = [];

	for (const property of properties) {
		// Skip the resource/operation discriminators themselves — the consumer already
		// knows them from the operation id.
		if (property.name === 'resource' || property.name === 'operation') continue;

		// Skip credential-binding discriminators — the caller passes `credentialId`
		// separately and the engine resolves auth from there.
		if (CREDENTIAL_DISCRIMINATOR_PROPERTIES.has(property.name)) continue;

		props[property.name] = {
			type: jsonSchemaTypeFor(property.type),
			...(property.displayName ? { title: property.displayName } : {}),
			...(property.description ? { description: property.description } : {}),
			...(property.default !== undefined ? { default: property.default } : {}),
		};

		if (property.required) required.push(property.name);
	}

	const schema: NodeOperationInputSchema = {
		type: 'object',
		properties: props,
	};
	if (required.length > 0) schema.required = required;
	return schema;
}

function jsonSchemaTypeFor(nodeParamType: string | undefined): string {
	switch (nodeParamType) {
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'collection':
		case 'fixedCollection':
			return 'object';
		case 'multiOptions':
			return 'array';
		default:
			return 'string';
	}
}

/**
 * Shared node catalog for features that need to search, describe or suggest n8n nodes
 * (MCP workflow-builder tools, the agents runtime, future callers).
 *
 * Lazily initializes a {@link NodeTypeParser} on first use and resolves the built-in
 * node-definition directories used to load schemas. All caches invalidate automatically
 * when LoadNodesAndCredentials signals that node types were reloaded.
 */
@Service()
export class NodeCatalogService {
	private nodeTypeParser: NodeTypeParser | undefined;

	private nodeDefinitionDirs: string[] = [];

	private initPromise: Promise<void> | undefined;

	/** Tool + cache per unique `nodeFilter` reference (plus one unfiltered slot). */
	private readonly searchStates = new Map<NodeFilter | typeof UNFILTERED, SearchState>();

	private getTool: InvokableTool<{ nodeIds: NodeRequest[] }> | undefined;

	private suggestTool: InvokableTool<{ categories: string[] }> | undefined;

	private readonly getCache = new Map<string, string>();

	private readonly suggestCache = new Map<string, string>();

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly logger: Logger,
	) {
		this.loadNodesAndCredentials.addPostProcessor(async () => await this.refreshNodeTypes());
	}

	async initialize(): Promise<void> {
		this.initPromise ??= this.doInitialize();
		await this.initPromise;
	}

	getNodeTypeParser(): NodeTypeParser {
		if (!this.nodeTypeParser) {
			throw new Error('NodeCatalogService not initialized. Call initialize() first.');
		}
		return this.nodeTypeParser;
	}

	getNodeDefinitionDirs(): string[] {
		return this.nodeDefinitionDirs;
	}

	/**
	 * Search the node catalog for node IDs matching `queries`.
	 * Results are cached per `(filter, queries)` pair and invalidated on node-type refresh.
	 */
	async searchNodes(queries: string[], options: SearchNodesOptions = {}): Promise<string> {
		const { nodeFilter } = options;
		const stateKey: NodeFilter | typeof UNFILTERED = nodeFilter ?? UNFILTERED;

		let state = this.searchStates.get(stateKey);
		if (!state) {
			state = { cache: new Map() };
			this.searchStates.set(stateKey, state);
		}

		const cacheKey = JSON.stringify([...queries].sort());
		const cached = state.cache.get(cacheKey);
		if (cached) return cached;

		if (!state.tool) {
			const { createCodeBuilderSearchTool } = await import('@n8n/ai-workflow-builder');
			state.tool = nodeFilter
				? createCodeBuilderSearchTool(this.getNodeTypeParser(), { nodeFilter })
				: createCodeBuilderSearchTool(this.getNodeTypeParser());
		}

		const result = await state.tool.invoke({ queries });
		state.cache.set(cacheKey, result);
		return result;
	}

	/**
	 * Search the node catalog and return structured results suitable for JSON consumers
	 * (the MCP `n8n_search_tools` tool, the REST `GET /rest/nodes/search` endpoint).
	 *
	 * Unlike {@link searchNodes}, which returns an LLM-friendly text blob, this method
	 * calls `NodeTypeParser.searchNodeTypes()` directly and projects each hit to a small
	 * `{ nodeId, displayName, description }` shape. Results are de-duplicated by `nodeId`
	 * across all provided queries.
	 */
	async searchNodesStructured(
		queries: string[],
		opts?: SearchNodesStructuredOptions,
	): Promise<StructuredNodeSearchResult[]> {
		if (queries.length === 0) return [];

		// Lazily initialize so REST callers (NodesController) don't need to
		// know the service has a separate init step — only the MCP server
		// path was wiring this up before.
		await this.initialize();
		const parser = this.getNodeTypeParser();
		const seen = new Set<string>();
		const results: StructuredNodeSearchResult[] = [];

		// Expand multi-word queries into individual tokens so a query like
		// "send message slack" matches results that contain ANY of the words,
		// and "slack twitter" returns actions from both integrations. We also
		// keep the full original query (best for phrase matches like "create tweet").
		const expandedQueries = expandToTokens(queries);

		for (const query of expandedQueries) {
			const hits = parser.searchNodeTypes(query, STRUCTURED_SEARCH_LIMIT);
			for (const hit of hits) {
				if (seen.has(hit.id)) continue;

				// The Hub endpoint executes ACTION nodes (`POST /executions/node`
				// synthesizes a Manual Trigger → Action workflow). Skip:
				//   - Trigger nodes — they wait for external events, not invocable directly.
				//   - AI tool variants (id ends in `Tool`) — auto-generated companions
				//     of base nodes intended for use inside AI Agent workflows, not for
				//     direct execution. The base node (e.g. `slack`) appears separately.
				if (hit.id.endsWith('Tool')) continue;
				const nodeType = parser.getNodeType(hit.id, hit.version);
				if (this.isTriggerNode(nodeType)) continue;

				if (opts?.hasCredential) {
					if (!nodeType?.credentials || nodeType.credentials.length === 0) continue;
				}

				seen.add(hit.id);
				results.push({
					nodeId: hit.id,
					displayName: hit.displayName,
					description: hit.description,
				});
			}
		}

		return results;
	}

	/**
	 * Check if a node-type description is a trigger. n8n marks triggers via
	 * `group: ['trigger']` (case-insensitive) or via the descriptive flag
	 * `polling: true`. Some webhook-only nodes also set `webhooks: [...]`,
	 * but those aren't a strict trigger marker (e.g. some action nodes
	 * receive callbacks), so we only check the two reliable signals.
	 */
	private isTriggerNode(nodeType: INodeTypeDescription | null | undefined): boolean {
		if (!nodeType) return false;
		const group = nodeType.group ?? [];
		if (Array.isArray(group) && group.some((g) => g?.toLowerCase() === 'trigger')) return true;
		if (nodeType.polling === true) return true;
		return false;
	}

	/**
	 * Return a JSON-serialisable schema for a single node, suitable for the
	 * `GET /rest/nodes/:id` endpoint.
	 *
	 * Projects the node's `INodeTypeDescription` into:
	 *  - top-level metadata (`nodeId`, `displayName`, `description`)
	 *  - expected credential types
	 *  - one entry per discovered `(resource, operation)` tuple; nodes without a
	 *    resource/operation pattern get a single synthetic `default` operation that
	 *    exposes the full property list as the input schema.
	 *
	 * Returns `null` when the node type is not registered.
	 */
	async getNodeSchema(nodeId: string): Promise<NodeSchema | null> {
		await this.initialize();
		const parser = this.getNodeTypeParser();
		const nodeType = parser.getNodeType(nodeId);
		if (!nodeType) return null;

		const credentials = (nodeType.credentials ?? []).map((c) => ({ name: c.name }));

		const operations = this.buildOperationSchemas(nodeType, nodeId);

		return {
			nodeId,
			displayName: nodeType.displayName,
			description: nodeType.description,
			credentials,
			operations,
		};
	}

	private buildOperationSchemas(
		nodeType: INodeTypeDescription,
		nodeId: string,
	): NodeOperationSchema[] {
		const properties = nodeType.properties ?? [];
		const resourceProp = properties.find((p) => p.name === 'resource' && p.type === 'options');

		if (!resourceProp) {
			// Node has no resource discriminator. If it has an operation discriminator,
			// emit one entry per operation; otherwise emit a single entry with id=nodeId
			// (no synthetic `.default` segment — that would round-trip through parseToolId
			// as `operation: 'default'` and confuse the engine).
			const operationProps = properties.filter(
				(p) => p.name === 'operation' && p.type === 'options',
			);

			const ops: NodeOperationSchema[] = [];
			const seenOps = new Set<string>();
			for (const opProp of operationProps) {
				for (const op of extractStringOptions(opProp)) {
					if (seenOps.has(op.value)) continue;
					seenOps.add(op.value);
					ops.push({
						id: `${nodeId}.${op.value}`,
						operation: op.value,
						displayName: op.displayName,
						...(op.description ? { description: op.description } : {}),
						inputSchema: buildInputSchema(
							properties.filter((p) => propertyVisibleForOperation(p, op.value)),
						),
					});
				}
			}

			if (ops.length > 0) return ops;

			return [
				{
					id: nodeId,
					displayName: nodeType.displayName,
					description: nodeType.description,
					inputSchema: buildInputSchema(properties),
				},
			];
		}

		const resourceOptions = extractStringOptions(resourceProp);
		if (resourceOptions.length === 0) {
			return [
				{
					id: `${nodeId}.default`,
					operation: 'default',
					displayName: nodeType.displayName,
					description: nodeType.description,
					inputSchema: buildInputSchema(properties),
				},
			];
		}

		const operations: NodeOperationSchema[] = [];

		for (const resource of resourceOptions) {
			const operationProps = properties.filter(
				(p) =>
					p.name === 'operation' &&
					p.type === 'options' &&
					operationVisibleForResource(p, resource.value),
			);

			const seenOps = new Set<string>();
			for (const opProp of operationProps) {
				for (const op of extractStringOptions(opProp)) {
					if (seenOps.has(op.value)) continue;
					seenOps.add(op.value);

					operations.push({
						id: `${nodeId}.${resource.value}.${op.value}`,
						resource: resource.value,
						operation: op.value,
						displayName: op.displayName,
						...(op.description ? { description: op.description } : {}),
						inputSchema: buildInputSchema(
							properties.filter((p) =>
								propertyVisibleForResourceOperation(p, resource.value, op.value),
							),
						),
					});
				}
			}
		}

		if (operations.length === 0) {
			// Resource property exists but no operations were found — expose a single
			// entry with id=nodeId so round-tripping through parseToolId doesn't end up
			// passing `operation: 'default'` to a node that doesn't accept it.
			operations.push({
				id: nodeId,
				displayName: nodeType.displayName,
				description: nodeType.description,
				inputSchema: buildInputSchema(properties),
			});
		}

		return operations;
	}

	/** Get TypeScript type definitions for nodes, with result caching. */
	async getNodeTypes(nodeIds: NodeRequest[]): Promise<string> {
		const cacheKey = JSON.stringify(
			nodeIds.map((id) => (typeof id === 'string' ? id : JSON.stringify(id))).sort(),
		);
		const cached = this.getCache.get(cacheKey);
		if (cached) return cached;

		if (!this.getTool) {
			const { createCodeBuilderGetTool } = await import('@n8n/ai-workflow-builder');
			this.getTool = createCodeBuilderGetTool({ nodeDefinitionDirs: this.nodeDefinitionDirs });
		}
		const result = await this.getTool.invoke({ nodeIds });
		this.getCache.set(cacheKey, result);
		return result;
	}

	/** Get curated node suggestions by category, with result caching. */
	async getSuggestedNodes(categories: string[]): Promise<string> {
		const cacheKey = JSON.stringify([...categories].sort());
		const cached = this.suggestCache.get(cacheKey);
		if (cached) return cached;

		if (!this.suggestTool) {
			const { createGetSuggestedNodesTool } = await import('@n8n/ai-workflow-builder');
			this.suggestTool = createGetSuggestedNodesTool(this.getNodeTypeParser());
		}
		const result = await this.suggestTool.invoke({ categories });
		this.suggestCache.set(cacheKey, result);
		return result;
	}

	private async doInitialize(): Promise<void> {
		const { NodeTypeParser: NodeTypeParserClass } = await import('@n8n/ai-workflow-builder');
		const { setSchemaBaseDirs } = await import('@n8n/workflow-sdk');

		await this.loadNodesAndCredentials.postProcessLoaders();
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();

		this.nodeTypeParser = new NodeTypeParserClass(nodeTypeDescriptions);
		this.nodeDefinitionDirs = await this.resolveBuiltinNodeDefinitionDirs();

		setSchemaBaseDirs(this.nodeDefinitionDirs);

		this.logger.debug('NodeCatalogService initialized', {
			nodeTypeCount: nodeTypeDescriptions.length,
			nodeDefinitionDirs: this.nodeDefinitionDirs.length,
		});
	}

	private async refreshNodeTypes(): Promise<void> {
		if (!this.nodeTypeParser) return;

		const { NodeTypeParser: NodeTypeParserClass } = await import('@n8n/ai-workflow-builder');
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();
		this.nodeTypeParser = new NodeTypeParserClass(nodeTypeDescriptions);

		this.searchStates.clear();
		this.getTool = undefined;
		this.suggestTool = undefined;

		this.getCache.clear();
		this.suggestCache.clear();

		this.logger.debug('NodeCatalogService refreshed node types', {
			nodeTypeCount: nodeTypeDescriptions.length,
		});
	}

	private async resolveBuiltinNodeDefinitionDirs(): Promise<string[]> {
		const dirs: string[] = [];
		for (const packageId of ['n8n-nodes-base', '@n8n/n8n-nodes-langchain']) {
			try {
				const packageJsonPath = require.resolve(`${packageId}/package.json`);
				const distDir = path.dirname(packageJsonPath);
				let nodeDefsDir = path.join(distDir, 'dist', 'node-definitions');
				const separator = process.platform === 'win32' ? '\\' : '/';
				if (!nodeDefsDir.endsWith(separator)) {
					nodeDefsDir += separator;
				}
				await fs.access(nodeDefsDir);
				dirs.push(nodeDefsDir);
			} catch (error) {
				this.logger.debug(`Could not resolve node definitions for ${packageId}`, { error });
			}
		}
		return dirs;
	}
}
