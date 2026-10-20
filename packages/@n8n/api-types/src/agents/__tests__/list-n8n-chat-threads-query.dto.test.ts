import { ListN8nChatThreadsQueryDto } from '../dto';

describe('ListN8nChatThreadsQueryDto', () => {
	it('accepts an ISO datetime cursor', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({ cursor: '2025-01-02T00:00:00.000Z' });
		expect(result.success).toBe(true);
		expect(result.data).toEqual({ cursor: '2025-01-02T00:00:00.000Z' });
	});

	it('rejects a malformed cursor', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({ cursor: 'not-a-date' });
		expect(result.success).toBe(false);
	});

	it('accepts an absent cursor', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data).toEqual({});
	});

	it('accepts an agentId', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({ agentId: 'agent-1' });
		expect(result.success).toBe(true);
		expect(result.data).toEqual({ agentId: 'agent-1' });
	});

	it('accepts a string limit', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({ limit: '50' });
		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: '50' });
	});

	it('rejects a number limit', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({ limit: 50 });
		expect(result.success).toBe(false);
	});
});
