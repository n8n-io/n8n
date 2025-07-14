import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { BufferWindowMemory } from 'langchain/memory';

import { getChatMessages } from '../helpers/utils';

describe('OpenAI message history', () => {
	it('should only get a limited number of messages', async () => {
		const memory = new BufferWindowMemory({
			returnMessages: true,
			k: 2,
		});
		expect(await getChatMessages(memory)).toEqual([]);

		await memory.saveContext(
			[new HumanMessage({ content: 'human 1' })],
			[new AIMessage({ content: 'ai 1' })],
		);
		// `k` means turns, but `getChatMessages` returns messages, so a Human and an AI message.
		expect((await getChatMessages(memory)).length).toEqual(2);

		await memory.saveContext(
			[new HumanMessage({ content: 'human 2' })],
			[new AIMessage({ content: 'ai 2' })],
		);
		expect((await getChatMessages(memory)).length).toEqual(4);
		expect((await getChatMessages(memory)).map((msg) => msg.content)).toEqual([
			'human 1',
			'ai 1',
			'human 2',
			'ai 2',
		]);

		// We expect this to be trimmed...
		await memory.saveContext(
			[new HumanMessage({ content: 'human 3' })],
			[new AIMessage({ content: 'ai 3' })],
		);
		expect((await getChatMessages(memory)).length).toEqual(4);
		expect((await getChatMessages(memory)).map((msg) => msg.content)).toEqual([
			'human 2',
			'ai 2',
			'human 3',
			'ai 3',
		]);
	});
});
