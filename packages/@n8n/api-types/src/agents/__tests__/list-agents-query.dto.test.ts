import { ListAgentsQueryDto } from '../dto';

const parseFilter = (filter: unknown) =>
	ListAgentsQueryDto.safeParse({ filter: JSON.stringify(filter) });

describe('ListAgentsQueryDto', () => {
	it('accepts a list of agent ids', () => {
		const result = parseFilter({ ids: ['agent-1', 'agent-2'] });

		expect(result.success).toBe(true);
		expect(result.data?.filter).toEqual({ ids: ['agent-1', 'agent-2'] });
	});

	it.each([
		{ scenario: 'an empty list', ids: [] },
		{ scenario: 'an empty id', ids: [''] },
		{ scenario: 'more than 50 ids', ids: Array.from({ length: 51 }, (_, i) => `agent-${i}`) },
		{ scenario: 'a non-array value', ids: 'agent-1' },
	])('rejects $scenario', ({ ids }) => {
		expect(parseFilter({ ids }).success).toBe(false);
	});
});
