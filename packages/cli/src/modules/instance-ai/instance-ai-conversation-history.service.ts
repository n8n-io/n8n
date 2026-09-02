import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import type {
	ConversationHistoryExcerpt,
	ConversationHistoryMatchSource,
	ConversationHistoryMessage,
	ConversationHistoryMessagesResult,
	ConversationHistorySearchHit,
	ConversationHistorySearchResult,
	CONVERSATION_HISTORY_MAX_SEARCH_LIMIT,
	CONVERSATION_HISTORY_MAX_WINDOW_SIDE,
	InstanceAiConversationHistoryService as ScopedConversationHistory,
} from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse, UserError } from 'n8n-workflow';
import { z } from 'zod';

import type { InstanceAiMessage } from './entities/instance-ai-message.entity';
import { cleanStoredUserMessage } from './internal-messages';
import { extractTextFromContent } from './message-parser';
import { TOOL_CALL_PART_TYPES } from './repositories/conversation-history-search';
import {
	InstanceAiConversationHistoryRepository,
	type ConversationThreadSearchRow,
} from './repositories/instance-ai-conversation-history.repository';

/** Characters of context returned around a match, and for the opening message. */
const EXCERPT_LENGTH = 200;
const MAX_EXCERPTS_PER_THREAD = 3;
/**
 * Candidates are the newest raw-JSON matches, and internal enrichment blocks
 * (`<project-context>` etc.) can make boilerplate-only rows outnumber a genuine
 * older match — so fetch a few more than the excerpts we keep.
 */
const EXCERPT_CANDIDATES_PER_THREAD = 8;

/**
 * The tool schema's caps from `@n8n/instance-ai`. Local literals, tied to the
 * package's exports at the TYPE level (their literal types), so raising one
 * without the other fails `pnpm typecheck` — while the module stays free of
 * runtime imports from the package, which several cli test suites stub with
 * wiring-only mocks.
 */
const MAX_SEARCH_LIMIT: typeof CONVERSATION_HISTORY_MAX_SEARCH_LIMIT = 10;
const MAX_WINDOW_SIDE: typeof CONVERSATION_HISTORY_MAX_WINDOW_SIDE = 5;

/**
 * Verification drops SQL false positives, so fetch double the page to keep a
 * dropped thread from costing a hit.
 */
const THREAD_PAGE_OVERFETCH_FACTOR = 2;

const DEFAULT_SEARCH_LIMIT = 10;
/** A recency listing is for orientation, so it defaults smaller than a search. */
const DEFAULT_LIST_LIMIT = 5;

const DEFAULT_WINDOW_SIDE = MAX_WINDOW_SIDE;
const USER_TEXT_LIMIT = 1500;
/** Assistant turns are narration-heavy, so they are cut harder. */
const ASSISTANT_TEXT_LIMIT = 800;

/** Same message for missing and inaccessible threads — a probe learns nothing. */
const THREAD_NOT_FOUND = 'Conversation not found';

/**
 * Conversations named in the first-turn hint. Three is enough to prove there is
 * history worth searching; more would spend the turn's tokens on a directory
 * listing the `conversation-history` tool can produce on demand.
 */
const PAST_CONVERSATIONS_HINT_LIMIT = 3;

/** Past this many days the hint counts in weeks — the agent only needs staleness. */
const AGE_WEEKS_THRESHOLD_DAYS = 14;

const askUserAnswerSchema = z.object({
	question: z.string(),
	selectedOptions: z.array(z.string()),
	customText: z.string().optional(),
	skipped: z.boolean().optional(),
});

const askUserPartSchema = z.object({
	type: z.literal('tool-call'),
	toolName: z.literal('ask-user'),
	state: z.literal('resolved'),
	output: z.object({
		answered: z.boolean(),
		answers: z.array(askUserAnswerSchema).optional(),
	}),
});

type AskUserAnswer = z.infer<typeof askUserAnswerSchema>;

/** A resolved ask-user question with its answer rendered for reading. */
interface QuestionAndAnswer {
	question: string;
	answer: string;
}

