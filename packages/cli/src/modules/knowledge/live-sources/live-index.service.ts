import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { redactText } from '@n8n/utils/redaction/redact-text';
import { sleep } from '@n8n/utils/sleep';

import type {
	KnowledgeLiveSourceProvider,
	LiveEntry,
	LiveRunContext,
	LiveSourceConfig,
} from './live-source-provider';
import type { RankedSearchMatch } from './strategies/live-retrieval-strategy';
import { cutSnippet, searchLines, tokenizeText } from './strategies/text-search';

/** Entries one index holds at most, picked items included. */
export const INDEX_MAX_ENTRIES = 500;
/** How deep the build lists below a picked container: its children and their children. */
export const INDEX_MAX_DEPTH = 2;
/** Characters of each document that the card keeps. */
export const INDEX_HEAD_CHARS = 500;
/** Pause between two reads, so a build stays under the rate limit of a source. */
const READ_PAUSE_MS = 150;
/** A build stops after this many reads in a row failed: the credential or the source is gone. */
const MAX_CONSECUTIVE_READ_FAILURES = 5;
const BM25_K1 = 1.2;
const BM25_B = 0.75;
/** Title tokens count this many times, so a title match outranks a mention in the head. */
const TITLE_WEIGHT = 2;
/**
 * A card is a hit only when it holds this many distinct query terms (or every
 * term of a shorter query). BM25 ranks any card that shares one word, and a
 * list of one-word matches reads as "there is something" to the model, which
 * then digs through them. No hit is the better answer.
 */
const MIN_MATCHED_TERMS = 2;

export interface LiveIndexStatus {
	/** Cards with content. */
	indexed: number;
	/** Entries the build found, picked items included. */
	total: number;
	builtAt?: string;
	buildMs?: number;
	building: boolean;
	error?: string;
}

/** One entry in the index: where it is, how it starts, and its term counts. */
interface IndexCard {
	entry: LiveEntry;
	/** The titles of the containers above the entry, for the model and the ranking. */
	path: string;
	head: string;
	terms: Map<string, number>;
	length: number;
}

interface SourceIndex {
	cards: IndexCard[];
	/** Cards by entry id, for the ancestor walk. */
	byId: Map<string, IndexCard>;
	documentFrequency: Map<string, number>;
	averageLength: number;
	status: LiveIndexStatus;
}

export interface IndexBuildInput {
	/** `agentId:sourceId`. */
	key: string;
	ctx: LiveRunContext;
	source: LiveSourceConfig;
	provider: KnowledgeLiveSourceProvider;
}

interface DiscoveredEntry {
	entry: LiveEntry;
	path: string;
}

interface QueuedContainer {
	container: LiveEntry;
	depth: number;
	path: string;
}

interface ScoredCard {
	card: IndexCard;
	score: number;
}

function countTerms(tokens: readonly string[], into: Map<string, number>, weight = 1): number {
	for (const token of tokens) into.set(token, (into.get(token) ?? 0) + weight);
	return tokens.length * weight;
}

/**
 * The in-memory card index of the `index` strategy: one card per picked item
 * and per entry below a picked container, with the start of its text, ranked
 * with BM25. Lives per `agentId:sourceId`, lost on restart, rebuilt on request.
 */
@Service()
export class LiveIndexService {
	private readonly logger: Logger;

	private readonly indexes = new Map<string, SourceIndex>();

	private readonly builds = new Map<string, Promise<LiveIndexStatus>>();

	constructor(logger: Logger) {
		this.logger = logger.scoped('knowledge');
	}

	status(key: string): LiveIndexStatus | undefined {
		return this.indexes.get(key)?.status;
	}

	/** True when the index can answer a search. A rebuild keeps the old cards until the new ones are ready. */
	isReady(key: string): boolean {
		const index = this.indexes.get(key);
		return index !== undefined && index.cards.length > 0;
	}

