import type { AgentPersistedMessageDto } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { createHash } from 'node:crypto';

import type { AgentSessionThread, AgentSessionTurn } from './agent-context.contracts';

type TimelineEvent = NonNullable<AgentSessionTurn['timeline']>[number];

/** Delimits the LLM-facing preview transcript block. */
export const PREVIEW_CONTEXT_OPEN_TAG = '<preview_session_context>';
export const PREVIEW_CONTEXT_CLOSE_TAG = '</preview_session_context>';

/** Maximum characters in one page of a full transcript. */
export const FULL_TRANSCRIPT_PAGE_CHARS = 100_000;

const MAX_BLOCK_CHARS = 100_000;
const TRUNCATION_FOOTER = '… [truncated]';

/** Per-value limits. `undefined` keeps every value complete. */
interface ValueLimits {
	text: number;
	toolValue: number;
}

const COMPACT_LIMITS: ValueLimits = { text: 4_000, toolValue: 2_000 };

function truncate(value: string, max: number | undefined): string {
	if (max === undefined || value.length <= max) return value;
	return value.slice(0, max) + TRUNCATION_FOOTER;
}

function truncateBlockToFit(value: string, max: number): string | null {
	if (max <= TRUNCATION_FOOTER.length) return null;
	if (value.length <= max) return value;
	return value.slice(0, max - TRUNCATION_FOOTER.length) + TRUNCATION_FOOTER;
}

function stringifyToolValue(value: unknown, limits: ValueLimits | undefined): string {
	if (value === undefined) return '(none)';
	let serialized: string;
	try {
		serialized = JSON.stringify(value) ?? 'undefined';
	} catch {
		serialized = String(value);
	}
	return truncate(serialized, limits?.toolValue);
}

function formatInput(message: AgentPersistedMessageDto, limits: ValueLimits | undefined): string {
	const text = message.content
		.flatMap((part) => {
			if (part.type === 'text') return [part.text];
			if (part.type === 'file') return [`[Attachment: ${part.fileName ?? part.fileId ?? 'file'}]`];
			return [];
		})
		.join('\n');
	return `User: ${truncate(text, limits?.text)}`;
}

