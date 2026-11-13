import type { AgentPersistedMessageDto } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { createHash } from 'node:crypto';

import type { AgentSessionThread, AgentSessionTurn } from './agent-context.contracts';

type TimelineEvent = NonNullable<AgentSessionTurn['timeline']>[number];

/** Delimits the LLM-facing preview transcript block. */
export const PREVIEW_CONTEXT_OPEN_TAG = '<preview_session_context>';
export const PREVIEW_CONTEXT_CLOSE_TAG = '</preview_session_context>';

const ESCAPED_PREVIEW_CONTEXT_OPEN_TAG = '&lt;preview_session_context&gt;';
const ESCAPED_PREVIEW_CONTEXT_CLOSE_TAG = '&lt;/preview_session_context&gt;';

/** Maximum characters in one page of the full output, wrapper included. */
export const FULL_TRANSCRIPT_PAGE_CHARS = 50_000;

const MAX_TEXT_CHARS = 4_000;
const MAX_TOOL_VALUE_CHARS = 2_000;
const MAX_BLOCK_CHARS = 100_000;
const TRUNCATION_FOOTER = '… [truncated]';

interface ValueLimits {
	text: number;
	toolValue: number;
}

const COMPACT_LIMITS: ValueLimits = { text: MAX_TEXT_CHARS, toolValue: MAX_TOOL_VALUE_CHARS };
const FULL_LIMITS: ValueLimits = {
	text: Number.POSITIVE_INFINITY,
	toolValue: Number.POSITIVE_INFINITY,
};

/** Stored values must not close the context block early. */
function escapeContextDelimiters(value: string): string {
	return value
		.replaceAll(PREVIEW_CONTEXT_OPEN_TAG, ESCAPED_PREVIEW_CONTEXT_OPEN_TAG)
		.replaceAll(PREVIEW_CONTEXT_CLOSE_TAG, ESCAPED_PREVIEW_CONTEXT_CLOSE_TAG);
}

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return value.slice(0, max) + TRUNCATION_FOOTER;
}

function truncateBlockToFit(value: string, max: number): string | null {
	if (max <= TRUNCATION_FOOTER.length) return null;
	if (value.length <= max) return value;
	return value.slice(0, max - TRUNCATION_FOOTER.length) + TRUNCATION_FOOTER;
}

function stringifyToolValue(value: unknown, limits: ValueLimits): string {
	if (value === undefined) return '(none)';
	let serialized: string;
	try {
		serialized = JSON.stringify(value) ?? 'undefined';
	} catch {
		serialized = String(value);
	}
	return truncate(serialized, limits.toolValue);
}

function formatInput(message: AgentPersistedMessageDto, limits: ValueLimits): string {
	const text = message.content
		.flatMap((part) => {
			if (part.type === 'text') return [part.text];
			if (part.type === 'file') return [`[Attachment: ${part.fileName ?? part.fileId ?? 'file'}]`];
			return [];
		})
		.join('\n');
	return `User: ${truncate(text, limits.text)}`;
}

function formatTimelineEvent(
	event: TimelineEvent,
	execution: AgentSessionTurn,
	limits: ValueLimits,
): string {
	if (event.type === 'input') {
		const message = execution.inputMessages?.find(({ id }) => id === event.messageId);
		return message ? formatInput(message, limits) : '';
	}
	if (event.type === 'background-task-signal') {
		return `Background task results received: ${stringifyToolValue(event.signal.tasks, limits)}`;
	}
	if (event.type === 'text') {
		return `Assistant: ${truncate(event.content, limits.text)}`;
	}
	if (event.type === 'reasoning') {
		return `Reasoning: ${truncate(event.content, limits.text)}`;
	}
	if (event.type === 'suspension') {
		return `[suspended waiting on ${event.toolName}]`;
	}
	if (event.type === 'hitl-response') {
		return `Human response: ${stringifyToolValue(event.response, limits)}`;
	}
	if (event.type === 'guardrail') {
		return `[stopped by guardrail ${event.code}]`;
	}
	if (event.type === 'host-event') {
		return `Host event ${event.name}: ${stringifyToolValue(event.payload, limits)}`;
	}
	const durationMs = event.endTime > 0 ? event.endTime - event.startTime : null;
	const headerParts = [
		`Tool call: ${event.name}`,
		`kind=${event.kind}`,
		event.success ? 'succeeded' : 'failed',
	];
	if (durationMs !== null) headerParts.push(`${durationMs}ms`);
	if (event.workflowName) headerParts.push(`workflow=${event.workflowName}`);
	if (event.nodeDisplayName) headerParts.push(`node=${event.nodeDisplayName}`);
	return [
		headerParts.join(' | '),
		`  Input: ${stringifyToolValue(event.input, limits)}`,
		`  Output: ${stringifyToolValue(event.output, limits)}`,
	].join('\n');
}

