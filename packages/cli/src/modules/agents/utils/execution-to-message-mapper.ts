import type { AgentPersistedMessageContentPart, AgentPersistedMessageDto } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentExecution } from '../entities/agent-execution.entity';
import type { TimelineEvent } from '../execution-recorder';
import { isFatalSessionOutcomeError } from './fatal-session-outcome';
import {
	isTerminalToolCallPart,
	isToolCallWithId,
	toolCallKey,
	type ToolCallContentPart,
} from './tool-call-parts';

type ExecutionTranscript = Pick<
	AgentExecution,
	| 'id'
	| 'userMessage'
	| 'author'
	| 'timeline'
	| 'attachments'
	| 'status'
	| 'error'
	| 'createdAt'
	| 'inputMessages'
>;

type ToolCallTimelineEvent = Extract<TimelineEvent, { type: 'tool-call' }>;
type ReasoningTimelineEvent = Extract<TimelineEvent, { type: 'reasoning' }>;
type SuspensionTimelineEvent = Extract<TimelineEvent, { type: 'suspension' }>;

function textPart(text: string): AgentPersistedMessageContentPart | null {
	if (!text.trim()) return null;
	return { type: 'text', text };
}

function toolCallState(event: ToolCallTimelineEvent): 'resolved' | 'rejected' | undefined {
	if (typeof event.endTime !== 'number' || event.endTime <= 0) return undefined;
	return event.success ? 'resolved' : 'rejected';
}

function mergeTerminalToolCallPart(
	previous: ToolCallContentPart,
	terminal: ToolCallContentPart,
): ToolCallContentPart {
	return {
		...previous,
		...terminal,
		input: previous.input ?? terminal.input,
		suspendPayload: previous.suspendPayload ?? terminal.suspendPayload,
		startTime: previous.startTime ?? terminal.startTime,
		endTime: terminal.endTime ?? previous.endTime,
		canceled: terminal.canceled ?? previous.canceled,
	};
}

function toolErrorMessage(output: unknown): string | undefined {
	const candidates = isRecord(output) ? [output.message, output.error] : [output];
	const text = candidates.find(
		(value): value is string => typeof value === 'string' && value.trim() !== '',
	);
	if (text !== undefined) return text;

	if (output === undefined || output === null) return undefined;

	try {
		return JSON.stringify(output);
	} catch {
		return String(output);
	}
}

function timelineToolCallToPart(event: ToolCallTimelineEvent): AgentPersistedMessageContentPart {
	const state = toolCallState(event);
	const base: AgentPersistedMessageContentPart = {
		type: 'tool-call',
		toolName: event.name,
		toolCallId: event.toolCallId,
		input: event.input,
		...(event.startTime > 0 ? { startTime: event.startTime } : {}),
		...(event.endTime > 0 ? { endTime: event.endTime } : {}),
		...(event.childTrace ? { childTrace: event.childTrace } : {}),
	};

	if (state === undefined) return base;
	if (state === 'resolved') {
		return {
			...base,
			state,
			output: event.output,
		};
	}

	return {
		...base,
		state,
		error: toolErrorMessage(event.output) ?? `Tool "${event.name}" failed`,
	};
}

function reasoningPart(event: ReasoningTimelineEvent): AgentPersistedMessageContentPart | null {
	if (!event.content.trim()) return null;
	return {
		type: 'reasoning',
		text: event.content,
		startTime: event.timestamp,
		...(event.endTime !== undefined && { endTime: event.endTime }),
	};
}

/** Puts the suspend payload on the latest call with the id, which is the call that suspended. */
function attachSuspendPayload(
	content: AgentPersistedMessageContentPart[],
	event: SuspensionTimelineEvent,
): void {
	const suspendedToolCall = content.findLast(
		(part): part is ToolCallContentPart =>
			isToolCallWithId(part) && part.toolCallId === event.toolCallId,
	);
	if (suspendedToolCall) {
		suspendedToolCall.suspendPayload = event.suspendPayload ?? event.input;
	}
}

function assistantContentFromExecution(
	execution: ExecutionTranscript,
): AgentPersistedMessageContentPart[] {
	const content: AgentPersistedMessageContentPart[] = [];

	for (const event of execution.timeline ?? []) {
		let part: AgentPersistedMessageContentPart | null = null;
		if (event.type === 'text') part = textPart(event.content);
		else if (event.type === 'reasoning') part = reasoningPart(event);
		else if (event.type === 'tool-call') part = timelineToolCallToPart(event);
		else if (event.type === 'suspension') attachSuspendPayload(content, event);
		if (part) content.push(part);
	}

	return content;
}

