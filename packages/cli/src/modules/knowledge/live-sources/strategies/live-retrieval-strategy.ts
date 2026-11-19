import type { AgentLiveSourceRetrievalStrategy } from '@n8n/api-types';

import type {
	KnowledgeLiveSourceProvider,
	LiveDocument,
	LiveEntry,
	LiveRunContext,
	LiveSearchMatch,
	LiveSourceConfig,
} from '../live-source-provider';

/** A match with the rank the strategy gave it. */
export type RankedSearchMatch = LiveSearchMatch & { score: number };

/** What a strategy gets for one search of one source. */
export interface LiveSearchContext {
	ctx: LiveRunContext;
	source: LiveSourceConfig;
	provider: KnowledgeLiveSourceProvider;
	/** Every entry the run may reach in this source, after the requested scope was applied. */
	scope: readonly LiveEntry[];
	/** The picked single items in the scope. Their text is searched in process. */
	pickedItems: readonly LiveEntry[];
	/** Reads an entry once per run. */
	readDocument: (entry: LiveEntry) => Promise<LiveDocument>;
}

/** How a source is searched. The read path is the same for every strategy: live. */
export interface LiveRetrievalStrategy {
	readonly id: AgentLiveSourceRetrievalStrategy;
	search(context: LiveSearchContext, query: string, limit: number): Promise<RankedSearchMatch[]>;
}
