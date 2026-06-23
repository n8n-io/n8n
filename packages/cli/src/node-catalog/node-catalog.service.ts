import type {
	CodeBuilderSearchResult,
	NodeRequest,
	NodeTypeParser,
} from '@n8n/ai-utilities/node-catalog';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import * as fs from 'fs/promises';
import type { INodeTypeDescription } from 'n8n-workflow';
import * as path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { MCP_REGISTRY_PACKAGE_NAME } from '@/modules/mcp-registry/node-description-transform';
import { synthesizeMcpRegistryTypeDef } from '@/modules/mcp-registry/synthesize-type-def';

export type NodeFilter = (nodeId: string) => boolean;

export interface SearchNodesOptions {
	/**
	 * Optional predicate restricting which node IDs are included in search results.
	 * Each unique filter reference gets its own search state and result cache;
	 * callers should use module-level function references to avoid unbounded growth.
	 */
	nodeFilter?: NodeFilter;
}

interface SearchState {
	search?: (queries: string[]) => CodeBuilderSearchResult;
	cache: Map<string, CodeBuilderSearchResult>;
}

const UNFILTERED: unique symbol = Symbol('unfiltered');

/**
 * Shared node catalog for features that need to search, describe or suggest n8n nodes
 * (MCP workflow-builder tools, the agents runtime, future callers).
 *
 * Call {@link initialize} before first use to resolve node-definition directories
 * and build the {@link NodeTypeParser}. All caches invalidate automatically when
 * LoadNodesAndCredentials signals that node types were reloaded.
 */
@Service()
export class NodeCatalogService {
	private nodeTypeParser: NodeTypeParser | undefined;

	private nodeDefinitionDirs: string[] = [];

	/**
	 * Synthetic MCP registry node descriptions indexed by their prefixed name
	 * (e.g. `@n8n/mcp-registry.notion`). Used by `getNodeTypes` to synthesise
	 * type-def content for registry slugs, which have no on-disk artifact.
	 */
	private mcpRegistryDescriptions = new Map<string, INodeTypeDescription>();

	private initPromise: Promise<void> | undefined;

	/**
	 * Search function + full result cache per unique `nodeFilter` reference (plus one unfiltered slot).
	 * The cache stores the complete `CodeBuilderSearchResult`, so callers can consume only the fields they need.
	 */
	private readonly searchStates = new Map<NodeFilter | typeof UNFILTERED, SearchState>();

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
	 *
	 * Calls the plain `searchCodeBuilderNodes` helper from `@n8n/ai-workflow-builder`
	 * rather than its LangChain `tool(...)` wrapper. When `LANGCHAIN_TRACING_V2` is on
	 * (the agents SDK enables it for the OTel exporter), the wrapper would register a
	 * separate LangSmith root run for every invocation — fragmenting traces. The plain
	 * helper runs entirely inside the caller's OTel span.
	 */
	async searchNodes(
		queries: string[],
		options: SearchNodesOptions = {},
	): Promise<CodeBuilderSearchResult> {
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

		if (!state.search) {
			const { searchCodeBuilderNodes } = await import('@n8n/ai-utilities/node-catalog');
			const nodeTypeParser = this.getNodeTypeParser();
			state.search = (searchQueries: string[]) =>
				nodeFilter
					? searchCodeBuilderNodes(nodeTypeParser, searchQueries, { nodeFilter })
					: searchCodeBuilderNodes(nodeTypeParser, searchQueries);
		}

		const result = state.search(queries);
		state.cache.set(cacheKey, result);
		return result;
	}

	/** Get TypeScript type definitions for nodes, with result caching. */
	async getNodeTypes(nodeIds: NodeRequest[]): Promise<string> {
		const cacheKey = JSON.stringify(
			nodeIds.map((id) => (typeof id === 'string' ? id : JSON.stringify(id))).sort(),
		);
		const cached = this.getCache.get(cacheKey);
		if (cached) return cached;

		const registryIds: NodeRequest[] = [];
		const onDiskIds: NodeRequest[] = [];
		for (const id of nodeIds) {
			const nodeId = typeof id === 'string' ? id : id.nodeId;
			if (nodeId.startsWith(`${MCP_REGISTRY_PACKAGE_NAME}.`)) {
				registryIds.push(id);
			} else {
				onDiskIds.push(id);
			}
		}

		const parts: string[] = [];

		for (const id of registryIds) {
			const nodeId = typeof id === 'string' ? id : id.nodeId;
			const description = this.mcpRegistryDescriptions.get(nodeId);
			if (description) {
				parts.push(synthesizeMcpRegistryTypeDef(description));
			}
		}

		if (onDiskIds.length > 0) {
			const { getNodeTypes } = await import('@n8n/ai-utilities/node-catalog');
			parts.push(getNodeTypes(onDiskIds, { nodeDefinitionDirs: this.nodeDefinitionDirs }));
		}

		const result = parts.join('\n\n');
		this.getCache.set(cacheKey, result);
		return result;
	}

	/** Get curated node suggestions by category, with result caching. */
	async getSuggestedNodes(categories: string[]): Promise<string> {
		const cacheKey = JSON.stringify([...categories].sort());
		const cached = this.suggestCache.get(cacheKey);
		if (cached) return cached;

		const { getSuggestedNodes } = await import('@n8n/ai-utilities/node-catalog');
		const result = getSuggestedNodes(this.getNodeTypeParser(), categories);
		this.suggestCache.set(cacheKey, result);
		return result;
	}

	private async doInitialize(): Promise<void> {
		const { NodeTypeParser: NodeTypeParserClass } = await import('@n8n/ai-utilities/node-catalog');
		const { setSchemaBaseDirs } = await import('@n8n/workflow-sdk');

		await this.loadNodesAndCredentials.postProcessLoaders();
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();

		this.nodeTypeParser = new NodeTypeParserClass(nodeTypeDescriptions);
		this.indexMcpRegistryDescriptions(nodeTypeDescriptions);
		this.nodeDefinitionDirs = await this.resolveBuiltinNodeDefinitionDirs();

		setSchemaBaseDirs(this.nodeDefinitionDirs);

		this.logger.debug('NodeCatalogService initialized', {
			nodeTypeCount: nodeTypeDescriptions.length,
			nodeDefinitionDirs: this.nodeDefinitionDirs.length,
		});
	}

	private async refreshNodeTypes(): Promise<void> {
		if (!this.nodeTypeParser) return;

		const { NodeTypeParser: NodeTypeParserClass } = await import('@n8n/ai-utilities/node-catalog');
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();
		this.nodeTypeParser = new NodeTypeParserClass(nodeTypeDescriptions);
		this.indexMcpRegistryDescriptions(nodeTypeDescriptions);

		this.searchStates.clear();

		this.getCache.clear();
		this.suggestCache.clear();

		this.logger.debug('NodeCatalogService refreshed node types', {
			nodeTypeCount: nodeTypeDescriptions.length,
		});
	}

	private indexMcpRegistryDescriptions(descriptions: INodeTypeDescription[]): void {
		this.mcpRegistryDescriptions.clear();
		const prefix = `${MCP_REGISTRY_PACKAGE_NAME}.`;
		for (const description of descriptions) {
			if (description.name.startsWith(prefix)) {
				this.mcpRegistryDescriptions.set(description.name, description);
			}
		}
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