export function executionToMessagesDto(execution: ExecutionTranscript): AgentPersistedMessageDto[] {
	if (!execution.timeline?.some((event) => event.type === 'input')) {
		return executionSegmentToMessagesDto(execution);
	}
	const messages: AgentPersistedMessageDto[] = [];
	const steeredIds = new Set(
		execution.timeline.filter((event) => event.type === 'input').map((event) => event.messageId),
	);
	let segment: ExecutionTranscript = {
		...execution,
		inputMessages: execution.inputMessages?.filter(({ id }) => !steeredIds.has(id)),
		timeline: [],
	};
	let suffix = '';
	const appendSegment = (value: ExecutionTranscript) => {
		for (const message of executionSegmentToMessagesDto(value)) {
			if (message.role === 'assistant') message.id += suffix;
			messages.push(message);
		}
	};
	for (const event of execution.timeline) {
		if (event.type !== 'input') {
			segment.timeline?.push(event);
			continue;
		}
		appendSegment({ ...segment, status: 'success', error: null });
		const input = execution.inputMessages?.find(({ id }) => id === event.messageId);
		if (input) messages.push({ ...input, executionId: execution.id });
		suffix = `:${event.messageId}`;
		segment = {
			...execution,
			userMessage: null,
			attachments: null,
			author: null,
			inputMessages: [],
			timeline: [],
			createdAt: new Date(event.timestamp),
		};
	}
	appendSegment(segment);
	return messages;
}

function executionSegmentToMessagesDto(execution: ExecutionTranscript): AgentPersistedMessageDto[] {
	const messages = userMessagesOf(execution);
	const assistantMessage = assistantMessageOf(execution, assistantContentFromExecution(execution));
	if (assistantMessage) messages.push(assistantMessage);
	return messages;
}

/**
 * Canonical inputs keep their message IDs. Trace messages and legacy inputs
 * keep execution-based IDs and the execution timestamp. Use executionId to
 * identify the turn.
 */
function userMessagesOf(execution: ExecutionTranscript): AgentPersistedMessageDto[] {
	if (execution.inputMessages !== undefined) return [...execution.inputMessages];

	const userText = execution.userMessage === null ? null : textPart(execution.userMessage);
	const content: AgentPersistedMessageContentPart[] = userText ? [userText] : [];
	for (const attachment of execution.attachments ?? []) {
		content.push({
			type: 'file',
			fileId: attachment.id,
			fileName: attachment.fileName,
			mimeType: attachment.mimeType,
			sizeBytes: attachment.sizeBytes,
		});
	}
	if (content.length === 0) return [];

	return [
		{
			id: `${execution.id}:user`,
			role: 'user',
			content,
			...(execution.author ? { author: execution.author } : {}),
			executionId: execution.id,
			createdAt: execution.createdAt.toISOString(),
		},
	];
}

/**
 * The recorded run error travels with the transcript so history renders the
 * same error bubble the live stream showed — also when the turn failed before
 * producing any output at all (otherwise the run fails invisibly). It stays a
 * separate field, not a text part, so the client does not show it as model
 * output.
 */
function recordedRunError(execution: ExecutionTranscript): string | undefined {
	if (execution.status !== 'error' && execution.status !== 'interrupted') return undefined;
	if (!execution.error || isFatalSessionOutcomeError(execution.error, execution.timeline)) {
		return undefined;
	}
	return execution.error;
}

function assistantMessageOf(
	execution: ExecutionTranscript,
	content: AgentPersistedMessageContentPart[],
): AgentPersistedMessageDto | undefined {
	const backgroundJobSignal = execution.timeline?.find(
		(event) => event.type === 'background-task-signal',
	)?.signal;
	const executionError = recordedRunError(execution);
	if (!backgroundJobSignal && content.length === 0 && executionError === undefined) {
		return undefined;
	}

	return {
		id: `${execution.id}:assistant`,
		role: 'assistant',
		content,
		...(backgroundJobSignal ? { backgroundTaskSignal: backgroundJobSignal } : {}),
		executionId: execution.id,
		...(execution.status ? { executionStatus: execution.status } : {}),
		...(executionError !== undefined ? { executionError } : {}),
		createdAt: execution.createdAt.toISOString(),
	};
}

type AnswerAuthor = Pick<AgentPersistedMessageContentPart, 'approvedBy' | 'declinedBy'>;