/** A thread hit whose title or re-checked excerpts actually matched. */
interface ExtractedThreadMatch extends ExtractedExcerpts {
	row: ConversationThreadSearchRow;
	titleMatched: boolean;
}

interface ExtractedExcerpts {
	excerpts: ConversationHistoryExcerpt[];
	matchedInMessages: boolean;
	matchedInAnswers: boolean;
}

/** Parsed row content, or undefined when the row is not readable JSON. */
function parseStoredContent(raw: string): { content: unknown } | undefined {
	// `null`, not `undefined`: jsonParse treats an undefined fallback as absent
	// and rethrows. `isRecord` rejects the null on the next line.
	const parsed = jsonParse<unknown>(raw, { fallbackValue: null });
	if (!isRecord(parsed)) return undefined;
	return { content: parsed.content };
}

/**
 * User text as the user saw it: stored user messages carry appended internal
 * enrichment (`<project-context>`, `<current-date-time>`, editor/task context
 * blocks), which must not surface in excerpts — nor match a query, or wrapper
 * boilerplate would rank every thread for terms like "project". `null` marks
 * an internal auto-follow-up row with no user-authored content at all.
 */
function extractUserText(content: unknown): string | null {
	return cleanStoredUserMessage(extractTextFromContent(content));
}

/**
 * Whether an assistant row carried tool calls. The agent loop only continues
 * on tool calls, so a row with them is mid-turn narration ("building now…")
 * and a text-only row is the reply that ended the turn — the one the user saw
 * as a standalone message.
 */
function hasToolActivity(content: unknown): boolean {
	if (!Array.isArray(content)) return false;
	return content.some(
		(part) =>
			isRecord(part) && typeof part.type === 'string' && TOOL_CALL_PART_TYPES.includes(part.type),
	);
}

function renderAnswer(answer: AskUserAnswer): string {
	const chosen = [...answer.selectedOptions];
	if (answer.customText) chosen.push(answer.customText);
	const rendered = chosen.join(', ');
	if (answer.skipped) return rendered ? `${rendered} (skipped)` : '(skipped)';
	return rendered;
}

function extractAskUserAnswers(content: unknown): QuestionAndAnswer[] {
	if (!Array.isArray(content)) return [];

	return content.flatMap((part) => {
		const parsed = askUserPartSchema.safeParse(part);
		if (!parsed.success) return [];
		return (parsed.data.output.answers ?? []).map((answer) => ({
			question: answer.question,
			answer: renderAnswer(answer),
		}));
	});
}

function formatQuestionAndAnswer(pair: QuestionAndAnswer): string {
	return `Q: ${pair.question} → A: ${pair.answer}`;
}

function truncate(text: string, limit: number): string {
	return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

/** ~`EXCERPT_LENGTH` characters centered on the match, elided on both open ends. */
function centerExcerpt(text: string, matchIndex: number, matchLength: number): string {
	if (text.length <= EXCERPT_LENGTH) return text;

	const padding = Math.max(0, Math.floor((EXCERPT_LENGTH - matchLength) / 2));
	const end = Math.min(text.length, Math.max(0, matchIndex - padding) + EXCERPT_LENGTH);
	// Pull the window back when the match sits near the end of the text.
	const start = Math.max(0, end - EXCERPT_LENGTH);

	return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

function clampSearchLimit(limit: number): number {
	return Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.floor(limit)));
}

function clampWindowSide(value: number): number {
	return Math.max(0, Math.min(MAX_WINDOW_SIDE, Math.floor(value)));
}

/** The opening user message rendered for a hit, or undefined when unreadable. */
function firstMessageExcerpt(first: InstanceAiMessage | undefined): string | undefined {
	if (!first) return undefined;

	const parsed = parseStoredContent(first.content);
	if (!parsed) return undefined;

	const text = extractUserText(parsed.content)?.trim();
	return text ? truncate(text, EXCERPT_LENGTH) : undefined;
}

/**
 * Coarse relative age, no date library needed: the hint only has to tell the
 * agent whether a conversation is fresh or stale. A future timestamp (clock
 * skew between writers) reads as "today" rather than a negative age.
 */