interface FormattedTurn {
	/** Status, model, duration, tokens, and error. Changes while the turn runs. */
	header: string;
	/** Input and timeline. Grows while the turn runs. */
	body: string;
}

/** Each part starts with a newline, so `header + body` is the complete turn. */
function formatTurn(execution: AgentSessionTurn, limits: ValueLimits): FormattedTurn {
	const headerParts = [`status=${execution.status}`];
	if (execution.model) headerParts.push(`model=${execution.model}`);
	headerParts.push(`duration=${execution.duration}ms`);
	if (execution.totalTokens !== null) headerParts.push(`tokens=${execution.totalTokens}`);
	if (execution.error) headerParts.push(`error=${execution.error}`);

	const lines: string[] = [];
	if (execution.inputMessages !== undefined) {
		const steeredIds = new Set(
			execution.timeline?.filter((event) => event.type === 'input').map((event) => event.messageId),
		);
		for (const message of execution.inputMessages) {
			if (!steeredIds.has(message.id)) lines.push(formatInput(message, limits));
		}
	} else if (execution.userMessage !== null) {
		lines.push(`User: ${truncate(execution.userMessage, limits.text)}`);
	}
	for (const event of execution.timeline ?? []) {
		const line = formatTimelineEvent(event, execution, limits);
		if (line) lines.push(line);
	}
	return {
		header: `\n${escapeContextDelimiters(`## Turn (${headerParts.join(', ')})`)}`,
		body: lines.map((line) => `\n${escapeContextDelimiters(line)}`).join(''),
	};
}

function formatExecution(execution: AgentSessionTurn, limits: ValueLimits): string {
	const { header, body } = formatTurn(execution, limits);
	return header + body;
}

function selectTurnExecutions(
	executions: AgentSessionTurn[],
	executionId: string,
): AgentSessionTurn[] | null {
	let anchorIndex = executions.findIndex((execution) => execution.id === executionId);
	if (anchorIndex === -1) return null;

	while (
		anchorIndex > 0 &&
		continuesExecution(executions[anchorIndex - 1], executions[anchorIndex])
	) {
		anchorIndex--;
	}

	const selected = [executions[anchorIndex]];
	for (let i = anchorIndex + 1; i < executions.length; i++) {
		if (!continuesExecution(executions[i - 1], executions[i])) break;
		selected.push(executions[i]);
	}
	return selected;
}

function continuesExecution(previous: AgentSessionTurn, current: AgentSessionTurn): boolean {
	if (current.inputMessageIds !== undefined) {
		const firstInputId = current.inputMessageIds[0];
		if (!firstInputId) return false;
		if (previous.inputMessageIds !== undefined) {
			return firstInputId === previous.inputMessageIds[0];
		}
		// A legacy continuation gets its first input link when it consumes steering.
		return (
			current.timeline?.some(
				(event) => event.type === 'input' && event.messageId === firstInputId,
			) ?? false
		);
	}
	return current.userMessage === null;
}

function selectScope(
	executions: AgentSessionTurn[],
	executionId: string | undefined,
): AgentSessionTurn[] | null {
	return executionId === undefined ? executions : selectTurnExecutions(executions, executionId);
}

function formatPrefix(
	thread: AgentSessionThread,
	turnCount: number,
	executionId: string | undefined,
	headerSuffix = '',
): string {
	const scopeLabel = executionId === undefined ? 'whole session' : 'single turn';
	const header =
		`Preview session transcript — title: ${escapeContextDelimiters(thread.title ?? '(untitled)')}, ` +
		`session #${thread.sessionNumber}, scope: ${scopeLabel}, turns: ${turnCount}${headerSuffix}`;

	return [
		PREVIEW_CONTEXT_OPEN_TAG,
		header,
		'',
		'The user shared this transcript of a real conversation with the target agent',
		'so you can assess its behavior and improve its configuration.',
	].join('\n');
}

