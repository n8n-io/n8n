import { AiChatRequestDto } from '../ai-chat-request.dto';

describe('AiChatRequestDto', () => {
	it('should validate a request with a payload and session ID', () => {
		const validRequest = {
			payload: { someKey: 'someValue' },
			sessionId: 'session-123',
		};

		const result = AiChatRequestDto.safeParse(validRequest);

		expect(result.success).toBe(true);
	});

	it('should validate a request with only a payload', () => {
		const validRequest = {
			payload: { complexObject: { nested: 'value' } },
		};

		const result = AiChatRequestDto.safeParse(validRequest);

		expect(result.success).toBe(true);
	});

	it('should fail if payload is missing', () => {
		const invalidRequest = {
			sessionId: 'session-123',
		};

		const result = AiChatRequestDto.safeParse(invalidRequest);

		expect(result.success).toBe(false);
	});
});
