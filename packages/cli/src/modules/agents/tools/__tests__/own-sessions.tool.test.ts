import type { BuiltTool } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService, ThreadListItem } from '../../agent-execution.service';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../../entities/agent-execution.entity';
import { createOwnSessionsTools } from '../own-sessions.tool';

const projectId = 'project-1';
const agentId = 'agent-1';
const DEFAULT_SESSION_LIMIT = 20;
const MAX_TEXT_CHARS = 2000;
const MAX_TOTAL_TEXT_CHARS = 40_000;
const TRUNCATION_SUFFIX = '… [truncated]';

function buildTool(
	executionService: AgentExecutionService,
	toolName: 'list_own_sessions' | 'read_own_session',
): BuiltTool {
	const tool = createOwnSessionsTools({
		agentId,
		projectId,
		executionService,
	})
		.map((builder) => builder.build())
		.find((candidate) => candidate.name === toolName);

	if (!tool) {
		throw new Error(`Expected ${toolName} tool to be built`);
	}
	return tool;
}

function getToolHandler(tool: BuiltTool): NonNullable<BuiltTool['handler']> {
	if (!tool.handler) {
		throw new Error(`Expected ${tool.name} tool to have a handler`);
	}
	return tool.handler;
}

function thread(id: string, updatedAt: Date): ThreadListItem {
	return { id, createdAt: updatedAt, updatedAt } as ThreadListItem;
}

function execution(id: string, userMessage: string, assistantText: string): AgentExecution {
	return {
		id,
		userMessage,
		timeline: [{ type: 'text', content: assistantText, timestamp: 1 }],
	} as AgentExecution;
}

const callerResourceId = 'draft-chat:user-1';
const callerCtx = { persistence: { threadId: 'current-thread', resourceId: callerResourceId } };