/**
 * Format a preview chat session (or single turn) into a markdown
 * block for injection into a builder chat message. Returns `null` when
 * `executionId` doesn't belong to the thread. Values in the timeline are
 * already removed of secrets at record time.
 */
export function formatPreviewSessionContext(
	thread: AgentSessionThread,
	executions: AgentSessionTurn[],
	executionId?: string,
): string | null {
	const scoped = selectScope(executions, executionId);
	if (scoped === null) return null;

	const prefix = formatPrefix(thread, scoped.length, executionId);
	const closing = `\n${PREVIEW_CONTEXT_CLOSE_TAG}`;
	const includedNewestFirst: string[] = [];
	let includedLength = 0;
	let boundaryTurn: string | null = null;
	let omittedEarlierTurns = 0;

	for (let i = scoped.length - 1; i >= 0; i--) {
		const formatted = formatExecution(scoped[i], COMPACT_LIMITS);
		const projectedLength = prefix.length + includedLength + formatted.length + closing.length;
		if (projectedLength > MAX_BLOCK_CHARS) {
			boundaryTurn = formatted;
			omittedEarlierTurns = i;
			break;
		}
		includedNewestFirst.push(formatted);
		includedLength += formatted.length;
	}

	const includedTurns = includedNewestFirst.reverse();
	if (boundaryTurn !== null) {
		for (;;) {
			const footerCandidate =
				omittedEarlierTurns > 0
					? `\n[transcript truncated: ${omittedEarlierTurns} earlier turns omitted]`
					: '';
			const remainingBudget =
				MAX_BLOCK_CHARS - prefix.length - includedLength - footerCandidate.length - closing.length;
			const truncatedBoundary = truncateBlockToFit(boundaryTurn, remainingBudget);
			if (truncatedBoundary !== null) {
				includedTurns.unshift(truncatedBoundary);
				includedLength += truncatedBoundary.length;
				break;
			}

			omittedEarlierTurns++;
			if (includedTurns.length === 0) break;
			const removedTurn = includedTurns.shift();
			if (!removedTurn) break;
			includedLength -= removedTurn.length;
		}
	}

	let footer = '';
	while (omittedEarlierTurns > 0) {
		const footerCandidate = `\n[transcript truncated: ${omittedEarlierTurns} earlier turns omitted]`;
		const projectedLength =
			prefix.length + includedLength + footerCandidate.length + closing.length;
		if (projectedLength <= MAX_BLOCK_CHARS) {
			footer = footerCandidate;
			break;
		}

		const removedTurn = includedTurns.shift();
		if (!removedTurn) break;
		includedLength -= removedTurn.length;
		omittedEarlierTurns++;
	}

	return prefix + includedTurns.join('') + footer + closing;
}

export interface PreviewSessionContextPageOptions {
	/** Scope the transcript to this turn and its resumed parts. */
	executionId?: string;
	/** `nextCursor` from the previous page. Omit it to read the first page. */
	cursor?: string;
	/** Maximum characters in the returned transcript, wrapper included. */
	pageSize?: number;
}

export type PreviewSessionContextPage =
	| { ok: true; transcript: string; nextCursor: string | null }
	| { ok: false; reason: 'execution_not_found' | 'invalid_cursor' };

type TurnPart = keyof FormattedTurn;

interface TranscriptCursor {
	executionId: string | null;
	turnId: string;
	part: TurnPart;
	offset: number;
	/** Digest of the part text before `offset`. */
	digest: string;
}

const INVALID_CURSOR: PreviewSessionContextPage = { ok: false, reason: 'invalid_cursor' };
const PAGE_END_MARKER = '\n[transcript continues on the next page]';
/** Each page carries at least this much transcript, so that reading always advances. */
const MIN_PAGE_BODY_CHARS = 2;

function digestPrefix(text: string, end: number): string {
	return createHash('sha256').update(text.slice(0, end)).digest('base64url');
}

