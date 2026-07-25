import type {
	CodeBuilderSearchResult,
	NodeRequest,
	NodeTypeParser,
} from '@n8n/ai-utilities/node-catalog';
import { Logger } from '@n8n/backend-common';
import { BUILTIN_NODES_PACKAGES } from '@n8n/constants';
import { Service } from '@n8n/di';
import * as fs from 'fs/promises';
import { LRUCache } from 'lru-cache';
import type { INodeTypeDescription } from 'n8n-workflow';
import * as path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { synthesizeNodeTypeDef } from '@/modules/mcp-registry/synthesize-type-def';

export type NodeFilter = (nodeId: string) => boolean;

/**
 * Built-in node IDs resolve through the richer, discriminator-aware on-disk
 * lookup; everything else (MCP registry, custom and community nodes) is
 * synthesized from its in-memory description.
 */
const isBuiltinNodeId = (nodeId: string): boolean =>
	BUILTIN_NODES_PACKAGES.some((pkg) => nodeId.startsWith(`${pkg}.`));

const nodeVersionNumbers = (description: INodeTypeDescription): number[] => {
	if (Array.isArray(description.version)) return description.version;
	if (typeof description.version === 'number') return [description.version];
	return [];
};

const maxNodeVersion = (description: INodeTypeDescription): number =>
	Math.max(0, ...nodeVersionNumbers(description));

const parseRequestedVersion = (version: string): number => {
	const normalized = version.replace(/^v/i, '');
	if (/^\d+$/.test(normalized) && normalized.length === 2) {
		return Number(`${normalized[0]}.${normalized[1]}`);
	}
	return Number.parseFloat(normalized);
};

const versionLabel = (description: INodeTypeDescription): string | undefined => {
	const version = maxNodeVersion(description);
	return version > 0 ? String(version) : undefined;
};

export interface SearchNodesOptions {
	/**
	 * Optional predicate restricting which node IDs are included in search results.
	 * Each unique filter reference gets its own search state and result cache;
	 * callers should use module-level function references to avoid unbounded growth.
	 */
	nodeFilter?: NodeFilter;
}

export interface NodeTypeDefinitionRequest {
	nodeId: string;
	version?: string;
	resource?: string;
	operation?: string;
	mode?: string;
}

export interface NodeTypeDefinitionResult {
	content: string;
	version?: string;
	error?: string;
	builderHint?: string;
}

interface SearchState {
	search?: (queries: string[]) => CodeBuilderSearchResult;
	cache: Map<string, CodeBuilderSearchResult>;
}

const UNFILTERED: unique symbol = Symbol('unfiltered');

const MAX_TYPE_DEFINITION_CACHE_BYTES = 16 * 1024 * 1024;

const stringBytes = (value?: string): number => (value ? Buffer.byteLength(value, 'utf8') : 0);

