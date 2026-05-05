import { toAiMessages } from '../runtime/messages';
import { makeToolResultMessage } from '../runtime/runtime-helpers';
import { isLlmMessage } from '../sdk/message';

describe('runtime helpers', () => {
	it('normalizes undefined tool outputs before building AI SDK messages', () => {
		const message = makeToolResultMessage('tool-call-1', 'noop', undefined);
		if (!isLlmMessage(message)) {
			throw new Error('Expected an LLM message');
		}
		const [aiMessage] = toAiMessages([message]);

		expect(aiMessage).toEqual({
			role: 'tool',
			content: [
				{
					type: 'tool-result',
					toolCallId: 'tool-call-1',
					toolName: 'noop',
					output: { type: 'json', value: null },
				},
			],
		});
	});
});
