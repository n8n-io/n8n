import type { AgentPersistedMessageDto } from '@n8n/api-types';
import { createHash } from 'node:crypto';

import type { AgentSessionThread, AgentSessionTurn } from './agent-context.contracts';

type TimelineEvent = NonNullable<AgentSessionTurn['timeline']>[number];

/** Delimits the LLM-facing preview transcript block. */
export const PREVIEW_CONTEXT_OPEN_TAG = '<preview_session_context>';
export const PREVIEW_CONTEXT_CLOSE_TAG = '</preview_session_context>';

const MAX_TEXT_CHARS = 4_000;
const MAX_TOOL_VALUE_CHARS = 2_000;
const MAX_BLOCK_CHARS = 100_000;
const TRUNCATION_FOOTER = '… [truncated]';
const TRANSCRIPT_PAGE_CHARS = 50_000;
const TURN_START = '\n## Turn (';

interface ValueLimits {
	text: number;
	toolValue: number;
}

const COMPACT_LIMITS: ValueLimits = { text: MAX_TEXT_CHARS, toolValue: MAX_TOOL_VALUE_CHARS };

function truncate(value: string, max: number): string {
	if (value.length <= max) return value;
	return value.slice(0, max) + TRUNCATION_FOOTER;
}

function truncateBlockToFit(value: string, max: number): string | null {
	if (max <= TRUNCATION_FOOTER.length) return null;
	if (value.length <= max) return value;
	return value.slice(0, max - TRUNCATION_FOOTER.length) + TRUNCATION_FOOTER;
}

function stringifyToolValue(value: unknown, max: number): string {
	if (value === undefined) return '(none)';
	let serialized: string;
	try {
		serialized = JSON.stringify(value) ?? 'undefined';
	} catch {
		serialized = String(value);
	}
	return truncate(serialized, max);
}

function formatInput(message: AgentPersistedMessageDto, maxChars: number): string {
	const text = message.content
		.flatMap((part) => {
			if (part.type === 'text') return [part.text];
			if (part.type === 'file') return [`[Attachment: ${part.fileName ?? part.fileId ?? 'file'}]`];
			return [];
		})
		.join('\n');
	return `User: ${truncate(text, maxChars)}`;
}

function formatTimelineEvent(
	event: TimelineEvent,
	execution: AgentSessionTurn,
	limits: ValueLimits,
): string {
	if (event.type === 'input') {
		const message = execution.inputMessages?.find(({ id }) => id === event.messageId);
		return message ? formatInput(message, limits.text) : '';
	}
	if (event.type === 'background-task-signal') {
		return `Background task results received: ${stringifyToolValue(event.signal.tasks, limits.toolValue)}`;
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
		return `Human response: ${stringifyToolValue(event.response, limits.toolValue)}`;
	}
	if (event.type === 'guardrail') {
		return `[stopped by guardrail ${event.code}]`;
	}
	if (event.type === 'host-event') {
		return `Host event ${event.name}: ${stringifyToolValue(event.payload, limits.toolValue)}`;
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
	if (limits.toolValue === 0) return headerParts.join(' | ');
	return [
		headerParts.join(' | '),
		`  Input: ${stringifyToolValue(event.input, limits.toolValue)}`,
		`  Output: ${stringifyToolValue(event.output, limits.toolValue)}`,
	].join('\n');
}

function formatExecution(execution: AgentSessionTurn, limits: ValueLimits): string {
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
			if (!steeredIds.has(message.id)) lines.push(formatInput(message, limits.text));
		}
	} else if (execution.userMessage !== null) {
		lines.push(`User: ${truncate(execution.userMessage, limits.text)}`);
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

function selectScope(
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
	const scoped = selectScope(executions, executionId);
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

interface AgentSessionTranscriptPageOptions {
	executionId?: string;
	maxToolValueLength?: number;
	cursor?: string;
	pageSize?: number;
}

export type AgentSessionTranscriptPage =
	| { ok: true; transcript: string; nextCursor: string | null }
	| { ok: false; reason: 'execution_not_found' | 'invalid_cursor' };

function digestOf(text: string): string {
	return createHash('sha256').update(text).digest('base64url');
}

function isHighSurrogate(code: number): boolean {
	return code >= 0xd800 && code <= 0xdbff;
}

function findPageEnd(transcript: string, start: number, pageSize: number): number {
	const end = start + pageSize;
	if (end >= transcript.length) return transcript.length;
	const lastTurnStart = transcript.lastIndexOf(TURN_START, end);
	if (lastTurnStart > start + pageSize / 2) return lastTurnStart;
	return isHighSurrogate(transcript.charCodeAt(end - 1)) ? end - 1 : end;
}

function findPageStart(transcript: string, cursor: string): number | null {
	const match = /^(\d+)\.([\w-]+)$/.exec(cursor);
	if (!match) return null;
	const start = Number(match[1]);
	if (start === 0 || start >= transcript.length) return null;
	return digestOf(transcript.slice(0, start)) === match[2] ? start : null;
}

/**
 * Format one page of an Agent session transcript. Text is complete and each
 * tool value is cut at `maxToolValueLength`; 0 leaves tool values out. No turn
 * is left out: the pages joined in order give the complete transcript. A page
 * ends before a turn when the page stays at least half full. The cursor carries
 * a digest of the text before it, so a cursor from a session that changed since
 * is rejected.
 */
export function formatAgentSessionTranscriptPage(
	thread: AgentSessionThread,
	executions: AgentSessionTurn[],
	{
		executionId,
		maxToolValueLength = MAX_TOOL_VALUE_CHARS,
		cursor,
		pageSize = TRANSCRIPT_PAGE_CHARS,
	}: AgentSessionTranscriptPageOptions = {},
): AgentSessionTranscriptPage {
	const scoped = selectScope(executions, executionId);
	if (scoped === null) return { ok: false, reason: 'execution_not_found' };

	const limits: ValueLimits = { text: Number.POSITIVE_INFINITY, toolValue: maxToolValueLength };
	const transcript =
		formatPrefix(thread, scoped, executionId) +
		scoped.map((execution) => `\n${formatExecution(execution, limits)}`).join('') +
		`\n${PREVIEW_CONTEXT_CLOSE_TAG}`;

	const start = cursor === undefined ? 0 : findPageStart(transcript, cursor);
	if (start === null) return { ok: false, reason: 'invalid_cursor' };

	const end = findPageEnd(transcript, start, pageSize);
	const nextCursor =
		end < transcript.length ? `${end}.${digestOf(transcript.slice(0, end))}` : null;
	return { ok: true, transcript: transcript.slice(start, end), nextCursor };
}