function formatConversationAge(updatedAt: Date, nowMs: number): string {
	const days = Math.floor(Math.max(0, nowMs - updatedAt.getTime()) / Time.days.toMilliseconds);
	if (days === 0) return 'today';
	if (days < AGE_WEEKS_THRESHOLD_DAYS) return `${days}d ago`;
	return `${Math.floor(days / 7)}w ago`;
}

/**
 * Read-only recall over a user's past conversations, backing the
 * `conversation-history` tool. Scoped per run by {@link forContext}: the tool
 * never supplies the user or project, and the current thread is excluded from
 * search (the agent already has it in context).
 */
@Service()
export class InstanceAiConversationHistoryService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly repository: InstanceAiConversationHistoryRepository,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/** Bind the reader to one user, project and current thread. */
	forContext(
		userId: string,
		projectId: string,
		currentThreadId: string,
	): ScopedConversationHistory {
		return {
			search: async (params) =>
				await this.search(userId, projectId, currentThreadId, params.query, params.limit),
			getMessages: async (params) => await this.getMessages(userId, projectId, params),
		};
	}

	/**
	 * Ambient hint naming the project's most recent conversations, for the
	 * `<past-conversations>` block on a thread's opening turn. Without it the
	 * agent has no reason to believe any history exists and never reaches for
	 * the `conversation-history` tool.
	 *
	 * Returns `undefined` — no block — when this is not the thread's first turn,
	 * when the project has no other conversations, or when anything at all goes
	 * wrong. Strictly best-effort: a hint that cannot be built must degrade the
	 * turn, never fail it.
	 */
	async getPastConversationsSection(
		userId: string,
		projectId: string,
		currentThreadId: string,
	): Promise<string | undefined> {
		try {
			// The turn's own user message is persisted only after the agent receives
			// it, so an empty log here means this is the thread's opening turn.
			if (await this.repository.threadHasMessages(currentThreadId)) return undefined;

			const { rows, total } = await this.repository.listRecentProjectThreadsForUser({
				userId,
				projectId,
				excludeThreadId: currentThreadId,
				limit: PAST_CONVERSATIONS_HINT_LIMIT,
			});
			if (rows.length === 0) return undefined;

			const nowMs = Date.now();
			const recent = rows
				.map(
					(row) =>
						`"${row.title.trim() || '(untitled)'}" (${formatConversationAge(row.updatedAt, nowMs)})`,
				)
				.join(', ');
			const count = total === 1 ? '1 past conversation' : `${total} past conversations`;

			// The fact, and only the fact: what to do with a `<past-conversations>`
			// block lives in the system prompt's "Past Conversations" section, which
			// is CACHED — restating the rule here would pay for it in uncached
			// tokens on every opening turn (see `getProjectContextSection`).
			return `This project has ${count} with you. Most recent: ${recent}.`;
		} catch (error) {
			this.logger.warn('Instance AI could not build the past-conversations hint for this turn', {
				projectId,
				threadId: currentThreadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	private async search(
		userId: string,
		projectId: string,
		currentThreadId: string,
		query: string | undefined,
		limit: number | undefined,
	): Promise<ConversationHistorySearchResult> {
		const trimmedQuery = query?.trim() ?? '';
		if (trimmedQuery.length === 0) {
			return await this.listRecent(userId, projectId, currentThreadId, limit ?? DEFAULT_LIST_LIMIT);
		}

		const pageLimit = clampSearchLimit(limit ?? DEFAULT_SEARCH_LIMIT);
		const rows = await this.repository.searchProjectThreadsForUser({
			userId,
			projectId,
			excludeThreadId: currentThreadId,
			query: trimmedQuery,
			limit: pageLimit * THREAD_PAGE_OVERFETCH_FACTOR,
		});
		if (rows.length === 0) return { hits: [] };

		const candidatesByThread = await this.repository.findSearchMatchRows(
			rows.map((row) => row.id),
			trimmedQuery,
			EXCERPT_CANDIDATES_PER_THREAD,
		);

		const needle = trimmedQuery.toLowerCase();
		const matched = rows.flatMap((row) => {
			const extracted = this.buildExcerpts(candidatesByThread.get(row.id) ?? [], trimmedQuery);
			const titleMatched = row.title.toLowerCase().includes(needle);
			// The SQL match ran over serialized JSON, so a thread whose title did
			// not match and whose candidates all failed re-checking was a false
			// positive (a key name, a tool payload) and is dropped.
			if (!titleMatched && extracted.excerpts.length === 0) return [];
			return [{ row, titleMatched, ...extracted }];
		});

		if (matched.length < rows.length) {
			this.logger.debug('Dropped conversation-history hits with no verified match', {
				dropped: rows.length - matched.length,
			});
		}

		const page = matched.slice(0, pageLimit);
		const firstUserMessages = await this.repository.findFirstUserMessages(
			page.map((hit) => hit.row.id),
		);
		const hits = page.map((hit) => buildHit(hit, firstUserMessages));

		return { hits };
	}

	/**
	 * Query-less listing: the most recently updated conversations, no match
	 * work at all. Hits keep the search shape — empty `matchedIn` and `excerpts`
	 * are what tell the reader this was a listing.
	 */
	private async listRecent(
		userId: string,
		projectId: string,
		currentThreadId: string,
		limit: number,
	): Promise<ConversationHistorySearchResult> {
		const { rows } = await this.repository.listRecentProjectThreadsForUser({
			userId,
			projectId,
			excludeThreadId: currentThreadId,
			limit: clampSearchLimit(limit),
		});

		const firstUserMessages = await this.repository.findFirstUserMessages(
			rows.map((row) => row.id),
		);
		const hits = rows.map((row) => baseHit(row, firstUserMessages));

		return { hits };
	}

	/**
	 * Re-check each candidate row against its extracted text — the SQL filter
	 * matched serialized JSON, this matches what a reader would actually see.
	 */
	private buildExcerpts(candidates: InstanceAiMessage[], query: string): ExtractedExcerpts {
		const needle = query.toLowerCase();
		const excerpts: ConversationHistoryExcerpt[] = [];
		let matchedInMessages = false;
		let matchedInAnswers = false;

		for (const row of candidates) {
			if (excerpts.length >= MAX_EXCERPTS_PER_THREAD) break;

			const parsed = parseStoredContent(row.content);
			if (!parsed) continue;

			const isUserRow = row.role === 'user';
			const text = isUserRow
				? (extractUserText(parsed.content) ?? '')
				: extractAskUserAnswers(parsed.content).map(formatQuestionAndAnswer).join('\n');

			const matchIndex = text.toLowerCase().indexOf(needle);
			if (matchIndex === -1) continue;

			if (isUserRow) matchedInMessages = true;
			else matchedInAnswers = true;

			excerpts.push({
				messageId: row.id,
				text: centerExcerpt(text, matchIndex, needle.length),
				createdAt: row.createdAt.toISOString(),
			});
		}

		return { excerpts, matchedInMessages, matchedInAnswers };
	}

	private async getMessages(
		userId: string,
		projectId: string,
		params: {
			threadId: string;
			aroundMessageId?: string;
			before?: number;
			after?: number;
		},
	): Promise<ConversationHistoryMessagesResult> {
		// Never trust the model-supplied thread id: re-check ownership and project
		// binding here, not just at search time. The current thread is readable —
		// only search excludes it. The anchor lookup is independent (already
		// thread-scoped), so it runs alongside the ownership check.
		const [thread, anchorRow] = await Promise.all([
			this.repository.findOwnedThread(params.threadId, userId, projectId),
			params.aroundMessageId
				? this.repository.findMessageInThread(params.threadId, params.aroundMessageId)
				: null,
		]);
		if (!thread) {
			throw new UserError(THREAD_NOT_FOUND);
		}
		if (params.aroundMessageId && !anchorRow) {
			throw new UserError('Message not found in this conversation');
		}

		const { before, after } = this.resolveWindow(anchorRow !== null, params.before, params.after);
		const window = await this.repository.getConversationWindow({
			threadId: params.threadId,
			anchor: anchorRow ? { createdAt: anchorRow.createdAt, id: anchorRow.id } : undefined,
			before,
			after,
			isVisibleRow: (row) => toHistoryMessage(row) !== undefined,
		});

		return {
			threadId: thread.id,
			title: thread.title,
			messages: window.rows.flatMap((row) => {
				const message = toHistoryMessage(row);
				return message ? [message] : [];
			}),
			hasMoreBefore: window.hasMoreBefore,
			hasMoreAfter: window.hasMoreAfter,
		};
	}

	/**
	 * Bare read → the last few messages. Anchored read with no counts → a window
	 * on both sides. Caller-supplied counts are clamped defensively; the tool
	 * schema already caps them (and keeps them positive).
	 */
	private resolveWindow(
		hasAnchor: boolean,
		before?: number,
		after?: number,
	): { before: number; after: number } {
		if (before === undefined && after === undefined) {
			return { before: DEFAULT_WINDOW_SIDE, after: hasAnchor ? DEFAULT_WINDOW_SIDE : 0 };
		}

		return { before: clampWindowSide(before ?? 0), after: clampWindowSide(after ?? 0) };
	}
}

/** The match-independent part of a hit — also the whole hit for a listing. */
function baseHit(
	row: ConversationThreadSearchRow,
	firstUserMessages: Map<string, InstanceAiMessage>,
): ConversationHistorySearchHit {
	const openingExcerpt = firstMessageExcerpt(firstUserMessages.get(row.id));

	return {
		threadId: row.id,
		title: row.title,
		updatedAt: row.updatedAt.toISOString(),
		matchedIn: [],
		...(openingExcerpt ? { firstMessageExcerpt: openingExcerpt } : {}),
		excerpts: [],
	};
}

function buildHit(
	hit: ExtractedThreadMatch,
	firstUserMessages: Map<string, InstanceAiMessage>,
): ConversationHistorySearchHit {
	const { row, titleMatched, excerpts, matchedInMessages, matchedInAnswers } = hit;

	const matchedIn: ConversationHistoryMatchSource[] = [];
	if (titleMatched) matchedIn.push('title');
	if (matchedInMessages) matchedIn.push('messages');
	if (matchedInAnswers) matchedIn.push('user-answers');

	return {
		...baseHit(row, firstUserMessages),
		matchedIn,
		excerpts,
	};
}

/**
 * A stored row as the agent reads it — the conversation as the user
 * experienced it: their messages, ask-user answers, and each turn's final
 * text-only reply. Dropped rows: unreadable content, internal
 * auto-follow-up user rows the user never wrote or saw, and mid-turn
 * assistant rows (the loop only continues on tool calls, so a row carrying
 * them is working narration, not the reply that ended the turn). Ask-user
 * rows are mid-turn tool activity too, but they hold the user's own
 * answers — they stay.
 * This same check is the window's `isVisibleRow` predicate, so window slots are
 * spent on rows that survive it.
 */
function toHistoryMessage(row: InstanceAiMessage): ConversationHistoryMessage | undefined {
	if (row.role !== 'user' && row.role !== 'assistant') return undefined;

	const parsed = parseStoredContent(row.content);
	if (!parsed) return undefined;

	const isUserRow = row.role === 'user';
	const userAnswers = isUserRow ? [] : extractAskUserAnswers(parsed.content);

	const text = isUserRow ? extractUserText(parsed.content) : extractTextFromContent(parsed.content);
	if (text === null) return undefined;

	if (!isUserRow && userAnswers.length === 0 && hasToolActivity(parsed.content)) {
		return undefined;
	}
	if (!isUserRow && text.trim().length === 0 && userAnswers.length === 0) return undefined;

	return {
		messageId: row.id,
		role: isUserRow ? 'user' : 'assistant',
		createdAt: row.createdAt.toISOString(),
		text: truncate(text, isUserRow ? USER_TEXT_LIMIT : ASSISTANT_TEXT_LIMIT),
		...(userAnswers.length > 0 ? { userAnswers } : {}),
	};
}
