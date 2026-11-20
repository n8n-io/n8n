import { Tool } from '@n8n/agents/tool';
import type { AgentJsonLiveSourceConfig } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import {
	listKnowledgeInputSchema,
	readKnowledgeInputSchema,
	searchKnowledgeInputSchema,
	type ListKnowledgeResult,
	type ReadKnowledgeResult,
	type SearchKnowledgeResult,
} from '@/modules/knowledge/live-sources/live-retrieval-schemas';
import type {
	LiveCallContext,
	LiveKnowledgeScope,
	LiveRetrievalService,
} from '@/modules/knowledge/live-sources/live-retrieval.service';
import {
	isLiveSourceError,
	sanitizeLiveSourceErrorMessage,
} from '@/modules/knowledge/live-sources/live-source.errors';

export const LIVE_KNOWLEDGE_TOOL_NAMES = {
	list: 'list_knowledge',
	search: 'search_knowledge',
	read: 'read_knowledge',
} as const;

const MODEL_OUTPUT_MAP_ITEMS_PER_SOURCE = 100;
const MODEL_OUTPUT_LIST_ENTRIES = 50;
const MODEL_OUTPUT_SEARCH_HITS = 20;
const MODEL_OUTPUT_SNIPPET_CHARS = 240;
const MODEL_OUTPUT_READ_TEXT_BUDGET = 6_000;
const MODEL_OUTPUT_READ_RANGE_MIN_CHARS = 800;

const SELECTED_KNOWLEDGE_RULES = [
	'The agent has selected knowledge: items of external services that the user picked, read live.',
	'Call list_knowledge without arguments to see the sources and the picked items, search_knowledge to find items, and read_knowledge before you quote or cite an item.',
	'A picked container (a page with child pages, a database, a channel) holds items: list it with list_knowledge or read it, and read the items it returns. The text of those items is only found by reading them, not by searching their titles.',
	'Cite the url of every item you use. Never present text that you did not read with read_knowledge.',
	'When nothing in the selected knowledge answers the question, say that it is not in the selected knowledge. Do not guess and do not use other sources for it.',
	'list_knowledge without arguments shows everything that is selected. When the item the user names is not in that list, stop searching and say that it is not in the selected knowledge.',
	'When two items conflict, prefer the one with the latest updatedAt and name both.',
	'When search_knowledge reports a source as unavailable, say that the source is unavailable for a question about it. Do not answer such a question from another source.',
].join(' ');

interface LiveKnowledgeToolErrorOutput {
	error: string;
	errorType: string;
}

function formatLiveKnowledgeToolError(error: unknown): LiveKnowledgeToolErrorOutput {
	if (isLiveSourceError(error)) {
		return { error: error.message, errorType: error.errorType };
	}
	const message = error instanceof Error ? error.message : String(error);
	return {
		error: `Knowledge tool failed: ${sanitizeLiveSourceErrorMessage(message)}`,
		errorType: 'unexpected',
	};
}

async function runLiveKnowledgeTool<T>(
	operation: () => Promise<T>,
): Promise<T | LiveKnowledgeToolErrorOutput> {
	try {
		return await operation();
	} catch (error) {
		return formatLiveKnowledgeToolError(error);
	}
}

function isErrorOutput(output: unknown): output is LiveKnowledgeToolErrorOutput {
	return (
		isRecord(output) && typeof output.error === 'string' && typeof output.errorType === 'string'
	);
}

function isListKnowledgeResult(output: unknown): output is ListKnowledgeResult {
	return isRecord(output) && (output.kind === 'map' || output.kind === 'list');
}

function isSearchKnowledgeResult(output: unknown): output is SearchKnowledgeResult {
	return isRecord(output) && Array.isArray(output.hits) && Array.isArray(output.searched);
}

function isReadKnowledgeResult(output: unknown): output is ReadKnowledgeResult {
	return (
		isRecord(output) && typeof output.ref === 'string' && typeof output.totalLines === 'number'
	);
}

function cutForModel(text: string, maxChars: number): { text: string; truncated: boolean } {
	if (text.length <= maxChars) return { text, truncated: false };
	return { text: text.slice(0, maxChars), truncated: true };
}

function toListKnowledgeModelOutput(output: unknown): unknown {
	if (isErrorOutput(output) || !isListKnowledgeResult(output)) return output;

	if (output.kind === 'map') {
		return {
			sources: output.sources.map((source) => ({
				ref: source.ref,
				name: source.name,
				provider: source.provider,
				description: source.description,
				retrieval: source.retrieval,
				index: source.index,
				items: source.items.slice(0, MODEL_OUTPUT_MAP_ITEMS_PER_SOURCE),
				totalItems: source.items.length,
			})),
		};
	}

	return {
		container: output.container,
		entries: output.entries.slice(0, MODEL_OUTPUT_LIST_ENTRIES),
		returnedEntries: output.entries.length,
		cursor: output.cursor,
	};
}