function formatTimelineEvent(
	event: TimelineEvent,
	execution: AgentSessionTurn,
	limits: ValueLimits | undefined,
): string {
	if (event.type === 'input') {
		const message = execution.inputMessages?.find(({ id }) => id === event.messageId);
		return message ? formatInput(message, limits) : '';
	}
	if (event.type === 'background-task-signal') {
		return `Background task results received: ${stringifyToolValue(event.signal.tasks, limits)}`;
	}
	if (event.type === 'text') {
		return `Assistant: ${truncate(event.content, limits?.text)}`;
	}
	if (event.type === 'reasoning') {
		return `Reasoning: ${truncate(event.content, limits?.text)}`;
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

function formatExecution(execution: AgentSessionTurn, limits: ValueLimits | undefined): string {
	const headerParts = [`status=${execution.status}`];
	if (execution.model) headerParts.push(`model=${execution.model}`);
	headerParts.push(`duration=${execution.duration}ms`);
	if (execution.totalTokens !== null) headerParts.push(`tokens=${execution.totalTokens}`);
	if (execution.error) headerParts.push(`error=${execution.error}`);

	const lines = [`## Turn (${headerParts.join(', ')})`];
	if (execution.inputMessages !== undefined) {
		const steeredIds = new Set(
			execution.timeline?.filter((event) => event.type === 'input').map((event) => event.messageId),
		);
		for (const message of execution.inputMessages) {
			if (!steeredIds.has(message.id)) lines.push(formatInput(message, limits));
		}
	} else if (execution.userMessage !== null) {
		lines.push(`User: ${truncate(execution.userMessage, limits?.text)}`);
	}
	for (const event of execution.timeline ?? []) {
		const line = formatTimelineEvent(event, execution, limits);
		if (line) lines.push(line);
	}
	return lines.join('\n');
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

function scopeExecutions(
	executions: AgentSessionTurn[],
	executionId: string | undefined,
): AgentSessionTurn[] | null {
	return executionId === undefined ? executions : selectTurnExecutions(executions, executionId);
}

function formatPrefix(
	thread: AgentSessionThread,
	scoped: AgentSessionTurn[],
	executionId: string | undefined,
): string {
	const scopeLabel = executionId === undefined ? 'whole session' : 'single turn';
	const header =
		`Preview session transcript — title: ${thread.title ?? '(untitled)'}, ` +
		`session #${thread.sessionNumber}, scope: ${scopeLabel}, turns: ${scoped.length}`;

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
	const scoped = scopeExecutions(executions, executionId);
	if (scoped === null) return null;

	const prefix = formatPrefix(thread, scoped, executionId);
	const closing = `\n${PREVIEW_CONTEXT_CLOSE_TAG}`;
	const includedNewestFirst: string[] = [];
	let includedLength = 0;
	let boundaryTurn: string | null = null;
	let omittedEarlierTurns = 0;

	for (let i = scoped.length - 1; i >= 0; i--) {
		const formatted = `\n${formatExecution(scoped[i], COMPACT_LIMITS)}`;
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

export type FullSessionContextPage =
	| { ok: true; transcript: string; nextCursor: string | null }
	| { ok: false; reason: 'execution_not_found' | 'invalid_cursor' | 'session_changed' };

interface TranscriptCursor {
	/** The session that the cursor belongs to. */
	sessionId: string;
	/** The `executionId` scope that the cursor belongs to. */
	scope: string | null;
	/** The segment to continue in: `header`, `footer`, or `turn:<executionId>`. */
	segment: string;
	/** The character offset in the segment. */
	offset: number;
	/** Hash of the segment text. Detects a segment that changed between two calls. */
	hash: string;
}

function encodeTranscriptCursor(cursor: TranscriptCursor): string {
	return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeTranscriptCursor(cursor: string): TranscriptCursor | null {
	try {
		const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
		if (
			isRecord(parsed) &&
			typeof parsed.sessionId === 'string' &&
			(parsed.scope === null || typeof parsed.scope === 'string') &&
			typeof parsed.segment === 'string' &&
			typeof parsed.offset === 'number' &&
			Number.isSafeInteger(parsed.offset) &&
			parsed.offset >= 0 &&
			typeof parsed.hash === 'string'
		) {
			return {
				sessionId: parsed.sessionId,
				scope: parsed.scope,
				segment: parsed.segment,
				offset: parsed.offset,
				hash: parsed.hash,
			};
		}
	} catch {
		// Reported below as an invalid cursor.
	}
	return null;
}

function hashSegment(text: string): string {
	return createHash('sha256').update(text).digest('base64url').slice(0, 16);
}

/** Moves a slice end back by one when it would split a UTF-16 surrogate pair. */
function sliceEndOutsideSurrogatePair(value: string, end: number, start: number): number {
	if (end <= start || end >= value.length) return end;
	const code = value.charCodeAt(end - 1);
	return code >= 0xd800 && code <= 0xdbff ? end - 1 : end;
}

/**
 * Format one page of the complete preview session transcript. Values are not
 * truncated and no turn is left out. The full transcript is split into pages
 * of at most `maxChars` characters, so a single value can span many pages.
 * Concatenate the `transcript` of each page in order to get the complete
 * transcript. `nextCursor` is `null` on the last page.
 *
 * The cursor points at a turn by its execution ID, so turns that are added
 * to the session between two calls do not move the position. If the text at
 * the cursor position changed since the cursor was made, for example in a turn
 * that was still running, the result is `session_changed`. Only the turns from
 * the cursor to the end of the page are formatted.
 */
export function formatFullSessionContextPage(
	thread: AgentSessionThread,
	executions: AgentSessionTurn[],
	options: { executionId?: string; cursor?: string; maxChars?: number } = {},
): FullSessionContextPage {
	const { executionId, cursor, maxChars = FULL_TRANSCRIPT_PAGE_CHARS } = options;
	const scoped = scopeExecutions(executions, executionId);
	if (scoped === null) return { ok: false, reason: 'execution_not_found' };

	const keys = ['header', ...scoped.map((execution) => `turn:${execution.id}`), 'footer'];
	const formatSegment = (index: number): string => {
		if (index === 0) return formatPrefix(thread, scoped, executionId);
		if (index === keys.length - 1) return `\n${PREVIEW_CONTEXT_CLOSE_TAG}`;
		return `\n${formatExecution(scoped[index - 1], undefined)}`;
	};

	let index = 0;
	let offset = 0;
	let text = formatSegment(0);
	if (cursor !== undefined) {
		const decoded = decodeTranscriptCursor(cursor);
		if (
			decoded === null ||
			decoded.sessionId !== thread.id ||
			decoded.scope !== (executionId ?? null)
		) {
			return { ok: false, reason: 'invalid_cursor' };
		}
		index = keys.indexOf(decoded.segment);
		if (index === -1) return { ok: false, reason: 'invalid_cursor' };
		text = formatSegment(index);
		if (decoded.hash !== hashSegment(text)) return { ok: false, reason: 'session_changed' };
		if (decoded.offset >= text.length) return { ok: false, reason: 'invalid_cursor' };
		offset = decoded.offset;
	}

	let transcript = '';
	while (true) {
		const budget = maxChars - transcript.length;
		if (text.length - offset <= budget) {
			transcript += text.slice(offset);
			index++;
			offset = 0;
			if (index === keys.length) break;
			text = formatSegment(index);
			continue;
		}
		let end = sliceEndOutsideSurrogatePair(text, offset + budget, offset);
		// Always make progress on an empty page, even if that splits a surrogate pair.
		if (end === offset && transcript.length === 0) end = offset + budget;
		transcript += text.slice(offset, end);
		offset = end;
		break;
	}

	const nextCursor =
		index < keys.length
			? encodeTranscriptCursor({
					sessionId: thread.id,
					scope: executionId ?? null,
					segment: keys[index],
					offset,
					hash: hashSegment(text),
				})
			: null;
	return { ok: true, transcript, nextCursor };
}
