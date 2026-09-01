import type {
	CodeBuilderSearchResult,
	NodeRequest,
	NodeTypeParser,
} from '@n8n/ai-utilities/node-catalog';
import { Logger } from '@n8n/backend-common';
import { BUILTIN_NODES_PACKAGES } from '@n8n/constants';
import { Container, Service } from '@n8n/di';
import * as fs from 'fs/promises';
import { LRUCache } from 'lru-cache';
import type { INodeTypeDescription } from 'n8n-workflow';
import * as path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { synthesizeNodeTypeDef } from '@/modules/mcp-registry/synthesize-type-def';

import { findRegistryMatches, type RegistryCandidate } from './registry-lookup';

export type NodeFilter = (nodeId: string) => boolean;

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

/**
 * Opt-in access to the second catalog tier: verified community nodes published
 * to the n8n registry but *not installed* on this instance.
 *
 * Off by default, so every existing caller (Instance AI, the agents builder)
 * keeps seeing installed nodes only. The MCP workflow-builder tools are the
 * sole opt-in today — they can offer the agent an `install_community_node`
 * step, which the other surfaces have no equivalent for.
 */
export interface CatalogScopeOptions {
	includeUninstalled?: boolean;
}

/**
 * Search result plus the second-tier nodes that were offered, so callers can
 * report on the tier without parsing the rendered results string.
 */
export interface CatalogSearchResult extends CodeBuilderSearchResult {
	/** Verified-but-uninstalled node types offered alongside the installed hits. */
	uninstalledOffered?: string[];
}

export interface SearchNodesOptions extends CatalogScopeOptions {
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

/**
 * How long a built second tier is trusted before the next opt-in rebuilds it.
 * Mirrors the verified-registry refresh interval in CommunityNodeTypesService:
 * node-type reloads alone are not enough to bound staleness, because an
 * instance can run for days without one while the registry publishes new
 * verified nodes.
 */
const UNINSTALLED_TIER_TTL_MS = 8 * 60 * 60 * 1000;

const UNINSTALLED_SECTION_HEADING = [
	'## Verified community nodes (not installed on this instance)',
	'',
	'These are published to the n8n community registry and vetted by n8n, but not installed here.',
	'A workflow using one will not run until the package is installed.',
].join('\n');

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

	/**
	 * Second-tier verified community nodes not installed here, indexed only when
	 * a caller opts in. Built lazily on first opt-in request and dropped on
	 * node-type refresh, so instances that never opt in pay nothing.
	 */
	private uninstalledParser: NodeTypeParser | undefined;

	/**
	 * One description per type, unlike {@link descriptionsById}: the registry
	 * publishes a single version of each entry.
	 */
	private uninstalledDescriptionsById = new Map<string, INodeTypeDescription>();

	/** Match/rank inputs for the second tier, parallel to the descriptions above. */
	private uninstalledCandidates: RegistryCandidate[] = [];

	private uninstalledPromise: Promise<void> | undefined;

