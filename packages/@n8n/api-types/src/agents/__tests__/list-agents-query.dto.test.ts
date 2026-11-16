import { ListAgentsQueryDto } from '../dto';

const parseFilter = (filter: unknown) =>
	ListAgentsQueryDto.safeParse({ filter: JSON.stringify(filter) });

describe('ListAgentsQueryDto', () => {
	it('accepts a list of agent ids', () => {
		const result = parseFilter({ ids: ['agent-1', 'agent-2'] });

		expect(result.success).toBe(true);
		expect(result.data?.filter).toEqual({ ids: ['agent-1', 'agent-2'] });
	});

	it('accepts a list of tag ids', () => {
		const result = parseFilter({ tags: ['tag-1', 'tag-2'] });

		expect(result.success).toBe(true);
		expect(result.data?.filter).toEqual({ tags: ['tag-1', 'tag-2'] });
	});

	it.each([
		{ scenario: 'an empty list', ids: [] },
		{ scenario: 'an empty id', ids: [''] },
		{ scenario: 'more than 50 ids', ids: Array.from({ length: 51 }, (_, i) => `agent-${i}`) },
		{ scenario: 'a non-array value', ids: 'agent-1' },
	])('rejects $scenario', ({ ids }) => {
		expect(parseFilter({ ids }).success).toBe(false);
	});

	it.each([
		{ scenario: 'an empty tag list', tags: [] },
		{ scenario: 'an empty tag id', tags: [''] },
		{ scenario: 'more than 50 tag ids', tags: Array.from({ length: 51 }, (_, i) => `tag-${i}`) },
		{ scenario: 'a non-array value', tags: 'tag-1' },
	])('rejects $scenario for tags', ({ tags }) => {
		expect(parseFilter({ tags }).success).toBe(false);
	});
});
