import type { AgentLiveSourceRetrievalStrategy } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { redactText } from '@n8n/utils/redaction/redact-text';

import {
	MAX_OPERATION_OUTPUT_CHARS,
	MAX_READ_LINE_CHARS,
	MAX_SEARCH_LINE_CHARS,
	truncateKnowledgeText,
} from '../retrieval/retrieval-schemas';
import { LiveCredentialResolver } from './live-credential-resolver';
import { LiveIndexService, type LiveIndexStatus } from './live-index.service';
import {
	DEFAULT_LIST_LIMIT,
	DEFAULT_SEARCH_LIMIT,
	formatLiveRef,
	parseLiveRef,
	parseLiveScopeRef,
	type KnowledgeMapResult,
	type ListKnowledgeInput,
	type ListKnowledgeResult,
	type LiveEntryOutput,
	type LiveSourceOutput,
	type ReadKnowledgeInput,
	type ReadKnowledgeRangeOutput,
	type ReadKnowledgeResult,
	type SearchedSourceOutput,
	type SearchKnowledgeInput,
	type SearchKnowledgeResult,
} from './live-retrieval-schemas';
import {
	isLiveSourceError,
	LiveSourceInputError,
	LiveSourceRefError,
	LiveSourceScopeError,
	sanitizeLiveSourceErrorMessage,
} from './live-source.errors';
import type {
	KnowledgeLiveSourceProvider,
	LiveCredentialRef,
	LiveDocument,
	LiveEntry,
	LiveHit,
	LivePrincipal,
	LiveRunContext,
	LiveSourceConfig,
} from './live-source-provider';
import { LiveSourceProviderRegistry } from './live-source-provider-registry';
import { IndexRetrievalStrategy, liveIndexKey } from './strategies/index.strategy';
import type {
	LiveRetrievalStrategy,
	RankedSearchMatch,
} from './strategies/live-retrieval-strategy';
import { NativeRetrievalStrategy } from './strategies/native.strategy';

/** Who the tools run for. The agents module builds it when it attaches the tools. */
export interface LiveKnowledgeScope {
	projectId: string;
	agentId: string;
	principal: LivePrincipal;
}

/** What one tool call carries from the runtime. */
export interface LiveCallContext {
	runId?: string;
	signal?: AbortSignal;
}

type CanonicalId = (id: string) => string;

interface SourceRunState {
	/** The one form of an item id of this source's provider. */
	canon: CanonicalId;
	/** Every entry the run may read, by canonical item id: the picked items plus what list, search and read returned. */
	allow: Map<string, LiveEntry>;
	/** Documents read in this run, by canonical item id. */
	docs: Map<string, LiveDocument>;
	credential?: LiveCredentialRef;
}

interface RunState {
	touchedAt: number;
	sources: Map<string, SourceRunState>;
}

type SourceMatch = RankedSearchMatch & { source: LiveSourceConfig };

/** One source in a search, with the entries the requested scope selected. */
interface SearchTarget {
	source: LiveSourceConfig;
	state: SourceRunState;
	entries: LiveEntry[];
	pickedItems: LiveEntry[];
}

/** A run that stays silent for this long is forgotten. `endRun` is the normal path. */
const RUN_STATE_TTL_MS = 30 * 60 * 1000;
const RUN_ID_WITHOUT_RUN = 'no-run';

/**
 * The entry point of live knowledge retrieval. It keeps the allow-set and the
 * per-run cache, resolves credentials to `{ id, type }`, dispatches to the
 * retrieval strategy of each source, and adds the provenance to every result.
 * Runtimes are cached, so every piece of run state keys on the run id.
 */
@Service()
export class LiveRetrievalService {
	private readonly logger: Logger;

	private readonly runs = new Map<string, RunState>();

	private readonly strategies: Map<AgentLiveSourceRetrievalStrategy, LiveRetrievalStrategy>;

	constructor(
		logger: Logger,
		private readonly registry: LiveSourceProviderRegistry,
		private readonly credentialResolver: LiveCredentialResolver,
		private readonly indexService: LiveIndexService,
		nativeStrategy: NativeRetrievalStrategy,
		indexStrategy: IndexRetrievalStrategy,
	) {
		this.logger = logger.scoped('knowledge');
		this.strategies = new Map<AgentLiveSourceRetrievalStrategy, LiveRetrievalStrategy>([
			[nativeStrategy.id, nativeStrategy],
			[indexStrategy.id, indexStrategy],
		]);
	}

