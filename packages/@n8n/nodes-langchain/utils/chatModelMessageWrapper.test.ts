import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';

import {
	normalizeEmptyToolCallContent,
	wrapChatModelMessageInput,
} from './chatModelMessageWrapper';

const toolCall = {
	id: 'call_123',
	name: 'Chat',
	args: { Message: 'hello' },
	type: 'tool_call' as const,
};

describe('chatModelMessageWrapper', () => {
	describe('normalizeEmptyToolCallContent', () => {
		it('converts empty array content on AI tool-call messages to an empty string', () => {
			const message = new AIMessage({ content: [], tool_calls: [toolCall] });

			const [normalized] = normalizeEmptyToolCallContent([message]);

			expect(AIMessage.isInstance(normalized)).toBe(true);
			expect(normalized.content).toBe('');
			expect((normalized as AIMessage).tool_calls).toEqual([toolCall]);
		});

		it('leaves non-tool-call messages unchanged', () => {
			const message = new HumanMessage('hello');

			const [normalized] = normalizeEmptyToolCallContent([message]);

			expect(normalized).toBe(message);
		});
	});

	it('wraps generate and stream paths with the message transformer', async () => {
		const seenGenerateMessages: unknown[] = [];
		const seenStreamMessages: unknown[] = [];
		const model = {
			_generate: vi.fn(async (messages) => {
				seenGenerateMessages.push(messages);
				return { generations: [] };
			}),
			_streamResponseChunks: vi.fn(async function* (messages) {
				seenStreamMessages.push(messages);
				yield new ChatGenerationChunk({
					text: '',
					message: new AIMessage({ content: '' }),
				});
			}),
		} as unknown as BaseChatModel;

		const wrapped = wrapChatModelMessageInput(model);
		const message = new AIMessage({ content: [], tool_calls: [toolCall] });

		expect(wrapped).toBe(model);

		await wrapped._generate([message], {});
		for await (const _chunk of wrapped._streamResponseChunks([message], {})) {
		}

		expect(seenGenerateMessages).toHaveLength(1);
		expect(seenStreamMessages).toHaveLength(1);
		expect((seenGenerateMessages[0] as AIMessage[])[0].content).toBe('');
		expect((seenStreamMessages[0] as AIMessage[])[0].content).toBe('');
	});
});
