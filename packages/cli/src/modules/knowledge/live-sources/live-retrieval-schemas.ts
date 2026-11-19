import { LIVE_SOURCE_ID_REGEX, type AgentLiveSourceRetrievalStrategy } from '@n8n/api-types';
import { z } from 'zod';

import { MAX_READ_RANGES } from '../retrieval/retrieval-schemas';
import { LiveSourceRefError } from './live-source.errors';
import type { LiveEntryRef, LiveHit } from './live-source-provider';

export const LIVE_REF_PREFIX = 'knowledge://live/';
export const DEFAULT_SEARCH_LIMIT = 10;
export const MAX_SEARCH_LIMIT = 20;
export const MAX_QUERY_CHARS = 500;
export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 100;
const MAX_SCOPE_REFS = 20;
const MAX_REF_CHARS = 512;

/** A ref of a whole source (`knowledge://live/<sourceId>`) or of one item in it. */
export type LiveScopeRef = { sourceId: string; itemId?: string };

export function formatLiveRef(sourceId: string, itemId?: string): string {
	return itemId === undefined
		? `${LIVE_REF_PREFIX}${sourceId}`
		: `${LIVE_REF_PREFIX}${sourceId}/${encodeURIComponent(itemId)}`;
}

/** Parses a source ref or an item ref. Throws `LiveSourceRefError` on a bad ref. */
export function parseLiveScopeRef(ref: string): LiveScopeRef {
	const trimmed = ref.trim();
	if (!trimmed.startsWith(LIVE_REF_PREFIX)) {
		throw new LiveSourceRefError(`expected a ref that starts with ${LIVE_REF_PREFIX}`);
	}
	const rest = trimmed.slice(LIVE_REF_PREFIX.length);
	const slash = rest.indexOf('/');
	const sourceId = slash === -1 ? rest : rest.slice(0, slash);
	if (!LIVE_SOURCE_ID_REGEX.test(sourceId)) {
		throw new LiveSourceRefError('the source id is not valid');
	}
	if (slash === -1) return { sourceId };
	let itemId: string;
	try {
		itemId = decodeURIComponent(rest.slice(slash + 1));
	} catch {
		throw new LiveSourceRefError('the item id is not valid');
	}
	if (itemId.length === 0) {
		throw new LiveSourceRefError('the ref has no item id');
	}
	return { sourceId, itemId };
}

/** Parses a `knowledge://live/<sourceId>/<itemId>` ref. Throws `LiveSourceRefError` on a bad ref. */
export function parseLiveRef(ref: string): LiveEntryRef {
	const parsed = parseLiveScopeRef(ref);
	if (parsed.itemId === undefined) {
		throw new LiveSourceRefError('the ref names a source, not an item');
	}
	return { sourceId: parsed.sourceId, itemId: parsed.itemId };
}

const refSchema = z.string().trim().min(1).max(MAX_REF_CHARS);

export const listKnowledgeInputSchema = z
	.object({
		scope: refSchema
			.optional()
			.describe(
				'Optional ref of a container (a page with child pages, a database, a channel) copied from an earlier knowledge tool result. Lists the items inside it. Omit to get the knowledge map: every source and every picked item.',
			),
		filter: z
			.string()
			.trim()
			.max(MAX_QUERY_CHARS)
			.optional()
			.describe(
				'Optional case-insensitive text. Only entries whose title contains it are returned.',
			),
		limit: z
			.number()
			.int()
			.min(1)
			.max(MAX_LIST_LIMIT)
			.optional()
			.describe(`Optional maximum number of entries. Default ${DEFAULT_LIST_LIMIT}.`),
		cursor: z
			.string()
			.trim()
			.max(MAX_REF_CHARS)
			.optional()
			.describe('Optional cursor copied from an earlier list result to get the next entries.'),
	})
	.strict();

export const searchKnowledgeInputSchema = z
	.object({
		query: z
			.string()
			.trim()
			.min(1)
			.max(MAX_QUERY_CHARS)
			.describe(
				'Words or a short phrase to look for in the selected knowledge. Keyword search, not semantic search: use the words that the document most likely contains.',
			),
		scope: z
			.array(refSchema)
			.min(1)
			.max(MAX_SCOPE_REFS)
			.optional()
			.describe(
				'Optional refs of sources or containers to search in, copied from an earlier knowledge tool result. Omit to search every selected source.',
			),
		limit: z
			.number()
			.int()
			.min(1)
			.max(MAX_SEARCH_LIMIT)
			.optional()
			.describe(`Optional maximum number of hits. Default ${DEFAULT_SEARCH_LIMIT}.`),
	})
	.strict();

const lineRangeSchema = z
	.object({
		startLine: z.number().int().min(1).describe('First line to read, 1-based, inclusive'),
		endLine: z.number().int().min(1).describe('Last line to read, 1-based, inclusive'),
	})
	.strict();

export const readKnowledgeInputSchema = z
	.object({
		ref: refSchema.describe(
			'Exact ref of one item, copied from an earlier knowledge tool result, such as knowledge://live/<source>/<item>.',
		),
		ranges: z
			.array(lineRangeSchema)
			.min(1)
			.max(MAX_READ_RANGES)
			.optional()
			.describe(
				`Optional line ranges to read instead of the whole item, at most ${MAX_READ_RANGES}. Use the lineRange of a search hit with some lines of context.`,
			),
	})
	.strict();

export type ListKnowledgeInput = z.infer<typeof listKnowledgeInputSchema>;
export type SearchKnowledgeInput = z.infer<typeof searchKnowledgeInputSchema>;
export type ReadKnowledgeInput = z.infer<typeof readKnowledgeInputSchema>;

/** One entry as the tools return it. */
export interface LiveEntryOutput {
	ref: string;
	title: string;
	kind: 'item' | 'container';
	containerType?: string;
	url?: string;
	updatedAt?: string;
	hasChildren?: boolean;
}

export interface LiveIndexStatusOutput {
	indexed: number;
	total: number;
	builtAt?: string;
	buildMs?: number;
}

/** One source in the knowledge map. */
export interface LiveSourceOutput {
	ref: string;
	sourceId: string;
	name: string;
	provider: string;
	description?: string;
	retrieval: AgentLiveSourceRetrievalStrategy;
	items: LiveEntryOutput[];
	index?: LiveIndexStatusOutput;
}

export interface KnowledgeMapResult {
	kind: 'map';
	sources: LiveSourceOutput[];
}

export interface ListContainerResult {
	kind: 'list';
	container: LiveEntryOutput & { sourceId: string };
	entries: LiveEntryOutput[];
	cursor?: string;
}

export type ListKnowledgeResult = KnowledgeMapResult | ListContainerResult;

export interface SearchedSourceOutput {
	sourceId: string;
	retrieval: AgentLiveSourceRetrievalStrategy;
	status: 'ok' | 'unavailable';
	error?: string;
}

export interface SearchKnowledgeResult {
	query: string;
	hits: LiveHit[];
	searched: SearchedSourceOutput[];
}

export interface ReadKnowledgeRangeOutput {
	startLine: number;
	endLine: number;
	text: string;
}

export interface ReadKnowledgeResult {
	ref: string;
	sourceId: string;
	title: string;
	url?: string;
	updatedAt?: string;
	totalLines: number;
	/** The whole text, when no ranges were requested. */
	text?: string;
	/** The requested ranges. */
	ranges?: ReadKnowledgeRangeOutput[];
	/** True when the text was cut, by the source or by the output cap. */
	truncated: boolean;
	/** The line to cite, for the model. */
	citation: string;
}