	/** Starts a build when none runs, and returns at once. */
	scheduleBuild(input: IndexBuildInput): LiveIndexStatus {
		if (!this.builds.has(input.key)) void this.rebuild(input);
		return this.status(input.key) ?? { indexed: 0, total: 0, building: true };
	}

	/** Builds the index of one source and waits for it. A build in progress is joined. */
	async rebuild(input: IndexBuildInput): Promise<LiveIndexStatus> {
		const running = this.builds.get(input.key);
		if (running) return await running;
		const build = this.build(input).finally(() => this.builds.delete(input.key));
		this.builds.set(input.key, build);
		return await build;
	}

	/** The ids above an entry, nearest first, as far as the index knows them. */
	ancestorIds(key: string, entry: LiveEntry): string[] {
		const index = this.indexes.get(key);
		const ids: string[] = [];
		let parentId = entry.parentId;
		while (parentId !== undefined && !ids.includes(parentId)) {
			ids.push(parentId);
			parentId = index?.byId.get(parentId)?.entry.parentId;
		}
		return ids;
	}

	search(key: string, queryTerms: readonly string[], limit: number): RankedSearchMatch[] {
		const index = this.indexes.get(key);
		if (!index || queryTerms.length === 0) return [];
		const total = index.cards.length;
		const requiredTerms = Math.min(MIN_MATCHED_TERMS, queryTerms.length);
		const scored: ScoredCard[] = [];
		for (const card of index.cards) {
			let score = 0;
			let matchedTerms = 0;
			for (const term of queryTerms) {
				const frequency = card.terms.get(term);
				if (!frequency) continue;
				matchedTerms += 1;
				const matching = index.documentFrequency.get(term) ?? 0;
				const idf = Math.log(1 + (total - matching + 0.5) / (matching + 0.5));
				const normalized =
					(frequency * (BM25_K1 + 1)) /
					(frequency + BM25_K1 * (1 - BM25_B + (BM25_B * card.length) / index.averageLength));
				score += idf * normalized;
			}
			if (matchedTerms >= requiredTerms && score > 0) scored.push({ card, score });
		}
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, limit).map(({ card, score }) => {
			const [line] = searchLines(card.head, queryTerms, 1);
			return {
				entry: card.entry,
				snippet: line?.snippet ?? cutSnippet(card.head.split('\n')[0] ?? card.entry.title),
				lineRange: line ? { start: line.line, end: line.line } : undefined,
				score,
			};
		});
	}

	private async build(input: IndexBuildInput): Promise<LiveIndexStatus> {
		const startedAt = Date.now();
		const previous = this.indexes.get(input.key);
		const status: LiveIndexStatus = {
			indexed: previous?.status.indexed ?? 0,
			total: previous?.status.total ?? 0,
			builtAt: previous?.status.builtAt,
			buildMs: previous?.status.buildMs,
			building: true,
		};
		this.indexes.set(input.key, {
			cards: previous?.cards ?? [],
			byId: previous?.byId ?? new Map(),
			documentFrequency: previous?.documentFrequency ?? new Map(),
			averageLength: previous?.averageLength ?? 1,
			status,
		});
		try {
			const discovered = await this.discover(input);
			const cards = await this.readCards(input, discovered, status);
			if (cards.length === 0 && discovered.length > 0) {
				// A source that is down must not replace a good index with an empty one.
				throw new Error(status.error ?? `none of the ${discovered.length} entries could be read`);
			}
			const documentFrequency = new Map<string, number>();
			let totalLength = 0;
			for (const card of cards) {
				totalLength += card.length;
				for (const term of card.terms.keys()) {
					documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
				}
			}
			const finished: LiveIndexStatus = {
				indexed: cards.length,
				total: discovered.length,
				builtAt: new Date().toISOString(),
				buildMs: Date.now() - startedAt,
				building: false,
				error: status.error,
			};
			this.indexes.set(input.key, {
				cards,
				byId: new Map(cards.map((card) => [card.entry.id, card])),
				documentFrequency,
				averageLength: cards.length > 0 ? totalLength / cards.length : 1,
				status: finished,
			});
			this.logger.info('Live knowledge index built', {
				key: input.key,
				indexed: finished.indexed,
				total: finished.total,
				buildMs: finished.buildMs,
			});
			return finished;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const failed: LiveIndexStatus = {
				...status,
				indexed: previous?.status.indexed ?? 0,
				total: previous?.status.total ?? 0,
				building: false,
				error: message,
			};
			this.indexes.set(input.key, {
				cards: previous?.cards ?? [],
				byId: previous?.byId ?? new Map(),
				documentFrequency: previous?.documentFrequency ?? new Map(),
				averageLength: previous?.averageLength ?? 1,
				status: failed,
			});
			this.logger.warn('Live knowledge index build failed', { key: input.key, error: message });
			return failed;
		}
	}

	/** The picked items plus the entries below the picked containers, breadth first, capped. */
	private async discover(input: IndexBuildInput): Promise<DiscoveredEntry[]> {
		const found = new Map<string, DiscoveredEntry>();
		const queue: QueuedContainer[] = [];
		for (const item of input.source.items) {
			if (item.kind === 'container') {
				queue.push({ container: item, depth: 0, path: item.title });
			} else {
				found.set(item.id, { entry: item, path: '' });
			}
		}
		while (queue.length > 0 && found.size < INDEX_MAX_ENTRIES) {
			const { container, depth, path } = queue.shift()!;
			const listed = await input.provider.list(input.ctx, container, {
				limit: INDEX_MAX_ENTRIES - found.size,
			});
			for (const listedEntry of listed.entries) {
				if (found.size >= INDEX_MAX_ENTRIES) break;
				const entry: LiveEntry = { ...listedEntry, parentId: listedEntry.parentId ?? container.id };
				if (!found.has(entry.id)) found.set(entry.id, { entry, path });
				const nested = entry.kind === 'container' || entry.hasChildren === true;
				if (nested && depth + 1 < INDEX_MAX_DEPTH) {
					queue.push({ container: entry, depth: depth + 1, path: `${path} / ${entry.title}` });
				}
			}
		}
		return [...found.values()];
	}

	/** Reads the start of every discovered item. A container gets a card from its title alone. */
	private async readCards(
		input: IndexBuildInput,
		discovered: readonly DiscoveredEntry[],
		status: LiveIndexStatus,
	): Promise<IndexCard[]> {
		const cards: IndexCard[] = [];
		let consecutiveFailures = 0;
		for (const { entry, path } of discovered) {
			let head = '';
			let updatedAt = entry.updatedAt;
			if (entry.kind !== 'container') {
				try {
					const document = await input.provider.read(input.ctx, entry);
					head = redactText(document.text).text.slice(0, INDEX_HEAD_CHARS);
					updatedAt = document.updatedAt ?? updatedAt;
					consecutiveFailures = 0;
				} catch (error) {
					consecutiveFailures += 1;
					this.logger.debug('Live knowledge index skipped an entry', {
						key: input.key,
						entryId: entry.id,
						error: error instanceof Error ? error.message : String(error),
					});
					if (consecutiveFailures >= MAX_CONSECUTIVE_READ_FAILURES) {
						status.error = `${consecutiveFailures} reads in a row failed; the index holds ${cards.length} of ${discovered.length} entries`;
						break;
					}
					continue;
				}
				await sleep(READ_PAUSE_MS);
			}
			const terms = new Map<string, number>();
			let length = countTerms(tokenizeText(entry.title), terms, TITLE_WEIGHT);
			length += countTerms(tokenizeText(path), terms);
			length += countTerms(tokenizeText(head), terms);
			cards.push({
				entry: { ...entry, updatedAt },
				path,
				head,
				terms,
				length: Math.max(length, 1),
			});
			status.indexed = cards.length;
			status.total = discovered.length;
		}
		return cards;
	}
}