// A cursor points into the header or the body of one turn, so it stays valid when later turns
// are appended. A turn that runs can still change, for example when a tool call completes. The
// digest detects a change before the offset, and the next page then starts that turn again.
function encodeCursor(cursor: TranscriptCursor): string {
	return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(cursor: string): TranscriptCursor | null {
	try {
		const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
		if (
			isRecord(parsed) &&
			(parsed.executionId === null || typeof parsed.executionId === 'string') &&
			typeof parsed.turnId === 'string' &&
			(parsed.part === 'header' || parsed.part === 'body') &&
			typeof parsed.offset === 'number' &&
			Number.isSafeInteger(parsed.offset) &&
			parsed.offset >= 0 &&
			typeof parsed.digest === 'string'
		) {
			return {
				executionId: parsed.executionId,
				turnId: parsed.turnId,
				part: parsed.part,
				offset: parsed.offset,
				digest: parsed.digest,
			};
		}
	} catch {
		// Reported to the caller as an invalid cursor.
	}
	return null;
}

/** Moves a page end back by one character so a surrogate pair is not split. */
function pageEnd(text: string, start: number, end: number): number {
	if (end >= text.length || end - start < 2) return end;
	const code = text.charCodeAt(end - 1);
	return code >= 0xd800 && code <= 0xdbff ? end - 1 : end;
}

/**
 * Format one page of the complete preview session transcript. Unlike
 * `formatPreviewSessionContext`, no value is truncated and no turn is left out:
 * the transcript is split into pages of at most `pageSize` characters, wrapper
 * included, and a single value larger than a page continues on the next page.
 * `nextCursor` is `null` on the last page. When a turn changed before the
 * cursor position, the next page starts that turn again. Values in the
 * timeline are already removed of secrets at record time.
 */
export function formatPreviewSessionContextPage(
	thread: AgentSessionThread,
	executions: AgentSessionTurn[],
	{
		executionId,
		cursor,
		pageSize = FULL_TRANSCRIPT_PAGE_CHARS,
	}: PreviewSessionContextPageOptions = {},
): PreviewSessionContextPage {
	const scoped = selectScope(executions, executionId);
	if (scoped === null) return { ok: false, reason: 'execution_not_found' };

	let turnIndex = 0;
	let part: TurnPart = 'header';
	let offset = 0;
	let turn: FormattedTurn | undefined;
	let startMarker = '';
	if (cursor !== undefined) {
		const position = decodeCursor(cursor);
		if (!position || position.executionId !== (executionId ?? null)) return INVALID_CURSOR;
		turnIndex = scoped.findIndex(({ id }) => id === position.turnId);
		if (turnIndex === -1) return INVALID_CURSOR;

		turn = formatTurn(scoped[turnIndex], FULL_LIMITS);
		const text = turn[position.part];
		const unchanged =
			position.offset <= text.length && digestPrefix(text, position.offset) === position.digest;
		if (unchanged) {
			part = position.part;
			offset = position.offset;
		}
		const turnLabel = `turn ${turnIndex + 1}`;
		if (!unchanged) {
			startMarker = `\n[continued from the previous page. ${turnLabel} changed after the previous page, so it starts again here]`;
		} else if (part === 'body' || offset > 0) {
			startMarker = `\n[continued from the previous page, inside ${turnLabel}]`;
		} else {
			startMarker = '\n[continued from the previous page]';
		}
	}

	const prefix = formatPrefix(thread, scoped.length, executionId, ', output: full');
	const closing = `\n${PREVIEW_CONTEXT_CLOSE_TAG}`;
	// Reserve the end marker on every page, because the last page is known only after the loop.
	let budget = Math.max(
		MIN_PAGE_BODY_CHARS,
		pageSize - prefix.length - startMarker.length - PAGE_END_MARKER.length - closing.length,
	);
	const parts: string[] = [];
	while (turnIndex < scoped.length) {
		turn ??= formatTurn(scoped[turnIndex], FULL_LIMITS);
		const text = turn[part];
		const remaining = text.length - offset;
		if (remaining <= budget) {
			parts.push(text.slice(offset));
			budget -= remaining;
			offset = 0;
			if (part === 'header') {
				part = 'body';
			} else {
				part = 'header';
				turnIndex++;
				turn = undefined;
			}
			continue;
		}
		if (budget > 0) {
			const end = pageEnd(text, offset, offset + budget);
			parts.push(text.slice(offset, end));
			offset = end;
		}
		break;
	}

	let nextCursor: string | null = null;
	if (turnIndex < scoped.length) {
		turn ??= formatTurn(scoped[turnIndex], FULL_LIMITS);
		nextCursor = encodeCursor({
			executionId: executionId ?? null,
			turnId: scoped[turnIndex].id,
			part,
			offset,
			digest: digestPrefix(turn[part], offset),
		});
	}
	const endMarker = nextCursor === null ? '' : PAGE_END_MARKER;
	const transcript = prefix + startMarker + parts.join('') + endMarker + closing;
	return { ok: true, transcript, nextCursor };
}
