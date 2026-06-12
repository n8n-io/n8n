import { DesktopAssistantChatThreadRequestDto } from '../desktop-assistant-chat-thread-request.dto';

describe('DesktopAssistantChatThreadRequestDto', () => {
	describe('Valid requests', () => {
		test('empty body (server generates the id) validates', () => {
			const result = DesktopAssistantChatThreadRequestDto.safeParse({});
			expect(result.success).toBe(true);
		});

		test('a valid uuid threadId validates', () => {
			const result = DesktopAssistantChatThreadRequestDto.safeParse({
				threadId: '4d49ba31-32c9-4ccb-8606-626e9087b417',
			});
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test('a non-uuid threadId fails', () => {
			const result = DesktopAssistantChatThreadRequestDto.safeParse({ threadId: 'not-a-uuid' });
			expect(result.success).toBe(false);
			expect(result.error?.issues[0].path).toEqual(['threadId']);
		});
	});
});
