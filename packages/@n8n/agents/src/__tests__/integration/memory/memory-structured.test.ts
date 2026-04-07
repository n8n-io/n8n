import { expect, it } from 'vitest';
import { z } from 'zod';

import { Agent, Memory } from '../../../index';
import { describeIf, findLastTextContent, getModel } from '../helpers';

const describe = describeIf('anthropic');

describe('structured working memory', () => {
	const schema = z.object({
		userName: z.string().optional().describe("The user's name"),
		favoriteColor: z.string().optional().describe('Favorite color'),
		location: z.string().optional().describe('Where the user lives'),
	});

	it('agent fills structured fields across turns', async () => {
		const memory = new Memory().storage('memory').lastMessages(10).structured(schema);

		const agent = new Agent('structured-test')
			.model(getModel('anthropic'))
			.instructions('You are a helpful assistant. Be concise.')
			.memory(memory);

		const threadId = `structured-${Date.now()}`;
		const options = { persistence: { threadId, resourceId: 'test-user' } };

		await agent.generate('My name is Eve and I love purple.', options);
		const result = await agent.generate('What is my name and favorite color?', options);

		const text = findLastTextContent(result.messages)?.toLowerCase() ?? '';
		expect(text).toContain('eve');
		expect(text).toContain('purple');
	});

	it('throws when both .structured() and .freeform() are used', () => {
		expect(() => {
			new Memory().storage('memory').structured(schema).freeform('# Template').build();
		}).toThrow(/cannot use both/i);
	});
});