const detailThread = {
	id: 't1',
	title: 'Session 1',
	sessionNumber: 1,
	createdAt: new Date('2024-01-01T00:00:00.000Z'),
	createdByResourceId: callerResourceId,
} as AgentExecutionThread;

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe('createOwnSessionsTools', () => {
	it('excludes sessions outside the requested time window', async () => {
		const executionService = mock<AgentExecutionService>();
		executionService.getThreads.mockResolvedValue({
			threads: [thread('recent', daysAgo(2)), thread('old', daysAgo(30))],
			nextCursor: null,
		});

		const result = (await getToolHandler(buildTool(executionService, 'list_own_sessions'))(
			{ sinceDays: 7 },
			callerCtx,
		)) as { sessions: Array<{ threadId: string }> };

		expect(result.sessions).toHaveLength(1);
		expect(result.sessions[0].threadId).toBe('recent');
	});

	it('queries threads scoped to the closure project and agent and the calling resource', async () => {
		const executionService = mock<AgentExecutionService>();
		executionService.getThreads.mockResolvedValue({ threads: [], nextCursor: null });

		await getToolHandler(buildTool(executionService, 'list_own_sessions'))({}, callerCtx);

		expect(executionService.getThreads).toHaveBeenCalledWith(
			projectId,
			agentId,
			DEFAULT_SESSION_LIMIT,
			undefined,
			callerResourceId,
		);
	});

	it.each(['list_own_sessions', 'read_own_session'] as const)(
		'refuses to read anything from %s when the run has no caller scope',
		async (toolName) => {
			const executionService = mock<AgentExecutionService>();

			const result = (await getToolHandler(buildTool(executionService, toolName))(
				{ threadId: 't1' },
				{},
			)) as { errorType: string };

			expect(result.errorType).toBe('NoCallerScope');
			expect(executionService.getThreads).not.toHaveBeenCalled();
			expect(executionService.getThreadDetail).not.toHaveBeenCalled();
		},
	);

	it.each([
		['another caller', 'draft-chat:user-2'],
		['nobody, predating attribution', null],
	])('hides a session created by %s behind the not-found answer', async (_case, createdBy) => {
		const executionService = mock<AgentExecutionService>();
		executionService.getThreadDetail.mockResolvedValue({
			thread: { ...detailThread, createdByResourceId: createdBy } as AgentExecutionThread,
			executions: [execution('e1', 'their question', 'their answer')],
		});

		const foreign = await getToolHandler(buildTool(executionService, 'read_own_session'))(
			{ threadId: 't1' },
			callerCtx,
		);

		const missingService = mock<AgentExecutionService>();
		missingService.getThreadDetail.mockResolvedValue(null);
		const missing = await getToolHandler(buildTool(missingService, 'read_own_session'))(
			{ threadId: 't1' },
			callerCtx,
		);

		expect(foreign).toEqual(missing);
	});

	it('returns a not-found error object when the thread detail is missing', async () => {
		const executionService = mock<AgentExecutionService>();
		executionService.getThreadDetail.mockResolvedValue(null);

		const result = (await getToolHandler(buildTool(executionService, 'read_own_session'))(
			{ threadId: 'other-agent-thread' },
			callerCtx,
		)) as { error: string; errorType: string };

		expect(result.errorType).toBe('NotFoundError');
		expect(result.error).toContain('other-agent-thread');
	});

	it('caps the number of returned messages and truncates long text', async () => {
		const executionService = mock<AgentExecutionService>();
		const longText = 'a'.repeat(MAX_TEXT_CHARS + 500);
		executionService.getThreadDetail.mockResolvedValue({
			thread: detailThread,
			executions: [
				execution('e1', 'first question', 'first answer'),
				execution('e2', 'second question', longText),
			],
		});

		const result = (await getToolHandler(buildTool(executionService, 'read_own_session'))(
			{ threadId: 't1', maxMessages: 2 },
			callerCtx,
		)) as { messageCount: number; truncated: boolean; messages: Array<{ text?: string }> };

		expect(result.messages).toHaveLength(2);
		expect(result.truncated).toBe(true);
		expect(result.messageCount).toBe(4);
		expect(result.messages[1].text).toBe(`${'a'.repeat(MAX_TEXT_CHARS)}${TRUNCATION_SUFFIX}`);
	});

	it('reports an unfinished tool call as incomplete rather than successful', async () => {
		const executionService = mock<AgentExecutionService>();
		executionService.getThreadDetail.mockResolvedValue({
			thread: detailThread,
			executions: [
				{
					id: 'e1',
					userMessage: 'do the thing',
					timeline: [
						{
							type: 'tool-call',
							kind: 'tool',
							name: 'never_finished',
							toolCallId: 'call-1',
							input: {},
							output: undefined,
							startTime: 1,
							endTime: 0,
							success: false,
						},
						{
							type: 'tool-call',
							kind: 'tool',
							name: 'finished',
							toolCallId: 'call-2',
							input: {},
							output: 'done',
							startTime: 1,
							endTime: 2,
							success: true,
						},
					],
				} as AgentExecution,
			],
		});

		const result = (await getToolHandler(buildTool(executionService, 'read_own_session'))(
			{ threadId: 't1' },
			callerCtx,
		)) as { messages: Array<{ toolCalls?: Array<{ name: string; status: string }> }> };

		const toolCalls = result.messages.at(-1)?.toolCalls;
		expect(toolCalls).toEqual([
			{ name: 'never_finished', status: 'incomplete' },
			{ name: 'finished', status: 'ok' },
		]);
	});

	it('drops the oldest messages once the aggregate text budget is spent', async () => {
		const executionService = mock<AgentExecutionService>();
		executionService.getThreadDetail.mockResolvedValue({
			thread: detailThread,
			executions: Array.from({ length: 30 }, (_, index) =>
				execution(`e${index}`, `question ${index}`, `e${index}:${'a'.repeat(MAX_TEXT_CHARS)}`),
			),
		});

		const result = (await getToolHandler(buildTool(executionService, 'read_own_session'))(
			{ threadId: 't1', maxMessages: 100 },
			callerCtx,
		)) as { messageCount: number; truncated: boolean; messages: Array<{ text?: string }> };

		const totalChars = result.messages.reduce(
			(sum, message) => sum + (message.text?.length ?? 0),
			0,
		);

		expect(result.messageCount).toBe(60);
		expect(result.messages.length).toBeLessThan(result.messageCount);
		expect(totalChars).toBeLessThanOrEqual(MAX_TOTAL_TEXT_CHARS);
		expect(result.truncated).toBe(true);
		expect(result.messages.at(-1)?.text?.startsWith('e29:')).toBe(true);
	});

	it('charges tool calls against the aggregate budget when a message has no text', async () => {
		const executionService = mock<AgentExecutionService>();
		const failingCall = (executionId: string, callIndex: number) => ({
			type: 'tool-call',
			kind: 'tool',
			name: 'failing_tool',
			toolCallId: `${executionId}-call-${callIndex}`,
			input: {},
			output: 'x'.repeat(500),
			startTime: 1,
			endTime: 2,
			success: false,
		});
		executionService.getThreadDetail.mockResolvedValue({
			thread: detailThread,
			executions: Array.from(
				{ length: 100 },
				(_, index) =>
					({
						id: `e${index}`,
						userMessage: '',
						timeline: [failingCall(`e${index}`, 0), failingCall(`e${index}`, 1)],
					}) as AgentExecution,
			),
		});

		const result = (await getToolHandler(buildTool(executionService, 'read_own_session'))(
			{ threadId: 't1', maxMessages: 100 },
			callerCtx,
		)) as {
			messageCount: number;
			truncated: boolean;
			messages: Array<{ toolCalls?: unknown[] }>;
		};

		expect(result.messageCount).toBe(100);
		expect(result.messages.length).toBeLessThan(result.messageCount);
		expect(result.truncated).toBe(true);
	});
});
