import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../../entities/agent-execution.entity';
import type { TimelineEvent } from '../../execution-recorder';
import {
	formatPreviewSessionContext,
	PREVIEW_CONTEXT_CLOSE_TAG,
	PREVIEW_CONTEXT_OPEN_TAG,
} from '../format-preview-context';

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'thread-1',
		title: 'Support triage test',
		sessionNumber: 3,
		...overrides,
	} as AgentExecutionThread;
}

function makeExecution(overrides: Partial<AgentExecution> = {}): AgentExecution {
	return {
		id: 'exec-1',
		threadId: 'thread-1',
		status: 'success',
		userMessage: 'Hello agent',
		model: 'gpt-test',
		duration: 1200,
		totalTokens: 42,
		error: null,
		timeline: [],
		...overrides,
	} as AgentExecution;
}

function toolCallEvent(overrides: Partial<Extract<TimelineEvent, { type: 'tool-call' }>> = {}) {
	return {
		type: 'tool-call' as const,
		kind: 'tool' as const,
		name: 'search_orders',
		toolCallId: 'tc-1',
		input: { query: 'open orders' },
		output: { count: 2 },
		startTime: 1000,
		endTime: 1500,
		success: true,
		...overrides,
	};
}

describe('formatPreviewSessionContext', () => {
	it('formats a whole session with user messages, tool calls, and delimiter tags', () => {
		const executions = [
			makeExecution({
				id: 'exec-1',
				userMessage: 'First question',
				timeline: [
					toolCallEvent(),
					{ type: 'text', content: 'Here are your orders.', timestamp: 1, endTime: 2 },
				],
			}),
			makeExecution({ id: 'exec-2', userMessage: 'Second question' }),
		];

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).not.toBeNull();
		expect(block!.startsWith(PREVIEW_CONTEXT_OPEN_TAG)).toBe(true);
		expect(block!.endsWith(PREVIEW_CONTEXT_CLOSE_TAG)).toBe(true);
		expect(block).toContain('Support triage test');
		expect(block).toContain('scope: whole session, turns: 2');
		expect(block).toContain('User: First question');
		expect(block).toContain('User: Second question');
		expect(block).toContain('Tool call: search_orders | kind=tool | succeeded | 500ms');
		expect(block).toContain('Input: {"query":"open orders"}');
		expect(block).toContain('Output: {"count":2}');
		expect(block).toContain('Assistant: Here are your orders.');
	});

	it('scopes a single turn to the anchor plus trailing resume continuations', () => {
		const executions = [
			makeExecution({ id: 'exec-1', userMessage: 'Turn one' }),
			makeExecution({ id: 'exec-2', userMessage: null, hitlStatus: 'resumed' }),
			makeExecution({ id: 'exec-3', userMessage: 'Turn two' }),
		];

		const block = formatPreviewSessionContext(makeThread(), executions, 'exec-1');

		expect(block).toContain('scope: single turn, turns: 2');
		expect(block).toContain('User: Turn one');
		expect(block).not.toContain('Turn two');
	});

	it('returns null for an unknown executionId', () => {
		expect(formatPreviewSessionContext(makeThread(), [makeExecution()], 'missing')).toBeNull();
	});

	it('truncates oversized tool outputs', () => {
		const executions = [
			makeExecution({
				timeline: [toolCallEvent({ output: { blob: 'x'.repeat(5_000) } })],
			}),
		];

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).toContain('… [truncated]');
		expect(block).not.toContain('x'.repeat(3_000));
	});

	it('renders suspension events and execution errors', () => {
		const executions = [
			makeExecution({
				status: 'error',
				error: 'boom',
				timeline: [
					{ type: 'suspension', toolName: 'ask_question', toolCallId: 'tc-9', timestamp: 5 },
				],
			}),
		];

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).toContain('[suspended waiting on ask_question]');
		expect(block).toContain('error=boom');
	});

	it('omits turns beyond the whole-block cap and reports the omission', () => {
		const bigText = 'y'.repeat(3_900);
		const executions = Array.from({ length: 40 }, (_, i) =>
			makeExecution({
				id: `exec-${i}`,
				userMessage: bigText,
			}),
		);

		const block = formatPreviewSessionContext(makeThread(), executions);

		expect(block).toMatch(/\[transcript truncated: \d+ later turns omitted\]/);
		expect(block!.length).toBeLessThan(120_000);
	});
});
