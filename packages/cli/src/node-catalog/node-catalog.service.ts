import type { NodeRequest, NodeTypeParser } from '@n8n/ai-workflow-builder';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import * as fs from 'fs/promises';
import * as path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

export type NodeFilter = (nodeId: string) => boolean;

export interface SearchNodesOptions {
	/**
	 * Optional predicate restricting which node IDs are included in search results.
	 * Each unique filter reference gets its own tool instance and result cache;
	 * callers should use module-level function references to avoid unbounded growth.
	 */
	nodeFilter?: NodeFilter;
}

interface InvokableTool<TInput> {
	invoke(input: TInput): Promise<string>;
}

const UNFILTERED: unique symbol = Symbol('unfiltered');

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

	/** Result cache per unique `nodeFilter` reference (plus one unfiltered slot). */
	private readonly searchCaches = new Map<NodeFilter | typeof UNFILTERED, Map<string, string>>();

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
	 *
	 * Calls the plain `searchNodes` helper from `@n8n/ai-workflow-builder` rather
	 * than its LangChain `tool(...)` wrapper. When `LANGCHAIN_TRACING_V2` is on
	 * (the agents SDK enables it for the OTel exporter), the wrapper would
	 * register a separate LangSmith root run for every invocation — fragmenting
	 * traces. The plain helper runs entirely inside the caller's OTel span.
	 */
	async searchNodes(queries: string[], options: SearchNodesOptions = {}): Promise<string> {
		const { nodeFilter } = options;
		const stateKey: NodeFilter | typeof UNFILTERED = nodeFilter ?? UNFILTERED;

		let cache = this.searchCaches.get(stateKey);
		if (!cache) {
			cache = new Map();
			this.searchCaches.set(stateKey, cache);
		}

		const cacheKey = JSON.stringify([...queries].sort());
		const cached = cache.get(cacheKey);
		if (cached) return cached;

		const { searchNodes } = await import('@n8n/ai-workflow-builder');
		const result = searchNodes(
			this.getNodeTypeParser(),
			queries,
			nodeFilter ? { nodeFilter } : undefined,
		);
		cache.set(cacheKey, result);
		return result;
	}

	/** Get TypeScript type definitions for nodes, with result caching. */
	async getNodeTypes(nodeIds: NodeRequest[]): Promise<string> {
		const cacheKey = JSON.stringify(
			nodeIds.map((id) => (typeof id === 'string' ? id : JSON.stringify(id))).sort(),
		);
		const cached = this.getCache.get(cacheKey);
		if (cached) return cached;

		const { getNodeTypes } = await import('@n8n/ai-workflow-builder');
		const result = getNodeTypes(nodeIds, { nodeDefinitionDirs: this.nodeDefinitionDirs });
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

		this.searchCaches.clear();
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
