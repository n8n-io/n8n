import { ListSystemAgentThreadsQueryDto, SystemAgentChatQueryDto } from '../dto';

describe('ListSystemAgentThreadsQueryDto', () => {
	it('accepts a page query and trims the search', () => {
		const result = ListSystemAgentThreadsQueryDto.safeParse({
			limit: '20',
			cursor: 'eyJpZCI6InRocmVhZC0xIn0',
			search: '  digest ',
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({
			limit: '20',
			cursor: 'eyJpZCI6InRocmVhZC0xIn0',
			search: 'digest',
		});
	});

	it('accepts an empty query', () => {
		const result = ListSystemAgentThreadsQueryDto.safeParse({});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({});
	});

	it('rejects a search with a NUL byte', () => {
		expect(ListSystemAgentThreadsQueryDto.safeParse({ search: 'a\u0000b' }).success).toBe(false);
	});

	it('rejects a search longer than 500 characters', () => {
		expect(ListSystemAgentThreadsQueryDto.safeParse({ search: 'a'.repeat(501) }).success).toBe(
			false,
		);
	});

	it('rejects a repeated search parameter', () => {
		expect(ListSystemAgentThreadsQueryDto.safeParse({ search: ['a', 'b'] }).success).toBe(false);
	});

	it('rejects a cursor longer than 512 characters', () => {
		expect(ListSystemAgentThreadsQueryDto.safeParse({ cursor: 'a'.repeat(513) }).success).toBe(
			false,
		);
	});
});

describe('SystemAgentChatQueryDto', () => {
	it('accepts a project id', () => {
		const result = SystemAgentChatQueryDto.safeParse({ projectId: 'project-1' });

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ projectId: 'project-1' });
	});

	it('accepts no project id, for an existing session', () => {
		expect(SystemAgentChatQueryDto.safeParse({}).success).toBe(true);
	});

	it('rejects an empty or repeated project id', () => {
		expect(SystemAgentChatQueryDto.safeParse({ projectId: '' }).success).toBe(false);
		expect(SystemAgentChatQueryDto.safeParse({ projectId: ['a', 'b'] }).success).toBe(false);
	});
});
