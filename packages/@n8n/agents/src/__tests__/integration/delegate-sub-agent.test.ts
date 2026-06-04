import { expect, it } from 'vitest';

import { describeIf } from './helpers';
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
		const delegateTool = createDelegateSubAgentTool({ policy: { maxChildren: 1 } });

		const parent = new Agent('sub-agent-parent-integration')
			.model('anthropic/claude-sonnet-4-5')
			.instructions(
				[
					'You are a parent test agent.',
					'This is a delegation wiring test: you must call delegate_subagent exactly once before answering.',
					'Treat the child task as a bounded independent workstream that only the child should complete.',
					'Set subAgentId to "inline" in that tool call.',
					'The child result will contain a sentinel token.',
					'After the tool returns, answer with exactly: PARENT_SAW_ followed by the child answer, with no extra text.',
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
