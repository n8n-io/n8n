import { DismissAgentAttentionFlagsDto, ListAgentAttentionFlagsQueryDto } from '../attention-flags';
import { ListAgentSessionsQueryDto } from '../dto';

const flagId = '019aa9a0-0000-7000-8000-000000000001';

describe('Agent attention flag DTOs', () => {
	it('allows retrieval across all types or by type', () => {
		expect(ListAgentAttentionFlagsQueryDto.parse({})).toEqual({});
		expect(ListAgentAttentionFlagsQueryDto.parse({ type: 'session-error' })).toEqual({
			type: 'session-error',
		});
		expect(ListAgentAttentionFlagsQueryDto.safeParse({ type: 'unknown' }).success).toBe(false);
	});

	it('requires a type and bounded flag IDs for dismissal', () => {
		expect(
			DismissAgentAttentionFlagsDto.parse({ type: 'session-error', flagIds: [flagId] }).flagIds,
		).toEqual([flagId]);
		for (const flagIds of [[], ['invalid'], Array(501).fill(flagId)]) {
			expect(
				DismissAgentAttentionFlagsDto.safeParse({ type: 'session-error', flagIds }).success,
			).toBe(false);
		}
		expect(DismissAgentAttentionFlagsDto.safeParse({ flagIds: [flagId] }).success).toBe(false);
	});

	it.each([
		['a,b', ['a', 'b']],
		['a, b', ['a', 'b']],
		['a,b,', ['a', 'b']],
		[' , a, , b, ', ['a', 'b']],
		[' , , ', []],
		[
			['a', 'b'],
			['a', 'b'],
		],
		['', []],
		[undefined, undefined],
	])('parses session IDs %j', (sessionIds, expected) => {
		expect(ListAgentSessionsQueryDto.parse({ sessionIds }).sessionIds).toEqual(expected);
	});

	it('limits session ID filters to 500 entries', () => {
		expect(
			ListAgentSessionsQueryDto.parse({ sessionIds: Array(500).fill('session') }).sessionIds,
		).toHaveLength(500);
		expect(
			ListAgentSessionsQueryDto.safeParse({ sessionIds: Array(501).fill('session') }).success,
		).toBe(false);
	});
});
