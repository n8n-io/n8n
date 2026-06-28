import type {
	CodeBuilderSearchResult,
	NodeRequest,
	NodeTypeParser,
} from '@n8n/ai-utilities/node-catalog';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { INodeTypeDescription } from 'n8n-workflow';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

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
	private nodeDescriptions = new Map<string, INodeTypeDescription>();

	/**
	 * Synthetic MCP registry node descriptions indexed by their prefixed name
	 * (e.g. `@n8n/mcp-registry.notion`). Used by `getNodeTypes` to synthesise
	 * type-def content for registry slugs, which have no on-disk artifact.
	 */
	private mcpRegistryDescriptions = new Map<string, INodeTypeDescription>();

	private initPromise: Promise<void> | undefined;

	/**
	 * Checks whether a directory exists at the given path.
	 *
	 * Uses `fs.access` from `node:fs/promises` to avoid blocking the event loop
	 * and silently returns `false` on any error (e.g. ENOENT, EACCES).
	 */
	private async dirExists(dirPath: string): Promise<boolean> {
		try {
			await fs.access(dirPath);
			return true;
		} catch {
			return false;
		}
	}

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

	/** Exposed for tests; returns the resolved node definition directories. */
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
		if (nodeIds.length === 0) {
			return '';
		}

		const cacheKey = JSON.stringify(
			nodeIds.map((id) => (typeof id === 'string' ? id : JSON.stringify(id))).sort(),
		);

		const cached = this.getCache.get(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const onDiskIds: NodeRequest[] = [];
		const registryIds: NodeRequest[] = [];

		for (const id of nodeIds) {
			const nodeId = typeof id === 'string' ? id : id.nodeId;
			if (nodeId.startsWith(`${MCP_REGISTRY_PACKAGE_NAME}.`)) {
				registryIds.push(id);
			} else {
				onDiskIds.push(id);
			}
		}

		const results: string[] = [];
		const errors: string[] = [];

		for (const id of registryIds) {
			const nodeId = typeof id === 'string' ? id : id.nodeId;
			const description = this.mcpRegistryDescriptions.get(nodeId);
			if (description) {
				const synthesized = synthesizeMcpRegistryTypeDef(description);
				results.push(`## ${nodeId}\n\n\`\`\`typescript\n${synthesized}\n\`\`\``);
			} else {
				errors.push(
					`Node type '${nodeId}' not found. Use search_node to find the correct node ID.`,
				);
			}
		}

		if (onDiskIds.length > 0) {
			// Per-node static file resolution. Safe because MCP calls typically
			// involve 1-5 nodes and the SDK's `getNodeTypes` is cached, so
			// repeated calls for the same ID are cheap. Batched lookups mishandled
			// mixed success/failure results, losing or duplicating entries.
			for (const id of onDiskIds) {
				const nodeId = typeof id === 'string' ? id : id.nodeId;

				// MCP clients send fully qualified IDs like "n8n-nodes-resend.resend",
				// while `nodeDescriptions` is keyed by `INodeTypeDescription.name`,
				// which is the short name (e.g. "resend"). Extract the short name for
				// the in-memory lookup; keep the original `nodeId` for messages.
				const lookupName = nodeId.includes('.') ? nodeId.split('.').pop()! : nodeId;

				const { result, error } = await this.resolveOnDiskNode(id, nodeId, lookupName);
				if (result !== undefined) results.push(result);
				if (error !== undefined) errors.push(error);
			}
		}

		let response = '';

		if (results.length > 0) {
			response += `# TypeScript Type Definitions\n\n${results.join('\n\n---\n\n')}`;
		}

		if (errors.length > 0) {
			response += `\n\n# Errors\n\n${errors.join('\n')}`;
		}

		this.getCache.set(cacheKey, response);
		return response;
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

	/**
	 * Resolve a single on-disk node id to either a markdown result or an error message.
	 *
	 * Tries the SDK's static type-definition file first; on miss, falls back to
	 * synthesising a type from the in-memory node description. Errors from
	 * synthesis are returned to the caller — this method never throws on a
	 * missing or malformed node, it just reports the failure string.
	 */
	private async resolveOnDiskNode(
		id: NodeRequest,
		nodeId: string,
		lookupName: string,
	): Promise<{ result?: string; error?: string }> {
		const { getNodeTypes } = await import('@n8n/ai-utilities/node-catalog');

		const staticResult = getNodeTypes([id], {
			nodeDefinitionDirs: this.nodeDefinitionDirs,
		});

		// TODO: TECH DEBT – Replace string sniffing with a structured error result from
		// `@n8n/ai-utilities` to avoid silent breakage if the error message format changes.
		// Tests cover the current coupling.
		if (!staticResult.includes(`Node type '${nodeId}' not found.`)) {
			const cleaned = staticResult.replace(/^# TypeScript Type Definitions\n\n/, '');
			return { result: cleaned };
		}

		// Fallback to synthesis when the SDK has no static file for this node.
		const desc = this.nodeDescriptions.get(nodeId) ?? this.nodeDescriptions.get(lookupName);
		if (!desc) {
			return {
				error: `Node type '${nodeId}' not found. Use search_node to find the correct node ID.`,
			};
		}

		try {
			const { generateNodeTypeFile } = await import('@n8n/workflow-sdk');

			// generateNodeTypeFile does not accept discriminators; the
			// generated type therefore includes all properties. This is
			// acceptable as a best-effort fallback for nodes lacking a
			// published type-definition file.
			let ts = generateNodeTypeFile(desc as Parameters<typeof generateNodeTypeFile>[0]);
			if (!ts || ts.trim() === '') {
				ts = '// No parameters for this resource/operation.';
			}
			return {
				result: `## ${nodeId}\n\n\`\`\`typescript\n// Synthesized type for ${nodeId}\n// Generated from runtime node description (no static definition file available)\n${ts}\n\`\`\``,
			};
		} catch (error) {
			this.logger.warn(`Failed to synthesize type for ${nodeId}`, { error });
			return {
				error: `Node type '${nodeId}' is installed but type definitions could not be generated. Use validate_node_config to validate parameters instead.`,
			};
		}
	}

	private async doInitialize(): Promise<void> {
		const { NodeTypeParser: NodeTypeParserClass } = await import('@n8n/ai-utilities/node-catalog');
		const { setSchemaBaseDirs } = await import('@n8n/workflow-sdk');

		await this.loadNodesAndCredentials.postProcessLoaders();
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();

		const nextDescriptions = new Map<string, INodeTypeDescription>();
		for (const desc of nodeTypeDescriptions) {
			nextDescriptions.set(desc.name, desc);
		}
		const nextDirs = await this.resolveBuiltinNodeDefinitionDirs();

		// Atomic publish so concurrent readers never see a half-built catalog.
		this.nodeTypeParser = new NodeTypeParserClass(nodeTypeDescriptions);
		this.nodeDescriptions = nextDescriptions;
		this.nodeDefinitionDirs = nextDirs;
		this.indexMcpRegistryDescriptions(nodeTypeDescriptions);

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

		// Build the next snapshot in local variables, then publish atomically.
		// Concurrent `getNodeTypes()` calls keep reading the prior snapshot
		// (and its caches) for the whole rebuild — never a half-empty map.
		const nextDescriptions = new Map<string, INodeTypeDescription>();
		for (const desc of nodeTypeDescriptions) {
			nextDescriptions.set(desc.name, desc);
		}
		const nextDirs = await this.resolveBuiltinNodeDefinitionDirs();
		const nextParser = new NodeTypeParserClass(nodeTypeDescriptions);

		this.nodeTypeParser = nextParser;
		this.nodeDescriptions = nextDescriptions;
		this.nodeDefinitionDirs = nextDirs;
		this.indexMcpRegistryDescriptions(nodeTypeDescriptions);

		const { setSchemaBaseDirs } = await import('@n8n/workflow-sdk');
		setSchemaBaseDirs(this.nodeDefinitionDirs);

		// Invalidate caches AFTER the swap so a concurrent reader can't repopulate
		// them with stale results between the swap and the clear.
		this.searchStates.clear();
		this.getCache.clear();
		this.suggestCache.clear();

		this.logger.debug('NodeCatalogService refreshed node types', {
			nodeTypeCount: nodeTypeDescriptions.length,
		});
	}

	private indexMcpRegistryDescriptions(descriptions: INodeTypeDescription[]): void {
		const next = new Map<string, INodeTypeDescription>();
		const prefix = `${MCP_REGISTRY_PACKAGE_NAME}.`;
		for (const description of descriptions) {
			if (description.name.startsWith(prefix)) {
				next.set(description.name, description);
			}
		}
		this.mcpRegistryDescriptions = next;
	}

	private async resolveBuiltinNodeDefinitionDirs(): Promise<string[]> {
		const dirs: string[] = [];
		for (const packageId of ['n8n-nodes-base', '@n8n/n8n-nodes-langchain']) {
			try {
				const packageJsonPath = require.resolve(`${packageId}/package.json`);
				const distDir = path.dirname(packageJsonPath);
				let nodeDefsDir = path.join(distDir, 'dist', 'node-definitions');

				if (process.env.N8N_DEV_RELOAD) {
					nodeDefsDir = path.join(distDir, 'node-definitions');
				}

				if (await this.dirExists(nodeDefsDir)) {
					dirs.push(nodeDefsDir);
				}
			} catch (error) {
				this.logger.debug(`Could not resolve node definitions for ${packageId}`, { error });
			}
		}

		const seen = new Set<string>(dirs);
		for (const loader of Object.values(this.loadNodesAndCredentials.loaders)) {
			if (
				loader &&
				typeof loader === 'object' &&
				'directory' in loader &&
				typeof (loader as { directory: unknown }).directory === 'string'
			) {
				// `dirExists` swallows all errors (ENOENT, EACCES, EMFILE, …) so a
				// loader with a permission-locked node-definitions dir can't crash
				// the catalog refresh — it just gets skipped.
				const nodeDefsDir = path.join(
					(loader as { directory: string }).directory,
					'dist',
					'node-definitions',
				);
				if ((await this.dirExists(nodeDefsDir)) && !seen.has(nodeDefsDir)) {
					dirs.push(nodeDefsDir);
					seen.add(nodeDefsDir);
				}
			}
		}

		return dirs;
	}
}