function toSearchKnowledgeModelOutput(output: unknown): unknown {
	if (isErrorOutput(output) || !isSearchKnowledgeResult(output)) return output;

	const hits = output.hits.slice(0, MODEL_OUTPUT_SEARCH_HITS).map((hit) => {
		const snippet = cutForModel(hit.snippet, MODEL_OUTPUT_SNIPPET_CHARS);
		return {
			ref: hit.ref,
			title: hit.title,
			snippet: snippet.text,
			snippetTruncated: snippet.truncated || undefined,
			url: hit.url,
			lineRange: hit.lineRange,
			updatedAt: hit.updatedAt,
		};
	});

	return {
		hits,
		returnedHits: output.hits.length,
		searched: output.searched,
	};
}

function toReadKnowledgeModelOutput(output: unknown): unknown {
	if (isErrorOutput(output) || !isReadKnowledgeResult(output)) return output;

	const base = {
		ref: output.ref,
		title: output.title,
		url: output.url,
		updatedAt: output.updatedAt,
		totalLines: output.totalLines,
		citation: output.citation,
	};

	if (output.text !== undefined) {
		const text = cutForModel(output.text, MODEL_OUTPUT_READ_TEXT_BUDGET);
		return { ...base, text: text.text, truncated: output.truncated || text.truncated };
	}

	const sourceRanges = output.ranges ?? [];
	const perRangeBudget = Math.max(
		MODEL_OUTPUT_READ_RANGE_MIN_CHARS,
		Math.floor(MODEL_OUTPUT_READ_TEXT_BUDGET / Math.max(sourceRanges.length, 1)),
	);
	let remainingBudget = MODEL_OUTPUT_READ_TEXT_BUDGET;
	let localTruncation = false;
	const ranges = [];
	for (const range of sourceRanges) {
		if (remainingBudget <= 0) {
			localTruncation = true;
			break;
		}
		const cut = cutForModel(range.text, Math.min(perRangeBudget, remainingBudget));
		if (cut.truncated) localTruncation = true;
		remainingBudget -= cut.text.length;
		ranges.push({ startLine: range.startLine, endLine: range.endLine, text: cut.text });
	}
	return { ...base, ranges, truncated: output.truncated || localTruncation };
}

function callContext(ctx: { runId?: string; abortSignal?: AbortSignal }): LiveCallContext {
	return { runId: ctx.runId, signal: ctx.abortSignal };
}

/**
 * The three tools over the live knowledge sources of an agent. They attach when
 * the agent config has `knowledge.liveSources`. The knowledge module owns the
 * allow-set, the per-run cache and the providers.
 */
export function createLiveKnowledgeTools({
	scope,
	sources,
	service,
}: {
	scope: LiveKnowledgeScope;
	sources: AgentJsonLiveSourceConfig[];
	service: LiveRetrievalService;
}) {
	const sourceNames = sources.map((source) => source.name).join(', ');

	const listTool = new Tool(LIVE_KNOWLEDGE_TOOL_NAMES.list)
		.description(
			`List the selected knowledge (${sourceNames}). Without arguments: every source and every picked item, with refs and urls. With the ref of a container (a page with child pages, a database, a channel): the items inside it. Use it to see what the agent can read before you search.`,
		)
		.systemInstruction(SELECTED_KNOWLEDGE_RULES)
		.input(listKnowledgeInputSchema)
		.untrustedOutput()
		.handler(
			async (input, ctx) =>
				await runLiveKnowledgeTool(
					async () => await service.list(scope, sources, callContext(ctx), input),
				),
		)
		.toModelOutput(toListKnowledgeModelOutput);

	const searchTool = new Tool(LIVE_KNOWLEDGE_TOOL_NAMES.search)
		.description(
			`Search the selected knowledge (${sourceNames}) with keywords. Returns hits with a ref, a title, a snippet, a url and, for items read in process, the matching line. Read a hit with read_knowledge before you use it. A source that cannot be reached is reported as unavailable, which is not the same as no match.`,
		)
		.input(searchKnowledgeInputSchema)
		.untrustedOutput()
		.handler(
			async (input, ctx) =>
				await runLiveKnowledgeTool(
					async () => await service.search(scope, sources, callContext(ctx), input),
				),
		)
		.toModelOutput(toSearchKnowledgeModelOutput);

	const readTool = new Tool(LIVE_KNOWLEDGE_TOOL_NAMES.read)
		.description(
			'Read one item of the selected knowledge by its exact ref from list_knowledge or search_knowledge. Returns the text with its title, url, updatedAt and a citation line. Pass ranges to read only some lines. Only picked items and the items inside picked containers can be read.',
		)
		.input(readKnowledgeInputSchema)
		.untrustedOutput()
		.handler(
			async (input, ctx) =>
				await runLiveKnowledgeTool(
					async () => await service.read(scope, sources, callContext(ctx), input),
				),
		)
		.toModelOutput(toReadKnowledgeModelOutput);

	return [listTool, searchTool, readTool];
}
