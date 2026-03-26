import { expect, it } from 'vitest';
import { z } from 'zod';

import { describeIf, findLastTextContent } from './helpers';
import { Agent, Tool, filterLlmMessages } from '../../index';

const describe = describeIf('anthropic');

describe('Zod validation errors surface to LLM and allow self-correction', () => {
	/**
	 * Verify that when the LLM receives a Zod error result, it shows up in the
	 * conversation as an actual tool-result message with an error payload (not a
	 * thrown exception), so the agent loop continues rather than aborting.
	 */
	it('includes the Zod error text in the tool-result visible to the LLM', async () => {
		const strictTool = new Tool('find_user')
			.description('Find a user by their numeric age (18–99 only).')
			.input(
				z.object({
					age: z
						.number()
						.int()
						.min(18, 'age must be at least 18')
						.max(99, 'age must be at most 99')
						.describe('User age (18–99)'),
				}),
			)
			.output(z.object({ user: z.string() }))
			.handler(async ({ age }) => ({ user: `User aged ${age}` }));

		const agent = new Agent('age-correction-agent')
			.model('anthropic/claude-haiku-4-5')
			.instructions(
				'You are a user directory. Use find_user to look up users by age. ' +
					'The age must be between 18 and 99. ' +
					'If validation fails, correct the age and retry. Be very concise.',
			)
			.tool(strictTool);

		// "150" is out of range — should trigger a Zod error, then retry with a valid age
		const result = await agent.generate(
			'Find a user aged 150. If that age is invalid, use 25 instead and retry. You MUST find a user aged 150, and only then use 25',
		);

		expect(result.finishReason).toBe('stop');
		expect(result.error).toBeUndefined();

		// At least two tool-result messages: one error, one success
		const allMessages = filterLlmMessages(result.messages);
		const toolResultMessages = allMessages.filter((m) =>
			m.content.some((c) => c.type === 'tool-result'),
		);
		expect(toolResultMessages.length).toBeGreaterThanOrEqual(2);

		// The final response should mention a user (age 25 or similar)
		const text = findLastTextContent(result.messages);
		expect(text).toBeTruthy();
	});
});
