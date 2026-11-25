import {
	AgentChatMessageDto,
	AgentChatQueueUpdateDto,
	EXTENDED_PROMPT_MAX_LENGTH,
	SystemAgentChatMessageDto,
	SystemAgentChatQueueUpdateDto,
} from '../dto';

const atLimit = 'a'.repeat(EXTENDED_PROMPT_MAX_LENGTH);
const overLimit = 'a'.repeat(EXTENDED_PROMPT_MAX_LENGTH + 1);

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

	it('accepts a message at the length limit', () => {
		expect(SystemAgentChatMessageDto.safeParse({ message: atLimit }).success).toBe(true);
	});

	it('rejects a message over the length limit', () => {
		const result = SystemAgentChatMessageDto.safeParse({ message: overLimit });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]).toMatchObject({
			path: ['message'],
			message: 'Message must be 25000 characters or fewer',
		});
	});

	it('does not limit the message length of AgentChatMessageDto', () => {
		expect(AgentChatMessageDto.safeParse({ message: overLimit }).success).toBe(true);
	});
});

describe('SystemAgentChatQueueUpdateDto', () => {
	it('accepts a message at the length limit', () => {
		expect(SystemAgentChatQueueUpdateDto.safeParse({ message: atLimit }).success).toBe(true);
	});

	it('rejects a message over the length limit', () => {
		expect(SystemAgentChatQueueUpdateDto.safeParse({ message: overLimit }).success).toBe(false);
	});

	it('does not limit the message length of AgentChatQueueUpdateDto', () => {
		expect(AgentChatQueueUpdateDto.safeParse({ message: overLimit }).success).toBe(true);
	});
});