	/** Adds a retrieval strategy. The native strategy is always there. */
	registerStrategy(strategy: LiveRetrievalStrategy): void {
		this.strategies.set(strategy.id, strategy);
	}

	/** The knowledge map: every source and its picked items. No API call. */
	describe(
		scope: LiveKnowledgeScope,
		sources: readonly LiveSourceConfig[],
		filter?: string,
	): KnowledgeMapResult {
		const matchesFilter = titleFilter(filter);
		return {
			kind: 'map',
			sources: sources.map((source): LiveSourceOutput => {
				const strategy = this.resolveStrategy(source);
				const canon = this.canonOf(source);
				return {
					ref: formatLiveRef(source.id),
					sourceId: source.id,
					name: source.name,
					provider: source.provider,
					description: source.description,
					retrieval: strategy.id,
					items: source.items
						.filter((item) => matchesFilter(item.title))
						.map((item) => toEntryOutput(source.id, item, canon)),
					index:
						strategy.id === 'index'
							? this.indexService.status(liveIndexKey(scope.agentId, source.id))
							: undefined,
				};
			}),
		};
	}

	/** The index status of one source, for the rebuild route. */
	indexStatus(scope: LiveKnowledgeScope, source: LiveSourceConfig): LiveIndexStatus | undefined {
		return this.indexService.status(liveIndexKey(scope.agentId, source.id));
	}

	/**
	 * Rebuilds the index of one source and waits for it. The build reads with
	 * the credential of the source, as a tool call does.
	 */
	async rebuildIndex(
		scope: LiveKnowledgeScope,
		source: LiveSourceConfig,
	): Promise<LiveIndexStatus> {
		const provider = this.registry.get(source.provider);
		const state: SourceRunState = {
			canon: this.canonOf(source),
			allow: new Map(),
			docs: new Map(),
		};
		const ctx = await this.runContext(scope, { runId: 'index-build' }, state, source, provider);
		return await this.indexService.rebuild({
			key: liveIndexKey(scope.agentId, source.id),
			ctx,
			source,
			provider,
		});
	}

	async list(
		scope: LiveKnowledgeScope,
		sources: readonly LiveSourceConfig[],
		call: LiveCallContext,
		input: ListKnowledgeInput,
	): Promise<ListKnowledgeResult> {
		if (!input.scope) return this.describe(scope, sources, input.filter);

		const ref = parseLiveScopeRef(input.scope);
		const source = findSource(sources, ref.sourceId);
		if (ref.itemId === undefined) return this.describe(scope, [source], input.filter);

		const run = this.runState(call.runId);
		const state = this.sourceState(run, source);
		const container = state.allow.get(state.canon(ref.itemId));
		if (!container) throw new LiveSourceScopeError();
		if (container.kind !== 'container' && !container.hasChildren) {
			throw new LiveSourceInputError(
				'This ref is a single item, not a container. Use read_knowledge to read it.',
			);
		}

		const provider = this.registry.get(source.provider);
		const ctx = await this.runContext(scope, call, state, source, provider);
		const result = await provider.list(ctx, container, {
			cursor: input.cursor,
			limit: input.limit ?? DEFAULT_LIST_LIMIT,
		});
		const matchesFilter = titleFilter(input.filter);
		const entries: LiveEntryOutput[] = [];
		for (const entry of result.entries) {
			const allowed = this.allow(state, { ...entry, parentId: entry.parentId ?? container.id });
			if (matchesFilter(allowed.title)) {
				entries.push(toEntryOutput(source.id, allowed, state.canon));
			}
		}
		return {
			kind: 'list',
			container: { ...toEntryOutput(source.id, container, state.canon), sourceId: source.id },
			entries,
			cursor: result.cursor,
		};
	}