interface RecordedAnswer {
	toolCallId: string;
	/** The position of the turn that the answer resumed, in the list of turns. */
	executionIndex: number;
	author: AnswerAuthor;
}

/** The answers that name who answered, in the order of the turns. */
function recordedAnswers(executions: ExecutionTranscript[]): RecordedAnswer[] {
	return executions.flatMap((execution, executionIndex) =>
		(execution.timeline ?? []).flatMap((event) => {
			if (event.type !== 'hitl-response' || !event.respondedBy) return [];
			const author = { id: event.respondedBy.id, name: event.respondedBy.name };
			const declined = isRecord(event.response) && event.response.approved === false;
			return [
				{
					toolCallId: event.toolCallId,
					executionIndex,
					author: declined ? { declinedBy: author } : { approvedBy: author },
				},
			];
		}),
	);
}

/**
 * The call that an answer is for: the latest call with the answer's id from a turn before the
 * answer. The answer starts the turn that resumes the call, so a call with the same id in that
 * turn or in a later turn is another call.
 */
function answeredToolCall(
	messages: AgentPersistedMessageDto[],
	executionIndexById: Map<string, number>,
	answer: RecordedAnswer,
): ToolCallContentPart | undefined {
	let answered: ToolCallContentPart | undefined;
	for (const message of messages) {
		const executionIndex =
			message.executionId === undefined ? undefined : executionIndexById.get(message.executionId);
		if (executionIndex === undefined || executionIndex >= answer.executionIndex) continue;
		answered =
			message.content.findLast(
				(part): part is ToolCallContentPart =>
					isToolCallWithId(part) && part.toolCallId === answer.toolCallId,
			) ?? answered;
	}
	return answered;
}

/** Marks each answered call with who answered it. A later answer to the same call wins. */
function applyAnswerAuthors(
	messages: AgentPersistedMessageDto[],
	executions: ExecutionTranscript[],
): void {
	const answers = recordedAnswers(executions);
	if (answers.length === 0) return;
	const executionIndexById = new Map(executions.map(({ id }, index) => [id, index]));
	const authorByCall = new Map<ToolCallContentPart, AnswerAuthor>();
	for (const answer of answers) {
		const call = answeredToolCall(messages, executionIndexById, answer);
		if (call) authorByCall.set(call, answer.author);
	}
	for (const [call, author] of authorByCall) Object.assign(call, author);
}

interface PartLocation {
	message: AgentPersistedMessageDto;
	partIndex: number;
}

function addLocation(
	locations: Map<AgentPersistedMessageDto, Set<number>>,
	{ message, partIndex }: PartLocation,
): void {
	const indexes = locations.get(message) ?? new Set<number>();
	indexes.add(partIndex);
	locations.set(message, indexes);
}

/**
 * Merges the result of a resumed tool call into the part that waited for it, and removes the
 * copy. A later part continues an earlier part only when both are the same call (same id and
 * same tool) and the earlier part still waits. A settled call does not settle again, so a later
 * part with the same identity is a new call and stays in the history.
 */
function settleResumedToolCalls(messages: AgentPersistedMessageDto[]): void {
	const waitingByKey = new Map<string, PartLocation>();
	const settledCopies = new Map<AgentPersistedMessageDto, Set<number>>();

	for (const message of messages) {
		for (const [partIndex, part] of message.content.entries()) {
			if (!isToolCallWithId(part)) continue;
			const key = toolCallKey(part);
			const waiting = waitingByKey.get(key);
			if (!waiting) {
				if (!isTerminalToolCallPart(part)) waitingByKey.set(key, { message, partIndex });
				continue;
			}
			// A second open part of a waiting call stays as it is.
			if (!isTerminalToolCallPart(part)) continue;

			const waitingPart = waiting.message.content[waiting.partIndex];
			if (isToolCallWithId(waitingPart)) {
				waiting.message.content[waiting.partIndex] = mergeTerminalToolCallPart(waitingPart, part);
			}
			waitingByKey.delete(key);
			addLocation(settledCopies, { message, partIndex });
		}
	}

	for (const [message, indexes] of settledCopies) {
		message.content = message.content.filter((_, index) => !indexes.has(index));
	}
}

export function executionsToMessagesDto(
	executions: ExecutionTranscript[],
): AgentPersistedMessageDto[] {
	const messages = executions.flatMap(executionToMessagesDto);
	settleResumedToolCalls(messages);
	applyAnswerAuthors(messages, executions);

	return messages.filter(
		(message) =>
			message.backgroundTaskSignal ||
			message.content.length > 0 ||
			message.executionError !== undefined,
	);
}
