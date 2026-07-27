import { Tool } from '@n8n/agents/tool';
import type { AgentPersistedMessageDto } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import { z } from 'zod';

import type { AgentExecutionService } from '../agent-execution.service';
import { runToolOperation } from './tool-error';
import { executionsToMessagesDto } from '../utils/execution-to-message-mapper';

const DEFAULT_SINCE_DAYS = 7;
const MAX_SINCE_DAYS = 90;
const DEFAULT_SESSION_LIMIT = 20;
const MAX_SESSION_LIMIT = 50;
const DEFAULT_MAX_MESSAGES = 40;
const MAX_MESSAGES_LIMIT = 100;
const MAX_TEXT_CHARS = 2000;
const MAX_TOTAL_TEXT_CHARS = 40_000;
const FIRST_MESSAGE_PREVIEW_CHARS = 200;
const TOOL_ERROR_PREVIEW_CHARS = 200;
const TRUNCATION_SUFFIX = '… [truncated]';

/**
 * A run backed by memory always carries the caller's `resourceId`; without one
 * there is nobody to scope the read to, so the tools refuse rather than falling
 * back to the whole agent.
 */
const NO_CALLER_SCOPE = {
	error: 'This run has no caller scope, so past sessions are not accessible.',
	errorType: 'NoCallerScope',
};

function truncate(text: string, maxChars: number) {
	return text.length > maxChars ? `${text.slice(0, maxChars)}${TRUNCATION_SUFFIX}` : text;
}

function toSessionMessage(message: AgentPersistedMessageDto) {
	const text = message.content
		.filter((part) => part.type === 'text')
		.map((part) => part.text ?? '')
		.join('\n');
	const toolCalls = message.content
		.filter((part) => part.type === 'tool-call')
		.map((part) => ({
			name: part.toolName ?? 'unknown',
			status:
				part.state === 'resolved' ? 'ok' : part.state === 'rejected' ? 'failed' : 'incomplete',
			...(part.error ? { error: part.error.slice(0, TOOL_ERROR_PREVIEW_CHARS) } : {}),
		}));

	return {
		textTruncated: text.length > MAX_TEXT_CHARS,
		message: {
			role: message.role,
			...(text ? { text: truncate(text, MAX_TEXT_CHARS) } : {}),
			...(toolCalls.length > 0 ? { toolCalls } : {}),
		},
	};
}

export function createOwnSessionsTools({
	agentId,
	projectId,
	executionService,
}: {
	agentId: string;
	projectId: string;
	executionService: AgentExecutionService;
}) {
	const listTool = new Tool('list_own_sessions')
		.description(
			"Lists this agent's past sessions with the current caller, newest first. Only sessions from the same user or scope as this conversation are visible. Returns session ids and metadata only — call read_own_session to read a transcript.",
		)
		.input(
			z.object({
				sinceDays: z
					.number()
					.int()
					.min(1)
					.max(MAX_SINCE_DAYS)
					.optional()
					.describe('Only include sessions active within this many days. Defaults to 7.'),
				limit: z
					.number()
					.int()
					.min(1)
					.max(MAX_SESSION_LIMIT)
					.optional()
					.describe('Maximum number of sessions to return. Defaults to 20.'),
			}),
		)
		.handler(async (input, ctx) => {
			const resourceId = ctx.persistence?.resourceId;
			if (!resourceId) return NO_CALLER_SCOPE;

			return await runToolOperation(async () => {
				const limit = input.limit ?? DEFAULT_SESSION_LIMIT;
				const sinceDays = input.sinceDays ?? DEFAULT_SINCE_DAYS;
				const cutoff = new Date(Date.now() - sinceDays * Time.days.toMilliseconds);

				const { threads, nextCursor } = await executionService.getThreads(
					projectId,
					agentId,
					limit,
					undefined,
					resourceId,
				);

				const sessions = threads
					.filter((thread) => thread.updatedAt.getTime() >= cutoff.getTime())
					.map((thread) => ({
						threadId: thread.id,
						title: thread.title,
						sessionNumber: thread.sessionNumber,
						taskId: thread.taskId,
						startedAt: thread.createdAt.toISOString(),
						lastActiveAt: thread.updatedAt.toISOString(),
						firstMessage: thread.firstMessage
							? truncate(thread.firstMessage, FIRST_MESSAGE_PREVIEW_CHARS)
							: null,
						totalCost: thread.totalCost,
						durationMs: thread.totalDuration,
					}));

				return {
					sessions,
					sinceDays,
					hasMore: nextCursor !== null && sessions.length === threads.length,
				};
			});
		});

	const readTool = new Tool('read_own_session')
		.description(
			"Reads the message transcript of one of this agent's past sessions with the current caller. Get a threadId from list_own_sessions first. Long transcripts are truncated.",
		)
		.input(
			z.object({
				threadId: z.string().min(1).describe('Session id from list_own_sessions.'),
				maxMessages: z
					.number()
					.int()
					.min(1)
					.max(MAX_MESSAGES_LIMIT)
					.optional()
					.describe('Maximum number of messages to return, most recent last. Defaults to 40.'),
			}),
		)
		.handler(async (input, ctx) => {
			const resourceId = ctx.persistence?.resourceId;
			if (!resourceId) return NO_CALLER_SCOPE;

			return await runToolOperation(async () => {
				const detail = await executionService.getThreadDetail(input.threadId, projectId, agentId);
				// A session belonging to someone else — or to nobody, for threads
				// predating attribution — reads as missing, so the answer never
				// reveals that the id exists.
				if (detail === null || detail.thread.createdByResourceId !== resourceId) {
					return {
						error: `Session "${input.threadId}" not found`,
						errorType: 'NotFoundError',
					};
				}

				const allMessages = executionsToMessagesDto(detail.executions);
				const kept = allMessages.slice(-(input.maxMessages ?? DEFAULT_MAX_MESSAGES));

				const selected: Array<ReturnType<typeof toSessionMessage>['message']> = [];
				let remainingChars = MAX_TOTAL_TEXT_CHARS;
				let textTruncated = false;
				for (let i = kept.length - 1; i >= 0; i--) {
					const mapped = toSessionMessage(kept[i]);
					const cost = JSON.stringify(mapped.message).length;
					if (cost > remainingChars && selected.length > 0) break;
					remainingChars -= cost;
					textTruncated ||= mapped.textTruncated;
					selected.unshift(mapped.message);
				}

				return {
					threadId: detail.thread.id,
					title: detail.thread.title,
					sessionNumber: detail.thread.sessionNumber,
					startedAt: detail.thread.createdAt.toISOString(),
					messageCount: allMessages.length,
					truncated: allMessages.length > selected.length || textTruncated,
					messages: selected,
				};
			});
		});

	return [listTool, readTool];
}