	async search(
		scope: LiveKnowledgeScope,
		sources: readonly LiveSourceConfig[],
		call: LiveCallContext,
		input: SearchKnowledgeInput,
	): Promise<SearchKnowledgeResult> {
		const limit = input.limit ?? DEFAULT_SEARCH_LIMIT;
		const run = this.runState(call.runId);
		const targets = this.searchTargets(run, sources, input.scope);

		const ranked: SourceMatch[] = [];
		const searched: SearchedSourceOutput[] = [];
		for (const target of targets) {
			const { source, state } = target;
			const strategy = this.resolveStrategy(source);
			try {
				const provider = this.registry.get(source.provider);
				const ctx = await this.runContext(scope, call, state, source, provider);
				const matches = await strategy.search(
					{
						ctx,
						agentId: scope.agentId,
						source,
						provider,
						scope: target.entries,
						pickedItems: target.pickedItems,
						readDocument: async (entry) => await this.readDocument(ctx, state, provider, entry),
					},
					input.query,
					limit,
				);
				for (const match of matches) {
					const entry = this.allow(state, match.entry);
					ranked.push({ ...match, entry, source });
				}
				searched.push({
					sourceId: source.id,
					retrieval: strategy.id,
					status: 'ok',
					index:
						strategy.id === 'index'
							? this.indexService.status(liveIndexKey(scope.agentId, source.id))
							: undefined,
				});
			} catch (error) {
				// A failing source must show as unavailable, never as "nothing found".
				searched.push({
					sourceId: source.id,
					retrieval: strategy.id,
					status: 'unavailable',
					error: this.unavailableMessage(source, error),
				});
			}
		}

		const hits: LiveHit[] = [];
		const seen = new Map<string, number>();
		for (const match of interleaveTies(ranked)) {
			const ref = formatLiveRef(match.source.id, this.canonOf(match.source)(match.entry.id));
			const hit: LiveHit = {
				ref,
				sourceId: match.source.id,
				title: match.entry.title,
				snippet: truncateKnowledgeText(redactText(match.snippet).text, MAX_SEARCH_LINE_CHARS).text,
				url: match.entry.url,
				lineRange: match.lineRange,
				updatedAt: match.entry.updatedAt,
				retrieval: this.resolveStrategy(match.source).id,
			};
			// One title-only hit per item; a hit with a line range is the better one.
			const existing = seen.get(ref);
			if (existing !== undefined) {
				if (hit.lineRange && !hits[existing].lineRange) hits[existing] = hit;
				else if (hit.lineRange) hits.push(hit);
				continue;
			}
			seen.set(ref, hits.length);
			hits.push(hit);
		}
		return { query: input.query, hits: hits.slice(0, limit), searched };
	}

	async read(
		scope: LiveKnowledgeScope,
		sources: readonly LiveSourceConfig[],
		call: LiveCallContext,
		input: ReadKnowledgeInput,
	): Promise<ReadKnowledgeResult> {
		const ref = parseLiveRef(input.ref);
		const source = findSource(sources, ref.sourceId);
		const run = this.runState(call.runId);
		const state = this.sourceState(run, source);
		const entry = state.allow.get(state.canon(ref.itemId));
		if (!entry) throw new LiveSourceScopeError();

		const provider = this.registry.get(source.provider);
		const ctx = await this.runContext(scope, call, state, source, provider);
		const document = await this.readDocument(ctx, state, provider, entry);
		const capped = truncateKnowledgeText(document.text, MAX_OPERATION_OUTPUT_CHARS);
		const lines = capped.text.split('\n');
		const title = document.title || entry.title;
		const url = document.url ?? entry.url;
		const result: ReadKnowledgeResult = {
			ref: formatLiveRef(source.id, state.canon(entry.id)),
			sourceId: source.id,
			title,
			url,
			updatedAt: document.updatedAt ?? entry.updatedAt,
			totalLines: lines.length,
			truncated: capped.truncated || document.truncated === true,
			citation: url ? `${title} (${url})` : title,
		};
		if (!input.ranges) {
			return { ...result, text: lines.map(cutLine).join('\n') };
		}
		return { ...result, ranges: input.ranges.map((range) => readRange(lines, range)) };
	}

	/** Drops the state of a run. The turn execution calls it when the run ends. */
	endRun(runId: string | undefined): void {
		if (runId) this.runs.delete(runId);
	}

	private resolveStrategy(source: LiveSourceConfig): LiveRetrievalStrategy {
		const requested = source.retrieval ?? this.defaultStrategyOf(source);
		const strategy = this.strategies.get(requested);
		if (strategy) return strategy;
		const native = this.strategies.get('native');
		if (!native) throw new LiveSourceInputError('No retrieval strategy is registered');
		return native;
	}

