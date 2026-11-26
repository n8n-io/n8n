import { ListN8nChatThreadsQueryDto } from '../dto';

describe('ListN8nChatThreadsQueryDto', () => {
	it.each(['2025-01-02T00:00:00.000Z', '2025-01-02T00:00:00.000Z|thread-1|suffix'])(
		'accepts cursor %s',
		(cursor) => {
			const result = ListN8nChatThreadsQueryDto.safeParse({ cursor });
			expect(result.success).toBe(true);
			expect(result.data).toEqual({ cursor });
		},
	);

	it.each(['not-a-date', '2025-01-02T00:00:00.000Z|', '2025-01-02T00:00:00.000Z|\0'])(
		'rejects malformed cursor %s',
		(cursor) => {
			expect(ListN8nChatThreadsQueryDto.safeParse({ cursor }).success).toBe(false);
		},
	);

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
