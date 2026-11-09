import type { EmbeddingModel } from 'ai';

import type { AgentMessage } from '../types/sdk/message';

/**
 * A one-line correction for a mistake seen in real runs or evals. It belongs to
 * a skill but is not part of the skill body. While the skill is active, the
 * runtime retrieves the reminders whose `appliesWhen` matches the current step
 * and adds them to the conversation as context notes.
 */
export interface ContextReminder {
	/** Unique within its set. */
	id: string;
	/** The correction the model sees. */
	text: string;
	/** The situation the reminder is for, in one sentence. Retrieval ranks this text. */
	appliesWhen: string;
	/**
	 * Retrieval skips the reminder until the conversation reaches this phase.
	 * The host defines phases with `detectPhases`. Omit for any time.
	 */
	phase?: string;
	/**
	 * Retrieval skips the reminder until one of these strings appears in the
	 * user's messages or the agent's tool inputs, such as a node type or a tag.
	 * Omit to allow it in any thread.
	 */
	requiresAny?: readonly string[];
	/** The failure the reminder prevents, in one sentence. */
	fixes?: string;
	/** The PR or commit that added the reminder. */
	origin?: string;
	/** Eval cases that fail without the reminder. Empty means it was never ablated. */
	evalCases?: readonly string[];
}

/**
 * When retrieval scores a set.
 * - `every-step`: before each model call while the skill is active.
 * - `on-load`: only for the model call right after the agent loads the skill.
 *   Use it for skills that make one decision in that call, such as routing.
 */
export type ContextReminderDelivery = 'every-step' | 'on-load';

export interface ContextReminderSet {
	/** The skill that must be active for these reminders to apply. */
	skillId: string;
	/** Default: `every-step`. */
	delivery?: ContextReminderDelivery;
	reminders: readonly ContextReminder[];
}

export interface ContextReminderMatch {
	skillId: string;
	reminderId: string;
	score: number;
}

export type ContextReminderRetrievalMethod = 'embedding' | 'bm25';

export interface ContextReminderStepQuery {
	/** What the user asked for, from the latest user message. */
	intent: string;
	/** What the agent did last: its text, tool calls, and errors. */
	step: string;
}

export interface ContextReminderRetrievalTrace {
	method: ContextReminderRetrievalMethod;
	query: ContextReminderStepQuery;
	matches: ContextReminderMatch[];
	/** Best candidates under the threshold, to help tune it. */
	nearMisses: ContextReminderMatch[];
}

export interface ContextReminderProviderOptions {
	sets: readonly ContextReminderSet[];
	/** Without an embedding model, the provider ranks reminders with BM25. */
	embeddingModel?: EmbeddingModel;
	/** Phases the conversation has reached. Without it, reminders with a `phase` never apply. */
	detectPhases?: (messages: readonly AgentMessage[]) => ReadonlySet<string>;
	/** Defaults depend on the method: the scores are on different scales. */
	threshold?: number;
	/** The most reminders added before one model call. Default: 3. */
	topK?: number;
	/** Reminder ids to leave out, for ablation runs. `*` leaves out all of them. */
	ablate?: ReadonlySet<string>;
	/**
	 * Extra BM25 stopwords: words that occur in most reminders and steps of this
	 * domain and say nothing about which reminder applies.
	 */
	stopwords?: readonly string[];
	/**
	 * Extra XML-like tags that the host adds to message text. Their content is
	 * not part of the query or the `requiresAny` evidence.
	 */
	injectedTags?: readonly string[];
	onRetrieval?: (trace: ContextReminderRetrievalTrace) => void;
	/** Called once when embedding fails and the provider switches to BM25 for good. */
	onEmbeddingFailure?: (error: unknown) => void;
}