	private defaultStrategyOf(source: LiveSourceConfig): AgentLiveSourceRetrievalStrategy {
		try {
			return this.registry.get(source.provider).defaultRetrieval;
		} catch {
			return 'native';
		}
	}

	private runState(runId: string | undefined): RunState {
		const now = Date.now();
		for (const [id, state] of this.runs) {
			if (now - state.touchedAt > RUN_STATE_TTL_MS) this.runs.delete(id);
		}
		if (!runId) return { touchedAt: now, sources: new Map() };
		let state = this.runs.get(runId);
		if (!state) {
			state = { touchedAt: now, sources: new Map() };
			this.runs.set(runId, state);
		}
		state.touchedAt = now;
		return state;
	}

	private canonOf(source: LiveSourceConfig): CanonicalId {
		try {
			const provider = this.registry.get(source.provider);
			return (id) => provider.normalizeItemId?.(id) ?? id;
		} catch {
			return (id) => id;
		}
	}

	/** The state of one source in a run. The allow-set starts from the picked items. */
	private sourceState(run: RunState, source: LiveSourceConfig): SourceRunState {
		let state = run.sources.get(source.id);
		if (!state) {
			const canon = this.canonOf(source);
			state = { canon, allow: new Map(), docs: new Map() };
			for (const item of source.items) state.allow.set(canon(item.id), item);
			run.sources.set(source.id, state);
		}
		return state;
	}

	/** Adds an entry that a picked container returned to the allow-set. Known entries keep their data. */
	private allow(state: SourceRunState, entry: LiveEntry): LiveEntry {
		const key = state.canon(entry.id);
		const known = state.allow.get(key);
		const merged: LiveEntry = known ? { ...known, ...entry, title: known.title } : entry;
		state.allow.set(key, merged);
		return merged;
	}

	private async runContext(
		scope: LiveKnowledgeScope,
		call: LiveCallContext,
		state: SourceRunState,
		source: LiveSourceConfig,
		provider: KnowledgeLiveSourceProvider,
	): Promise<LiveRunContext> {
		state.credential ??= await this.credentialResolver.resolve(
			scope.projectId,
			scope.principal,
			source.id,
			source.credential,
			provider.credentialTypes,
		);
		return {
			projectId: scope.projectId,
			principal: scope.principal,
			sourceId: source.id,
			credential: state.credential,
			runId: call.runId ?? RUN_ID_WITHOUT_RUN,
			signal: call.signal,
		};
	}

	private async readDocument(
		ctx: LiveRunContext,
		state: SourceRunState,
		provider: KnowledgeLiveSourceProvider,
		entry: LiveEntry,
	): Promise<LiveDocument> {
		const key = state.canon(entry.id);
		const cached = state.docs.get(key);
		if (cached) return cached;
		const document = await provider.read(ctx, entry);
		// The direct children of a container are in scope, as a list of it would show.
		for (const child of document.children ?? []) {
			this.allow(state, { ...child, parentId: child.parentId ?? entry.id });
		}
		const redacted: LiveDocument = { ...document, text: redactText(document.text).text };
		state.docs.set(key, redacted);
		return redacted;
	}

	/**
	 * The sources and entries one search covers. Without scope refs: every
	 * source with its whole allow-set. A source ref selects a source, a
	 * container ref its subtree, an item ref that item.
	 */
	private searchTargets(
		run: RunState,
		sources: readonly LiveSourceConfig[],
		scopeRefs: readonly string[] | undefined,
	): SearchTarget[] {
		const targets = new Map<
			string,
			{ source: LiveSourceConfig; state: SourceRunState; selected: Set<string> | null }
		>();
		const selectAll = (source: LiveSourceConfig) => {
			targets.set(source.id, { source, state: this.sourceState(run, source), selected: null });
		};
		if (!scopeRefs) {
			for (const source of sources) selectAll(source);
		} else {
			for (const raw of scopeRefs) {
				const ref = parseLiveScopeRef(raw);
				const source = findSource(sources, ref.sourceId);
				if (ref.itemId === undefined) {
					selectAll(source);
					continue;
				}
				const state = this.sourceState(run, source);
				const root = state.allow.get(state.canon(ref.itemId));
				if (!root) throw new LiveSourceScopeError();
				const target = targets.get(source.id) ?? { source, state, selected: new Set<string>() };
				if (target.selected) {
					for (const id of subtreeIds(state.allow, state.canon(root.id), state.canon)) {
						target.selected.add(id);
					}
				}
				targets.set(source.id, target);
			}
		}

		return [...targets.values()].map(({ source, state, selected }) => {
			const entries = [...state.allow.values()].filter(
				(entry) => selected === null || selected.has(state.canon(entry.id)),
			);
			const picked = new Set(
				source.items.filter((item) => item.kind === 'item').map((item) => state.canon(item.id)),
			);
			return {
				source,
				state,
				entries,
				pickedItems: entries.filter((entry) => picked.has(state.canon(entry.id))),
			};
		});
	}

