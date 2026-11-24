import { AgentChatMessagesQueryDto } from '../dto';

describe('AgentChatMessagesQueryDto', () => {
	it('accepts a query without a limit, for the whole thread', () => {
		const result = AgentChatMessagesQueryDto.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data).toEqual({});
	});

	it('converts the limit to a number', () => {
		const result = AgentChatMessagesQueryDto.safeParse({ limit: '20', cursor: 'cursor-1' });
		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: 20, cursor: 'cursor-1' });
	});

	it('caps the limit', () => {
		const result = AgentChatMessagesQueryDto.safeParse({ limit: '1000' });
		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: 100 });
	});

	it.each(['0', '-1', '1.5', 'abc', ''])('rejects the limit "%s"', (limit) => {
		expect(AgentChatMessagesQueryDto.safeParse({ limit }).success).toBe(false);
	});

	it('rejects an empty cursor', () => {
		expect(AgentChatMessagesQueryDto.safeParse({ limit: '20', cursor: '' }).success).toBe(false);
	});
});
