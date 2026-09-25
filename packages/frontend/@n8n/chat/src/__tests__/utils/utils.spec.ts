import { MessageComponentKey } from '@n8n/chat/constants';
import { parseBotChatMessageContent, shouldBlockUserInput } from '@n8n/chat/utils';

describe('utils', () => {
	describe('parseBotChatMessageContent', () => {
		it('should return a string for a non-JSON message', () => {
			const message = parseBotChatMessageContent('test');
			expect(message).toEqual({
				id: expect.any(String),
				sender: 'bot',
				text: 'test',
			});
		});

		it('should render a message frame as plain text', () => {
			const message = parseBotChatMessageContent(JSON.stringify({ type: 'message', text: 'hi' }));
			expect(message).toEqual({
				id: expect.any(String),
				sender: 'bot',
				text: 'hi',
			});
		});

		it('should render a message frame text verbatim even when it is JSON', () => {
			const messageText = JSON.stringify({
				type: 'with-buttons',
				text: 'Click',
				blockUserInput: false,
				buttons: [{ text: 'Go', link: 'https://example.com/action', type: 'primary' }],
			});

			const message = parseBotChatMessageContent(
				JSON.stringify({ type: 'message', text: messageText }),
			);

			expect(message).toEqual({
				id: expect.any(String),
				sender: 'bot',
				text: messageText,
			});
		});

		it('should parse a message with buttons', () => {
			const jsonMessage = {
				type: 'with-buttons',
				text: 'test',
				buttons: [{ text: 'Approve', link: 'https://yes.com', type: 'primary' }],
				blockUserInput: true,
			};

			const message = parseBotChatMessageContent(JSON.stringify(jsonMessage));

			expect(message).toEqual({
				id: expect.any(String),
				sender: 'bot',
				type: 'component',
				key: MessageComponentKey.WITH_BUTTONS,
				arguments: {
					text: 'test',
					buttons: [{ text: 'Approve', link: 'https://yes.com', type: 'primary' }],
					blockUserInput: true,
				},
			});
		});
	});

	describe('shouldBlockUserInput', () => {
		it('should return true for message with buttons and when blockUserInput is true', () => {
			const message = {
				id: '1',
				sender: 'bot' as const,
				type: 'component' as const,
				key: MessageComponentKey.WITH_BUTTONS,
				arguments: { blockUserInput: true },
			};

			const result = shouldBlockUserInput(message);

			expect(result).toBe(true);
		});

		it('should return false for message with buttons and when blockUserInput is false', () => {
			const message = {
				id: '1',
				sender: 'bot' as const,
				type: 'component' as const,
				key: MessageComponentKey.WITH_BUTTONS,
				arguments: { blockUserInput: false },
			};

			const result = shouldBlockUserInput(message);
			expect(result).toBe(false);
		});

		it('should return false for regular message', () => {
			const message = {
				id: '1',
				sender: 'bot' as const,
				text: 'test',
			};

			const result = shouldBlockUserInput(message);

			expect(result).toBe(false);
		});
	});
});