	private unavailableMessage(source: LiveSourceConfig, error: unknown): string {
		if (isLiveSourceError(error)) return error.message;
		const message = error instanceof Error ? error.message : String(error);
		this.logger.warn('Live knowledge search failed', {
			sourceId: source.id,
			provider: source.provider,
			error: sanitizeLiveSourceErrorMessage(message),
		});
		return `Knowledge source "${source.id}" is unavailable: ${sanitizeLiveSourceErrorMessage(message)}`;
	}
}

/**
 * Best matches first. Matches of equal rank alternate between the sources, so
 * one source with many weak title matches cannot push another source out of
 * the capped result.
 */
function interleaveTies(matches: readonly SourceMatch[]): SourceMatch[] {
	const byScore = new Map<number, Map<string, SourceMatch[]>>();
	for (const match of matches) {
		const bySource = byScore.get(match.score) ?? new Map<string, SourceMatch[]>();
		const queue = bySource.get(match.source.id) ?? [];
		queue.push(match);
		bySource.set(match.source.id, queue);
		byScore.set(match.score, bySource);
	}
	const result: SourceMatch[] = [];
	for (const score of [...byScore.keys()].sort((a, b) => b - a)) {
		const queues = [...(byScore.get(score)?.values() ?? [])];
		for (let index = 0; queues.some((queue) => index < queue.length); index++) {
			for (const queue of queues) {
				if (index < queue.length) result.push(queue[index]);
			}
		}
	}
	return result;
}

function findSource(sources: readonly LiveSourceConfig[], sourceId: string): LiveSourceConfig {
	const source = sources.find((candidate) => candidate.id === sourceId);
	if (!source) throw new LiveSourceRefError(`this agent has no knowledge source "${sourceId}"`);
	return source;
}

function toEntryOutput(sourceId: string, entry: LiveEntry, canon: CanonicalId): LiveEntryOutput {
	return {
		ref: formatLiveRef(sourceId, canon(entry.id)),
		title: entry.title,
		kind: entry.kind,
		containerType: entry.containerType,
		url: entry.url,
		updatedAt: entry.updatedAt,
		hasChildren: entry.hasChildren,
	};
}

function titleFilter(filter: string | undefined): (title: string) => boolean {
	const needle = filter?.trim().toLowerCase();
	if (!needle) return () => true;
	return (title) => title.toLowerCase().includes(needle);
}

/** The canonical ids of an entry and every entry below it in the allow-set. */
function subtreeIds(allow: Map<string, LiveEntry>, rootId: string, canon: CanonicalId): string[] {
	const ids = [rootId];
	const children = new Map<string, string[]>();
	for (const entry of allow.values()) {
		if (entry.parentId === undefined) continue;
		const parentKey = canon(entry.parentId);
		const list = children.get(parentKey) ?? [];
		list.push(canon(entry.id));
		children.set(parentKey, list);
	}
	const seen = new Set(ids);
	for (let index = 0; index < ids.length; index++) {
		for (const child of children.get(ids[index]) ?? []) {
			if (seen.has(child)) continue;
			seen.add(child);
			ids.push(child);
		}
	}
	return ids;
}

function cutLine(line: string): string {
	return line.length > MAX_READ_LINE_CHARS ? `${line.slice(0, MAX_READ_LINE_CHARS)}…` : line;
}

function readRange(
	lines: readonly string[],
	range: { startLine: number; endLine: number },
): ReadKnowledgeRangeOutput {
	const startLine = Math.min(Math.max(range.startLine, 1), Math.max(lines.length, 1));
	const endLine = Math.min(Math.max(range.endLine, startLine), lines.length);
	return {
		startLine,
		endLine,
		text: lines
			.slice(startLine - 1, endLine)
			.map(cutLine)
			.join('\n'),
	};
}