// lru-cache rejects non-positive sizes, so clamp to 1 even for empty results
const definitionResultBytes = (item: NodeTypeDefinitionResult): number =>
	Math.max(
		1,
		stringBytes(item.content) +
			stringBytes(item.version) +
			stringBytes(item.error) +
			stringBytes(item.builderHint),
	);

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
	 * All loaded node descriptions indexed by their type name (e.g.
	 * `n8n-nodes-base.set`, `@n8n/mcp-registry.notion`, `n8n-nodes-resend.resend`).
	 * Used by `getNodeTypes` to synthesise type-def content for non-built-in
	 * nodes (registry, custom and community), which have no on-disk artifact.
	 *
	 * Versioned nodes contribute one description per version under the same name,
	 * so values are arrays; `selectDescription` picks the requested or latest one.
	 */
	private descriptionsById = new Map<string, INodeTypeDescription[]>();

	private initPromise: Promise<void> | undefined;

	/**
	 * Search function + full result cache per unique `nodeFilter` reference (plus one unfiltered slot).
	 * The cache stores the complete `CodeBuilderSearchResult`, so callers can consume only the fields they need.
	 */
	private readonly searchStates = new Map<NodeFilter | typeof UNFILTERED, SearchState>();

	private readonly getCache = new Map<string, string>();

	/**
	 * Definition results can be large and this cache is only fully invalidated on
	 * node-type reloads, so bound it by total byte size: least recently used
	 * entries are evicted once the budget is exceeded, and single entries over
	 * the budget are silently not stored (maxEntrySize defaults to maxSize).
	 */
	private readonly getDefinitionCache = new LRUCache<string, NodeTypeDefinitionResult>({
		maxSize: MAX_TYPE_DEFINITION_CACHE_BYTES,
		sizeCalculation: definitionResultBytes,
	});

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

		// Built-in nodes resolve through the on-disk type defs (richer,
		// discriminator-aware). Everything else (MCP registry, custom and
		// community nodes) has no on-disk artifact, so synthesize from the
		// in-memory description collected from the loaders.
		const onDiskIds: NodeRequest[] = [];
		const synthesizeIds: NodeRequest[] = [];
		for (const id of nodeIds) {
			const nodeId = typeof id === 'string' ? id : id.nodeId;
			if (isBuiltinNodeId(nodeId)) {
				onDiskIds.push(id);
			} else {
				synthesizeIds.push(id);
			}
		}

		const parts: string[] = [];
		const errors: string[] = [];

		for (const id of synthesizeIds) {
			const result = await this.getNodeTypeDefinition(this.toDefinitionRequest(id));
			if (result.error) {
				errors.push(result.error);
			} else {
				parts.push(result.content);
			}
		}

		if (onDiskIds.length > 0) {
			const { getNodeTypes } = await import('@n8n/ai-utilities/node-catalog');
			parts.push(getNodeTypes(onDiskIds, { nodeDefinitionDirs: this.nodeDefinitionDirs }));
		}

		if (errors.length > 0) {
			parts.push(`# Errors\n\n${errors.join('\n')}`);
		}

		const result = parts.join('\n\n');
		this.getCache.set(cacheKey, result);
		return result;
	}

	/** Get a structured TypeScript type definition for one node. */
	async getNodeTypeDefinition(
		request: NodeTypeDefinitionRequest,
	): Promise<NodeTypeDefinitionResult> {
		const cacheKey = JSON.stringify(request);
		const cached = this.getDefinitionCache.get(cacheKey);
		if (cached) return cached;

		const result = isBuiltinNodeId(request.nodeId)
			? await this.getBuiltinNodeTypeDefinition(request)
			: this.getSynthesizedNodeTypeDefinition(request);

		if (!result.error) {
			this.getDefinitionCache.set(cacheKey, result);
		}
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
		this.indexDescriptions(nodeTypeDescriptions);
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
		this.indexDescriptions(nodeTypeDescriptions);

		this.searchStates.clear();

		this.getCache.clear();
		this.getDefinitionCache.clear();
		this.suggestCache.clear();

		this.logger.debug('NodeCatalogService refreshed node types', {
			nodeTypeCount: nodeTypeDescriptions.length,
		});
	}

	private indexDescriptions(descriptions: INodeTypeDescription[]): void {
		this.descriptionsById.clear();
		for (const description of descriptions) {
			const existing = this.descriptionsById.get(description.name);
			if (existing) {
				existing.push(description);
			} else {
				this.descriptionsById.set(description.name, [description]);
			}
		}
	}

	private toDefinitionRequest(nodeRequest: NodeRequest): NodeTypeDefinitionRequest {
		if (typeof nodeRequest === 'string') return { nodeId: nodeRequest };

		return {
			nodeId: nodeRequest.nodeId,
			...(nodeRequest.version ? { version: nodeRequest.version } : {}),
			...(nodeRequest.resource ? { resource: nodeRequest.resource } : {}),
			...(nodeRequest.operation ? { operation: nodeRequest.operation } : {}),
			...(nodeRequest.mode ? { mode: nodeRequest.mode } : {}),
		};
	}

	private async getBuiltinNodeTypeDefinition(
		request: NodeTypeDefinitionRequest,
	): Promise<NodeTypeDefinitionResult> {
		const { getNodeTypeDefinition } = await import('@n8n/ai-utilities/node-catalog');
		const result = getNodeTypeDefinition(request.nodeId, request.version, this.nodeDefinitionDirs, {
			resource: request.resource,
			operation: request.operation,
			mode: request.mode,
		});

		const candidates = this.descriptionsById.get(request.nodeId);
		const description = candidates
			? this.selectDescription(candidates, result.version ?? request.version)
			: undefined;
		const builderHint = description?.builderHint?.searchHint;

		if (result.error) {
			return {
				content: '',
				error: result.error,
				...(builderHint ? { builderHint } : {}),
			};
		}

		return {
			content: result.content,
			...(result.version ? { version: result.version } : {}),
			...(builderHint ? { builderHint } : {}),
		};
	}

	private getSynthesizedNodeTypeDefinition(
		request: NodeTypeDefinitionRequest,
	): NodeTypeDefinitionResult {
		const candidates = this.descriptionsById.get(request.nodeId);
		if (!candidates?.length) {
			return {
				content: '',
				error: `Node type '${request.nodeId}' not found. Use search_nodes to find the correct node ID.`,
			};
		}

		const description = this.selectDescription(candidates, request.version);
		if (!description) {
			return {
				content: '',
				error: this.versionNotFoundError(request.nodeId, request.version, candidates),
			};
		}

		try {
			const version = versionLabel(description);
			return {
				content: synthesizeNodeTypeDef(description),
				...(version ? { version } : {}),
				...(description.builderHint?.searchHint
					? { builderHint: description.builderHint.searchHint }
					: {}),
			};
		} catch (error) {
			this.logger.debug('Could not synthesize node type definition', {
				nodeId: request.nodeId,
				error,
			});
			return {
				content: '',
				error: `Type definition for '${request.nodeId}' could not be generated from the node's description.`,
			};
		}
	}

	/**
	 * Pick the description to synthesize from a node's versions. Honour an
	 * explicitly requested version (returning undefined when none matches, so
	 * the caller can report it), otherwise default to the latest (mirroring the
	 * on-disk lookup's default).
	 */
	private selectDescription(
		candidates: INodeTypeDescription[],
		requestedVersion?: string,
	): INodeTypeDescription | undefined {
		if (requestedVersion !== undefined) {
			const wanted = parseRequestedVersion(requestedVersion);
			return candidates.find((d) => nodeVersionNumbers(d).includes(wanted));
		}

		return candidates.reduce((latest, d) =>
			maxNodeVersion(d) > maxNodeVersion(latest) ? d : latest,
		);
	}

	private versionNotFoundError(
		nodeId: string,
		requestedVersion: string | undefined,
		candidates: INodeTypeDescription[],
	): string {
		const available = [...new Set(candidates.flatMap(nodeVersionNumbers))].sort((a, b) => a - b);
		return `Version '${requestedVersion}' not found for node '${nodeId}'. Available versions: ${available.join(', ')}.`;
	}

	private async resolveBuiltinNodeDefinitionDirs(): Promise<string[]> {
		const dirs: string[] = [];
		for (const packageId of BUILTIN_NODES_PACKAGES) {
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
