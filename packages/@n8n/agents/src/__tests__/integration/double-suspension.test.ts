import { expect, it } from 'vitest';

import {
	collectStreamChunks,
	chunksOfType,
	createAgentWithDoubleSuspendTool,
	describeIf,
} from './helpers';
import type { StreamChunk } from './helpers';

const describe = describeIf('anthropic');

describe('double suspension integration', () => {
	it('generate: tool suspends twice then completes on second resume', async () => {
		const { agent, handlerCalls } = createAgentWithDoubleSuspendTool('anthropic');

		// 1. Initial call → tool suspends (step 1)
		const first = await agent.generate('Deploy the app "my-service"');

		expect(first.finishReason).toBe('tool-calls');
		expect(first.pendingSuspend).toHaveLength(1);
		expect(first.pendingSuspend![0].toolName).toBe('deploy_app');
		expect(first.pendingSuspend![0].suspendPayload).toEqual(expect.objectContaining({ step: 1 }));
		expect(handlerCalls()).toBe(1);

		const { runId, toolCallId } = first.pendingSuspend![0];

		// 2. First resume (approved) → tool re-suspends (step 2)
		const second = await agent.resume('generate', { confirmed: true }, { runId, toolCallId });

		expect(second.finishReason).toBe('tool-calls');
		expect(second.pendingSuspend).toHaveLength(1);
		expect(second.pendingSuspend![0].toolCallId).toBe(toolCallId);
		expect(second.pendingSuspend![0].suspendPayload).toEqual(expect.objectContaining({ step: 2 }));
		expect(handlerCalls()).toBe(2);

		// 3. Second resume (approved) → tool completes, LLM responds
		const third = await agent.resume(
			'generate',
			{ confirmed: true },
			{ runId: second.pendingSuspend![0].runId, toolCallId },
		);

		expect(third.finishReason).toBe('stop');
		expect(third.pendingSuspend).toBeUndefined();
		expect(handlerCalls()).toBe(3);

		const hasText = third.messages.some(
			(m) =>
				'role' in m &&
				m.role === 'assistant' &&
				'content' in m &&
				m.content.some((c) => c.type === 'text'),
		);
		expect(hasText).toBe(true);
	});

	it('generate: tool suspends twice, denial on second resume completes without deploying', async () => {
		const { agent, handlerCalls } = createAgentWithDoubleSuspendTool('anthropic');

		const first = await agent.generate('Deploy the app "risky-service"');
		expect(first.pendingSuspend).toHaveLength(1);

		const { runId, toolCallId } = first.pendingSuspend![0];

		// First resume: approve step 1 → re-suspends at step 2
		const second = await agent.resume('generate', { confirmed: true }, { runId, toolCallId });
		expect(second.pendingSuspend).toHaveLength(1);

		// Second resume: deny step 2 → tool returns deployed: false
		const third = await agent.resume(
			'generate',
			{ confirmed: false },
			{ runId: second.pendingSuspend![0].runId, toolCallId },
		);

		expect(third.finishReason).toBe('stop');
		expect(third.pendingSuspend).toBeUndefined();
		expect(handlerCalls()).toBe(3);
	});

	it('stream: tool suspends twice then completes on second resume', async () => {
		const { agent, handlerCalls } = createAgentWithDoubleSuspendTool('anthropic');

		// 1. Initial stream → tool suspends (step 1)
		const { stream: stream1 } = await agent.stream('Deploy the app "stream-service"');
		const chunks1 = await collectStreamChunks(stream1);

		const suspended1 = chunksOfType(chunks1, 'tool-call-suspended');
		expect(suspended1).toHaveLength(1);

		const s1 = suspended1[0] as StreamChunk & { type: 'tool-call-suspended' };
		expect(s1.toolName).toBe('deploy_app');
		expect(s1.suspendPayload).toEqual(expect.objectContaining({ step: 1 }));
		expect(handlerCalls()).toBe(1);

		// 2. First resume → tool re-suspends (step 2)
		const { stream: stream2 } = await agent.resume(
			'stream',
			{ confirmed: true },
			{ runId: s1.runId, toolCallId: s1.toolCallId },
		);
		const chunks2 = await collectStreamChunks(stream2);

		const suspended2 = chunksOfType(chunks2, 'tool-call-suspended');
		expect(suspended2).toHaveLength(1);

		const s2 = suspended2[0] as StreamChunk & { type: 'tool-call-suspended' };
		expect(s2.toolCallId).toBe(s1.toolCallId);
		expect(s2.suspendPayload).toEqual(expect.objectContaining({ step: 2 }));
		expect(handlerCalls()).toBe(2);

		// No tool-result chunk on re-suspension
		expect(chunksOfType(chunks2, 'tool-result')).toHaveLength(0);

		// 3. Second resume → tool completes, LLM responds
		const { stream: stream3 } = await agent.resume(
			'stream',
			{ confirmed: true },
			{ runId: s2.runId, toolCallId: s2.toolCallId },
		);
		const chunks3 = await collectStreamChunks(stream3);

		expect(handlerCalls()).toBe(3);

		const errors = chunks3.filter((c) => c.type === 'error');
		expect(errors).toHaveLength(0);

		const toolResults = chunksOfType(chunks3, 'tool-result');
		expect(toolResults.length).toBeGreaterThan(0);

		const finishChunks = chunksOfType(chunks3, 'finish') as Array<StreamChunk & { type: 'finish' }>;
		expect(finishChunks.length).toBeGreaterThan(0);
		expect(finishChunks[0].finishReason).not.toBe('error');

		const textDeltas = chunksOfType(chunks3, 'text-delta');
		expect(textDeltas.length).toBeGreaterThan(0);
	});

	it('stream: no suspended chunks leak into the final completion stream', async () => {
		const { agent } = createAgentWithDoubleSuspendTool('anthropic');

		const { stream: stream1 } = await agent.stream('Deploy "leak-check-app"');
		const chunks1 = await collectStreamChunks(stream1);
		const s1 = chunksOfType(chunks1, 'tool-call-suspended')[0] as StreamChunk & {
			type: 'tool-call-suspended';
		};

		const { stream: stream2 } = await agent.resume(
			'stream',
			{ confirmed: true },
			{ runId: s1.runId, toolCallId: s1.toolCallId },
		);
		const chunks2 = await collectStreamChunks(stream2);
		const s2 = chunksOfType(chunks2, 'tool-call-suspended')[0] as StreamChunk & {
			type: 'tool-call-suspended';
		};

		const { stream: stream3 } = await agent.resume(
			'stream',
			{ confirmed: true },
			{ runId: s2.runId, toolCallId: s2.toolCallId },
		);
		const chunks3 = await collectStreamChunks(stream3);

		// Final stream should have no suspended chunks — the tool completed
		const finalSuspended = chunksOfType(chunks3, 'tool-call-suspended');
		expect(finalSuspended).toHaveLength(0);
	});
});
