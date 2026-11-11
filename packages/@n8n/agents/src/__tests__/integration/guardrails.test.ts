import { expect, it } from 'vitest';

import {
	chunksOfType,
	collectStreamChunks,
	createAgentWithAddTool,
	createAgentWithInterruptibleTool,
	describeIf,
	findAllToolResults,
	findLastTextContent,
	getModel,
} from './helpers';
import { Agent } from '../../index';
import type {
	GuardrailDecision,
	GuardrailModelCallContext,
	GuardrailToolCallContext,
	GuardrailsOptions,
	ModelGuardrail,
	TokenUsage,
} from '../../types';

const describe = describeIf('anthropic');

const IDS = { agentId: 'agent-1', threadId: 'thread-1' };

type Decide = {
	/** Called with the 1-based index of the model call. */
	before?: (callNumber: number) => GuardrailDecision | undefined;
	beforeTool?: (ctx: GuardrailToolCallContext) => GuardrailDecision | undefined;
};

/** A hook that records every call and decides through the given functions. */
function recordingGuardrail(decide: Decide = {}) {
	const calls = {
		before: [] as GuardrailModelCallContext[],
		after: [] as Array<{ ctx: GuardrailModelCallContext; usage: TokenUsage | undefined }>,
		beforeTool: [] as GuardrailToolCallContext[],
		afterTool: [] as Array<{ ctx: GuardrailToolCallContext; result: unknown }>,
	};
	const hook: ModelGuardrail = {
		async before(ctx) {
			calls.before.push(ctx);
			return await Promise.resolve(decide.before?.(calls.before.length));
		},
		async after(ctx, usage) {
			calls.after.push({ ctx, usage });
			await Promise.resolve();
		},
		async beforeTool(ctx) {
			calls.beforeTool.push(ctx);
			return await Promise.resolve(decide.beforeTool?.(ctx));
		},
		async afterTool(ctx, result) {
			calls.afterTool.push({ ctx, result });
			await Promise.resolve();
		},
	};
	const guardrails: GuardrailsOptions = { hooks: [hook], ...IDS };
	return { guardrails, calls };
}

const stop = (code: string): GuardrailDecision => ({ action: 'stop', code });

describe('guardrails integration', () => {
	it('refuses the first model call in generate', async () => {
		const { guardrails, calls } = recordingGuardrail({ before: () => stop('test.first') });
		const agent = new Agent('guardrail-first-call')
			.model(getModel('anthropic'))
			.instructions('You are a concise assistant. Reply with one short sentence.');

		const result = await agent.generate('Say hello.', { guardrails });

		expect(result.finishReason).toBe('guardrail');
		expect(result.guardrail).toEqual({ code: 'test.first' });
		expect(result.error).toBeUndefined();
		expect(findLastTextContent(result.messages)).toBeUndefined();
		expect(calls.before).toHaveLength(1);
		expect(calls.after).toHaveLength(0);
	});

	it('refuses the first model call in stream', async () => {
		const { guardrails } = recordingGuardrail({ before: () => stop('test.first') });
		const agent = new Agent('guardrail-first-call-stream')
			.model(getModel('anthropic'))
			.instructions('You are a concise assistant. Reply with one short sentence.');

		const { stream } = await agent.stream('Say hello.', { guardrails });
		const chunks = await collectStreamChunks(stream);

		const finishChunks = chunksOfType(chunks, 'finish');
		expect(finishChunks).toHaveLength(1);
		expect(finishChunks[0]).toMatchObject({
			finishReason: 'guardrail',
			guardrail: { code: 'test.first' },
		});
		expect(chunksOfType(chunks, 'text-delta')).toHaveLength(0);
	});

	it('sees every model call and its usage', async () => {
		const { guardrails, calls } = recordingGuardrail();
		const agent = createAgentWithAddTool('anthropic');

		const result = await agent.generate('What is 2 + 3? Use the tool.', { guardrails });

		expect(result.finishReason).toBe('stop');
		expect(calls.before.length).toBeGreaterThanOrEqual(2);
		expect(calls.after).toHaveLength(calls.before.length);

		const callIds = new Set(calls.before.map((ctx) => ctx.callId));
		expect(callIds.size).toBe(calls.before.length);
		for (const ctx of calls.before) {
			expect(ctx).toMatchObject({ source: 'turn', model: getModel('anthropic'), ...IDS });
		}

		let totalTokens = 0;
		for (const { usage } of calls.after) {
			expect(usage?.totalTokens).toBeGreaterThan(0);
			totalTokens += usage?.totalTokens ?? 0;
		}
		expect(totalTokens).toBe(result.usage?.totalTokens);
	});

	it('stops the run after the crossing call', async () => {
		const { guardrails, calls } = recordingGuardrail({
			before: (callNumber) => (callNumber === 1 ? { action: 'allow' } : stop('test.second')),
		});
		const agent = createAgentWithAddTool('anthropic');

		const result = await agent.generate('What is 2 + 3? Use the tool.', { guardrails });

		const toolResults = findAllToolResults(result.messages);
		expect(toolResults).toHaveLength(1);
		expect(toolResults[0]).toMatchObject({
			toolName: 'add_numbers',
			state: 'resolved',
			output: { result: 5 },
		});
		expect(calls.after).toHaveLength(1);
		expect(result.finishReason).toBe('guardrail');
		expect(result.guardrail).toEqual({ code: 'test.second' });
	});

	it('blocks one tool call and lets the model continue', async () => {
		const { guardrails, calls } = recordingGuardrail({
			beforeTool: (ctx) => (ctx.toolName === 'add_numbers' ? stop('tool.blocked') : undefined),
		});
		const agent = createAgentWithAddTool('anthropic');

		const result = await agent.generate(
			'What is 2 + 3? Use the tool once. If the tool fails, say so in one sentence.',
			{ guardrails },
		);

		expect(calls.beforeTool.length).toBeGreaterThanOrEqual(1);
		expect(calls.afterTool).toHaveLength(0);
		const toolResults = findAllToolResults(result.messages);
		expect(toolResults.length).toBeGreaterThanOrEqual(1);
		for (const toolResult of toolResults) {
			expect(toolResult.state).toBe('rejected');
			expect(JSON.stringify(toolResult.state === 'rejected' && toolResult.error)).toContain(
				'tool.blocked',
			);
		}
		expect(result.finishReason).toBe('stop');
		expect(findLastTextContent(result.messages)).toEqual(expect.any(String));
	});

	it('checks a suspended tool once', async () => {
		const { guardrails, calls } = recordingGuardrail();
		const agent = createAgentWithInterruptibleTool('anthropic');

		const first = await agent.generate('Delete the file /tmp/guardrail.txt', { guardrails });

		expect(first.pendingSuspend).toHaveLength(1);
		expect(calls.beforeTool).toHaveLength(1);
		expect(calls.beforeTool[0]).toMatchObject({ toolName: 'delete_file', ...IDS });
		expect(calls.afterTool).toHaveLength(0);

		const { runId, toolCallId } = first.pendingSuspend![0];
		const resumed = await agent.resume(
			'generate',
			{ approved: true },
			{ runId, toolCallId, guardrails },
		);

		expect(resumed.finishReason).toBe('stop');
		expect(calls.beforeTool).toHaveLength(1);
		expect(calls.afterTool).toHaveLength(1);
		expect(calls.afterTool[0].result).toMatchObject({ deleted: true });
	});
});
