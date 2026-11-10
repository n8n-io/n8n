import { AgentChatMessageDto, SystemAgentChatMessageDto } from '../dto';

describe('SystemAgentChatMessageDto', () => {
	const sessionId = '5f3a1b2c-9d8e-4f70-8a6b-1c2d3e4f5a6b';

	it('accepts a lowercase UUID session ID', () => {
		const payload = { message: 'Hello', sessionId };
		expect(SystemAgentChatMessageDto.parse(payload)).toEqual(payload);
		expect(new SystemAgentChatMessageDto(payload)).toMatchObject(payload);
	});

	it('accepts a payload without a session ID', () => {
		expect(SystemAgentChatMessageDto.safeParse({ message: 'Hello' }).success).toBe(true);
	});

	it.each([
		['an uppercase UUID', sessionId.toUpperCase()],
		['a mixed-case UUID', `5F3A${sessionId.slice(4)}`],
		['a UUID with other separators', sessionId.replaceAll('-', '_')],
		['a free-form string', 'session-1'],
		['an empty string', ''],
	])('rejects %s as the session ID', (_label, invalid) => {
		const payload = { message: 'Hello', sessionId: invalid };
		expect(SystemAgentChatMessageDto.safeParse(payload).success).toBe(false);
		expect(() => SystemAgentChatMessageDto.parse(payload)).toThrow();
	});

	it('does not change the session ID rule of AgentChatMessageDto', () => {
		expect(
			AgentChatMessageDto.safeParse({ message: 'Hello', sessionId: 'session-1' }).success,
		).toBe(true);
	});

	it('keeps the message rules of AgentChatMessageDto', () => {
		expect(SystemAgentChatMessageDto.safeParse({ message: '   ' }).success).toBe(false);
		expect(
			SystemAgentChatMessageDto.safeParse({
				message: 'Hello',
				messageId: 'c4b02d7b-2088-41ce-9c6b-faf8c7b83d8a',
			}).success,
		).toBe(false);
	});
});
