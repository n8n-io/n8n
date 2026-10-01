import { ListN8nChatThreadsQueryDto } from '../dto';

describe('ListN8nChatThreadsQueryDto', () => {
	it('accepts an ISO datetime cursor', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({ cursor: '2025-01-02T00:00:00.000Z' });
		expect(result.success).toBe(true);
	});

	it('rejects a malformed cursor', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({ cursor: 'not-a-date' });
		expect(result.success).toBe(false);
	});

	it('accepts an absent cursor', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({});
		expect(result.success).toBe(true);
	});

	it('accepts an agentId', () => {
		const result = ListN8nChatThreadsQueryDto.safeParse({ agentId: 'agent-1' });
		expect(result.success).toBe(true);
	});
});