	/** When the current second tier was built, for {@link UNINSTALLED_TIER_TTL_MS}. */
	private uninstalledBuiltAt = 0;

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
	): Promise<CatalogSearchResult> {
		const installed = await this.searchInstalledNodes(queries, options);
		if (!options.includeUninstalled) return installed;

		return await this.appendUninstalledMatches(queries, installed, options.nodeFilter);
	}

	private async searchInstalledNodes(
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

	/**
	 * Append verified-but-uninstalled matches below the installed results, as a
	 * clearly labelled second section.
	 *
	 * Matching is deliberately precise rather than fuzzy (see
	 * {@link findRegistryMatches}): a fuzzy index over the registry answers
	 * almost every query with something, so "slack" comes back with unrelated
	 * packages. Precise matching answers with the service asked for, or with
	 * nothing, and nothing is the right answer most of the time.
	 *
	 * Blocks are rendered with the shared formatter so they read identically to
	 * the installed results above them.
	 */
	private async appendUninstalledMatches(
		queries: string[],
		installed: CodeBuilderSearchResult,
		nodeFilter?: NodeFilter,
	): Promise<CatalogSearchResult> {
		const parser = await this.getUninstalledParser();
		if (!parser) return installed;

		const { formatNodeResult } = await import('@n8n/ai-utilities/node-catalog');
		const candidates = nodeFilter
			? this.uninstalledCandidates.filter((candidate) => nodeFilter(candidate.name))
			: this.uninstalledCandidates;

		const blocks: string[] = [];
		const answered = new Set<string>();
		const offered = new Set<string>();
		for (const query of queries) {
			const matches = findRegistryMatches(query, candidates);
			const formatted: string[] = [];
			for (const match of matches) {
				const block = formatNodeResult(parser, match.name);
				if (!block) continue;
				formatted.push(block);
				offered.add(match.name);
			}
			if (formatted.length === 0) continue;

			blocks.push(`## "${query}"\n\n${formatted.join('\n\n')}`);
			answered.add(query);
		}

		if (blocks.length === 0) return installed;

		return {
			results: [installed.results, UNINSTALLED_SECTION_HEADING, ...blocks].join('\n\n---\n\n'),
			queriesWithNoResults: installed.queriesWithNoResults.filter((q) => !answered.has(q)),
			uninstalledOffered: [...offered],
		};
	}

	/**
	 * Build (once) the parser over verified community nodes this instance has
	 * not installed. Returns `undefined` when the community-packages module is
	 * disabled, verified packages are turned off, or the registry fetch failed —
	 * in every one of those cases the caller falls back to installed-only
	 * results rather than erroring.
	 */
	private async getUninstalledParser(): Promise<NodeTypeParser | undefined> {
		// Expire a tier that has outlived the registry refresh interval. Dropped
		// only once a build has completed, so this never discards an in-flight one.
		if (this.uninstalledParser && Date.now() - this.uninstalledBuiltAt > UNINSTALLED_TIER_TTL_MS) {
			this.dropUninstalledTier();
		}

		this.uninstalledPromise ??= this.buildUninstalledTier();
		await this.uninstalledPromise;

		// Retry on the next call when the build came back empty: the registry may
		// simply have been unreachable, and memoizing that would disable discovery
		// until the next node-type reload. Retries are cheap and self-limiting —
		// CommunityNodeTypesService holds its own retry timestamp, so a follow-up
		// call reads its empty map instead of refetching.
		if (!this.uninstalledParser) this.uninstalledPromise = undefined;

		return this.uninstalledParser;
	}

	private async buildUninstalledTier(): Promise<void> {
		const entries = await this.loadUninstalledEntries();
		if (entries.length === 0) return;

		const descriptions = entries.map((entry) => entry.description);

		const { NodeTypeParser: NodeTypeParserClass } = await import('@n8n/ai-utilities/node-catalog');
		try {
			this.uninstalledParser = new NodeTypeParserClass(descriptions);
		} catch (error) {
			this.logger.warn('Could not index uninstalled verified community nodes', { error });
			return;
		}

		for (const description of descriptions) {
			this.uninstalledDescriptionsById.set(description.name, description);
		}
		this.uninstalledCandidates = entries.map((entry) => entry.candidate);
		this.uninstalledBuiltAt = Date.now();

		this.logger.debug('NodeCatalogService indexed uninstalled verified community nodes', {
			nodeTypeCount: descriptions.length,
		});
	}

	/** Discard the second tier so the next opt-in request rebuilds it. */
	private dropUninstalledTier(): void {
		this.uninstalledParser = undefined;
		this.uninstalledDescriptionsById = new Map();
		this.uninstalledCandidates = [];
		this.uninstalledPromise = undefined;
		this.uninstalledBuiltAt = 0;
	}

	/**
	 * Verified registry entries this instance has not installed.
	 *
	 * Restricted to `isOfficialNode`, matching what the node creator panel
	 * already surfaces on the canvas, so the agent and the editor offer the same
	 * set. Returns an empty list when the community-packages module is disabled,
	 * verified packages are turned off, or the registry fetch failed, in every
	 * case leaving the caller with installed-only results rather than an error.
	 */
	private async loadUninstalledEntries(): Promise<
		Array<{ description: INodeTypeDescription; candidate: RegistryCandidate }>
	> {
		try {
			const { CommunityPackagesConfig } = await import(
				'@/modules/community-packages/community-packages.config.js'
			);
			const config = Container.get(CommunityPackagesConfig);
			// Checked before resolving the service so a disabled module never has
			// its dependency chain constructed just to return an empty catalog.
			if (!config.enabled || !config.verifiedEnabled) return [];

			const { CommunityNodeTypesService } = await import(
				'@/modules/community-packages/community-node-types.service.js'
			);
			const catalog = await Container.get(CommunityNodeTypesService).getCommunityNodeTypes();

			return catalog
				.filter((entry) => entry.isOfficialNode && !entry.isInstalled)
				.filter((entry) => !this.descriptionsById.has(entry.name))
				.filter((entry) => Array.isArray(entry.nodeDescription?.properties))
				.map((entry) => ({
					// The registry publishes uninstalled nodes under a `-preview`
					// package name; index them under the type they will have once
					// installed, so nothing downstream has to strip the token.
					// Shallow-copied because the description object is shared with
					// CommunityNodeTypesService.
					description: { ...entry.nodeDescription, name: entry.name },
					candidate: {
						name: entry.name,
						displayName: entry.displayName,
						numberOfDownloads: entry.numberOfDownloads,
					},
				}));
		} catch (error) {
			this.logger.warn('Could not load verified community node catalog', { error });
			return [];
		}
	}

	/** Get TypeScript type definitions for nodes, with result caching. */
	async getNodeTypes(nodeIds: NodeRequest[], options: CatalogScopeOptions = {}): Promise<string> {
		const cacheKey = JSON.stringify([
			Boolean(options.includeUninstalled),
			nodeIds.map((id) => (typeof id === 'string' ? id : JSON.stringify(id))).sort(),
		]);
		const cached = this.getCache.get(cacheKey);
		if (cached) return cached;

		const onDiskIds: NodeRequest[] = [];
		const synthesizeIds: NodeRequest[] = [];
		for (const id of nodeIds) {
			if (this.resolvesFromDisk(this.toDefinitionRequest(id))) {
				onDiskIds.push(id);
			} else {
				synthesizeIds.push(id);
			}
		}

		const parts: string[] = [];
		const errors: string[] = [];

		for (const id of synthesizeIds) {
			const result = await this.getNodeTypeDefinition(this.toDefinitionRequest(id), options);
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
		options: CatalogScopeOptions = {},
	): Promise<NodeTypeDefinitionResult> {
		const includeUninstalled = Boolean(options.includeUninstalled);
		const cacheKey = JSON.stringify([includeUninstalled, request]);
		const cached = this.getDefinitionCache.get(cacheKey);
		if (cached) return cached;

		let result = this.resolvesFromDisk(request)
			? await this.getBuiltinNodeTypeDefinition(request)
			: this.getSynthesizedNodeTypeDefinition(request);

		// Only fall through to the registry once the installed catalog has had
		// its say, so an installed node always wins over the published one.
		if (result.error && includeUninstalled) {
			result = await this.getUninstalledNodeTypeDefinition(request, result);
		}

		if (!result.error) {
			this.getDefinitionCache.set(cacheKey, result);
		}
		return result;
	}

	/**
	 * Which of the given node types are verified community nodes this instance
	 * has not installed, with the package that ships each.
	 *
	 * Lets workflow creation warn about a node that will not run, which is
	 * otherwise saved silently. Reports nothing when the second tier is not
	 * built, so a caller that has not opted in never gets a warning it cannot
	 * act on.
	 */
	async findUninstalledNodeTypes(
		nodeTypeNames: string[],
	): Promise<Array<{ nodeType: string; packageName: string }>> {
		if (nodeTypeNames.length === 0) return [];

		await this.getUninstalledParser();
		if (this.uninstalledDescriptionsById.size === 0) return [];

		const found: Array<{ nodeType: string; packageName: string }> = [];
		for (const nodeType of new Set(nodeTypeNames)) {
			// An installed node always wins, in case a reload signal lagged behind
			// an install and left the type in both tiers.
			if (this.descriptionsById.has(nodeType)) continue;
			if (!this.uninstalledDescriptionsById.has(nodeType)) continue;
			found.push({ nodeType, packageName: nodeType.split('.')[0] });
		}
		return found;
	}

	/**
	 * Synthesize a def from the verified registry for a node this instance has
	 * not installed, prefixed with a notice so a caller reading only the type
	 * def still learns the node needs installing. Falls back to the original
	 * installed-catalog error when the registry doesn't know the node either.
	 */
	private async getUninstalledNodeTypeDefinition(
		request: NodeTypeDefinitionRequest,
		installedResult: NodeTypeDefinitionResult,
	): Promise<NodeTypeDefinitionResult> {
		await this.getUninstalledParser();
		const description = this.uninstalledDescriptionsById.get(request.nodeId);
		if (!description) return installedResult;

		try {
			const version = versionLabel(description);
			const packageName = request.nodeId.split('.')[0];
			return {
				content: [
					`// NOT INSTALLED: this node ships in the community package '${packageName}',`,
					'// which is not installed on this instance. Install it before the workflow can run.',
					synthesizeNodeTypeDef(description),
				].join('\n'),
				...(version ? { version } : {}),
			};
		} catch (error) {
			this.logger.debug('Could not synthesize uninstalled node type definition', {
				nodeId: request.nodeId,
				error,
			});
			return installedResult;
		}
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

		// A package installed since the last build moves from the second tier to
		// the first, so drop the tier and let the next opt-in rebuild it.
		this.dropUninstalledTier();

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

	/**
	 * Built-in node IDs resolve through the richer, discriminator-aware on-disk
	 * type defs; everything else (MCP registry, custom and community nodes) has
	 * no on-disk artifact and is synthesized from its in-memory description.
	 * Hidden built-ins (e.g. messageAnAgent, surfaced in search but skipped by
	 * the build-time generator) are synthesized too — the on-disk lookup would
	 * report them as not found.
	 */
	private resolvesFromDisk(request: NodeTypeDefinitionRequest): boolean {
		if (!isBuiltinNodeId(request.nodeId)) return false;
		const candidates = this.descriptionsById.get(request.nodeId);
		// Unknown built-in ids stay on the on-disk path so its lookup reports the error.
		if (!candidates?.length) return true;
		const description = this.selectDescription(candidates, request.version);
		return description?.hidden !== true;
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
