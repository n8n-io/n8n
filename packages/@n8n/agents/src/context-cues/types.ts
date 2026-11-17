import type { EmbeddingModel } from 'ai';

import type { ContextCueRequest } from '../types/runtime/agent-runtime';
import type { AgentMessage } from '../types/sdk/message';

/**
 * A one-line correction for a mistake seen in real runs or evals. While its
 * set is active, the runtime retrieves the cues whose `appliesWhen` matches
 * the current step and adds them to the conversation.
 */
export interface ContextCue {
	/** Unique within its set. */
	id: string;
	/** The correction the model sees. */
	text: string;
	/** The situation the cue is for, in one sentence. Retrieval ranks this text. */
	appliesWhen: string;
	/**
	 * Retrieval skips the cue until the conversation reaches this phase.
	 * The host defines phases with `detectPhases`. Omit for any time.
	 */
	phase?: string;
	/**
	 * Retrieval skips the cue until one of these strings appears in the
	 * user's messages or the agent's tool inputs, such as a node type or a tag.
	 * Omit to allow it in any thread.
	 */
	requiresAny?: readonly string[];
}

/** Decides before each model call whether a set's cues can apply. */
export type ContextCueSetPredicate = (request: ContextCueRequest) => boolean;

export interface ContextCueSet {
	/** Unique across sets. Part of each cue's conversation id. */
	id: string;
	/**
	 * Retrieval scores the set only when this returns true. Omit to score it
	 * before every model call. See `whileSkillActive` and `whenSkillLoads`.
	 */
	isActive?: ContextCueSetPredicate;
	cues: readonly ContextCue[];
}

export interface ContextCueMatch {
	setId: string;
	cueId: string;
	score: number;
}

export type ContextCueRetrievalMethod = 'embedding' | 'bm25';

export interface ContextCueStepQuery {
	/** What the user asked for, from the latest user message. */
	intent: string;
	/** What the agent did last: its text, tool calls, and errors. */
	step: string;
}

export interface ContextCueRetrievalTrace {
	method: ContextCueRetrievalMethod;
	query: ContextCueStepQuery;
	matches: ContextCueMatch[];
	/** Best candidates under the threshold, to help tune it. */
	nearMisses: ContextCueMatch[];
}

export interface ContextCueProviderOptions {
	sets: readonly ContextCueSet[];
	/** Without an embedding model, the provider ranks cues with BM25. */
	embeddingModel?: EmbeddingModel;
	/** Phases the conversation has reached. Without it, cues with a `phase` never apply. */
	detectPhases?: (messages: readonly AgentMessage[]) => ReadonlySet<string>;
	/** Defaults depend on the method: the scores are on different scales. */
	threshold?: number;
	/** The most cues added before one model call. Default: 3. */
	topK?: number;
	/** Cue ids to leave out, for ablation runs. `*` leaves out all of them. */
	ablate?: ReadonlySet<string>;
	/**
	 * Extra BM25 stopwords: words that occur in most cues and steps of this
	 * domain and say nothing about which cue applies.
	 */
	stopwords?: readonly string[];
	/**
	 * Extra XML-like tags that the host adds to message text. Their content is
	 * not part of the query or the `requiresAny` evidence.
	 */
	injectedTags?: readonly string[];
	onRetrieval?: (trace: ContextCueRetrievalTrace) => void;
	/** Called once when embedding fails and the provider switches to BM25 for good. */
	onEmbeddingFailure?: (error: unknown) => void;
}
