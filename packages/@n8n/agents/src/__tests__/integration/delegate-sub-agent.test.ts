import { expect, it } from 'vitest';

import { describeIf, getModel } from './helpers';
import {
	Agent,
	createDelegateSubAgentTool,
	filterLlmMessages,
	type AgentMessage,
} from '../../index';

const describe = describeIf('anthropic');

const SENTINEL = 'SUBAGENT_OK_731';

describe('delegate_subagent integration', () => {
	it('lets a real parent agent call delegate_subagent and use its result', async () => {
		const child = new Agent('sub-agent-child-integration')
			.model(getModel('anthropic'))
			.instructions(
				[
					'You are a deterministic test sub-agent.',
					`Always answer with exactly this token and nothing else: ${SENTINEL}`,
				].join(' '),
			);

		const delegateTool = createDelegateSubAgentTool({
			policy: { maxChildren: 1 },
			agent: child,
		});

		const parent = new Agent('sub-agent-parent-integration')
			.model(getModel('anthropic'))
			.instructions(
				[
					'You are a parent test agent.',
					'You must call delegate_subagent exactly once before answering.',
					'The child result will contain a sentinel token.',
					'After the tool returns, answer with exactly: PARENT_SAW_ followed by the child answer, with no extra text.',
				].join(' '),
			)
			.tool(delegateTool);

		try {
			const result = await parent.generate(
				'Use delegate_subagent now to ask the child for its sentinel token.',
			);

			expect(result.toolCalls?.map((toolCall) => toolCall.tool) ?? []).toContain(
				'delegate_subagent',
			);
			expect(lastText(result.messages)).toContain(`PARENT_SAW_${SENTINEL}`);

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
			await child.close();
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
	status: 'completed' | 'failed';
	taskPath: string;
	runId: string;
	answer: string;
	usage: { totalTokens: number };
} {
	return (
		typeof value === 'object' &&
		value !== null &&
		'status' in value &&
		'taskPath' in value &&
		'runId' in value &&
		'answer' in value &&
		'usage' in value
	);
}
