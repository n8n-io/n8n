import { AIMessage } from '@langchain/core/messages';

import { toParserInputText } from './parserInput';

describe('toParserInputText', () => {
	it('passes string LLM output through unchanged', () => {
		expect(toParserInputText('plain completion')).toBe('plain completion');
	});

	it('returns string message content as-is', () => {
		expect(toParserInputText(new AIMessage('{"ok":true}'))).toBe('{"ok":true}');
	});

	it('extracts text from content-block arrays (OpenAI Responses API shape)', () => {
		const message = new AIMessage({
			content: [{ type: 'text', text: '```json\n{"Billing":true}\n```' }],
		});
		expect(toParserInputText(message)).toBe('```json\n{"Billing":true}\n```');
	});

	it('joins multiple text blocks and skips non-text blocks', () => {
		const message = new AIMessage({
			content: [
				{ type: 'reasoning', reasoning: 'thinking...' } as never,
				{ type: 'text', text: '{"a":' },
				{ type: 'text', text: '1}' },
			],
		});
		expect(toParserInputText(message)).toBe('{"a":1}');
	});
});
