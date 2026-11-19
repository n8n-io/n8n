import { ListAgentsQueryDto, type ListAgentsOptions } from '../dto';

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

	it('accepts the published-state filter', () => {
		expect(parseFilter({ active: true }).success).toBe(true);
		expect(parseFilter({ active: false }).success).toBe(true);
	});

	it('rejects a non-boolean published-state filter', () => {
		expect(parseFilter({ active: 'true' }).success).toBe(false);
	});

	it('accepts the project filter', () => {
		const result = parseFilter({ projectId: 'project-1' });

		expect(result.success).toBe(true);
		expect(result.data?.filter).toEqual({ projectId: 'project-1' });
	});

	it('rejects an empty project filter', () => {
		expect(parseFilter({ projectId: '' }).success).toBe(false);
	});

	it('parses offset and limit and applies the defaults', () => {
		const result = ListAgentsQueryDto.safeParse({ offset: '20', limit: '30' });

		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({ offset: 20, limit: 30 });
	});

	it('defaults offset to 0 and limit to 10', () => {
		const result = ListAgentsQueryDto.safeParse({});

		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({ offset: 0, limit: 10 });
	});

	it('caps limit at 250', () => {
		const result = ListAgentsQueryDto.safeParse({ limit: '500' });

		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({ limit: 250 });
	});

	it.each(['-1', 'abc'])('rejects an invalid limit %s', (limit) => {
		expect(ListAgentsQueryDto.safeParse({ limit }).success).toBe(false);
	});

	it.each(['-1', 'abc'])('rejects an invalid offset %s', (offset) => {
		expect(ListAgentsQueryDto.safeParse({ offset }).success).toBe(false);
	});

	it('produces options structurally compatible with ListAgentsOptions', () => {
		const result = ListAgentsQueryDto.safeParse({
			offset: '10',
			limit: '5',
			sortBy: 'name:asc',
			filter: JSON.stringify({ active: true, projectId: 'project-1' }),
		});

		expect(result.success).toBe(true);
		const options: ListAgentsOptions | undefined = result.success ? result.data : undefined;
		expect(options).toMatchObject({
			offset: 10,
			limit: 5,
			sortBy: 'name:asc',
			filter: { active: true, projectId: 'project-1' },
		});
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
