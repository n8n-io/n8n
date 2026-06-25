import { expect, it } from 'vitest';

import { chunksOfType, collectStreamChunks, collectTextDeltas, describeIf } from './helpers';
import {
	Agent,
	AgentEvent,
	createDelegateSubAgentTool,
	filterLlmMessages,
	type AgentEventData,
	type AgentMessage,
} from '../../index';

const describe = describeIf('anthropic');

const SENTINEL = 'SUBAGENT_OK_731';

describe('delegate_subagent integration', () => {
	it('lets a real parent agent call delegate_subagent and use its result', async () => {
		const delegateTool = createDelegateSubAgentTool({
			policy: { maxChildren: 1 },
			toModelOutput: (output) => {
				// Keep the recorded provider request stable while preserving the runtime output.
				const { threadId, runId, ...rest } = output;
				return rest;
			},
		});

		const parent = new Agent('sub-agent-parent-integration')
			.model('anthropic/claude-sonnet-4-5')
			.instructions(
				[
					'You are a parent test agent.',
					'This is a delegation wiring test: you must call delegate_subagent exactly once before answering.',
					'Treat the child task as a bounded independent workstream that only the child should complete.',
					'Set subAgentId to "inline" in that tool call.',
					'The child result will contain a sentinel token.',
					'After the tool returns, answer with PARENT_SAW and include the sentinel token from the child result. Do not add unrelated text.',
				].join(' '),
			)
			.tool(delegateTool);

		try {
			const result = await parent.generate(
				`Complete this two-part verification task. Delegate the token-production workstream to a child agent, and make the delegated goal instruct the child to answer with exactly this token and nothing else: ${SENTINEL}. Then synthesize only from the child result.`,
			);
			expect(result.toolCalls?.map((toolCall) => toolCall.tool) ?? []).toContain(
				'delegate_subagent',
			);
			const parentAnswer = lastText(result.messages);
			expect(parentAnswer).toContain('PARENT_SAW');
			expect(parentAnswer).toContain(SENTINEL);

			const delegateToolCall = result.toolCalls?.find(
				(toolCall) => toolCall.tool === 'delegate_subagent',
			);
			const delegateOutput = delegateToolCall?.output;
			if (!isDelegateOutput(delegateOutput)) {
				throw new Error('delegate_subagent did not return the expected output shape');
			}

			expect(delegateOutput.status).toBe('completed');
			expect(delegateOutput.runId).toBeDefined();
			expect(delegateOutput.answer).toContain(SENTINEL);
			expect(delegateOutput.usage?.totalTokens).toBeGreaterThan(0);
			expect(delegateOutput.taskPath).toMatch(/^\/root\/[a-z0-9_]+$/);
		} finally {
			await parent.close();
		}
	}, 60_000);

	it('stream emits sub-agent lifecycle chunks and events', async () => {
		const delegateTool = createDelegateSubAgentTool({
			policy: { maxChildren: 1 },
			toModelOutput: (output) => {
				const { threadId, runId, ...rest } = output;
				return rest;
			},
		});
		const events: AgentEventData[] = [];

		const parent = new Agent('sub-agent-parent-stream-integration')
			.model('anthropic/claude-sonnet-4-5')
			.instructions(
				[
					'You are a parent streaming test agent.',
					'You must call delegate_subagent exactly once before answering.',
					'Set subAgentId to "inline" in that tool call.',
					'The child result will contain a sentinel token.',
					'After the tool returns, answer with PARENT_STREAM_SAW and include the sentinel token from the child result. Do not add unrelated text.',
				].join(' '),
			)
			.tool(delegateTool);

		parent.on(AgentEvent.SubAgentStarted, (event) => events.push(event));
		parent.on(AgentEvent.SubAgentCompleted, (event) => events.push(event));

		try {
			const { stream } = await parent.stream(
				`Delegate the token-production workstream to a child agent. The delegated goal must instruct the child to answer with exactly this token and nothing else: ${SENTINEL}. Then synthesize only from the child result.`,
			);
			const chunks = await collectStreamChunks(stream);

			const startedChunks = chunksOfType(chunks, 'subagent-started');
			const completedChunks = chunksOfType(chunks, 'subagent-completed');
			expect(startedChunks).toHaveLength(1);
			expect(completedChunks).toHaveLength(1);

			const startedEvents = events.filter((event) => event.type === AgentEvent.SubAgentStarted);
			const completedEvents = events.filter((event) => event.type === AgentEvent.SubAgentCompleted);
			expect(startedEvents).toHaveLength(1);
			expect(completedEvents).toHaveLength(1);

			const completed = completedChunks[0];
			expect(completed.status).toBe('completed');
			expect(completed.taskPath).toMatch(/^\/root\/[a-z0-9_]+$/);

			const delegateResult = chunksOfType(chunks, 'tool-result').find(
				(chunk) => chunk.toolName === 'delegate_subagent',
			);
			if (!isDelegateOutput(delegateResult?.output)) {
				throw new Error('delegate_subagent stream result did not return the expected output shape');
			}
			expect(delegateResult.output.status).toBe('completed');
			expect(delegateResult.output.answer).toContain(SENTINEL);

			const parentAnswer = collectTextDeltas(chunks);
			expect(parentAnswer).toContain('PARENT_STREAM_SAW');
			expect(parentAnswer).toContain(SENTINEL);
		} finally {
			await parent.close();
		}
	}, 60_000);
});

function lastText(messages: AgentMessage[]): string {
	const llmMessages = filterLlmMessages(messages);
	for (let i = llmMessages.length - 1; i >= 0; i--) {
		const message = llmMessages[i];
		if (!message) continue;

		const text = message.content.find((content) => content.type === 'text');
		if (text?.type === 'text') return text.text;
	}

	return '';
}

function isDelegateOutput(value: unknown): value is {
	status: 'completed' | 'failed' | 'suspended';
	taskPath: string;
	runId?: string;
	answer: string;
	usage: { totalTokens: number };
} {
	return (
		typeof value === 'object' &&
		value !== null &&
		'status' in value &&
		'taskPath' in value &&
		'answer' in value &&
		'usage' in value
	);
}
