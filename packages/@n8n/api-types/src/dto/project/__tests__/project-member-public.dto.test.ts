import {
	ListProjectMembersQueryPublicDto,
	ProjectMemberListPublicDto,
	ProjectMemberPublicDto,
} from '../project-member-public.dto';

const member = {
	id: '123e4567-e89b-12d3-a456-426614174000',
	email: 'john.doe@company.com',
	firstName: 'John',
	lastName: 'Doe',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
	role: 'project:viewer',
};

describe('ProjectMemberPublicDto', () => {
	test('accepts the seven fields the list returns', () => {
		expect(ProjectMemberPublicDto.safeParse(member).success).toBe(true);
	});

	test('accepts null names and a null role', () => {
		const result = ProjectMemberPublicDto.safeParse({
			...member,
			firstName: null,
			lastName: null,
			role: null,
		});

		expect(result.success).toBe(true);
	});

	test('strips a field the schema does not name', () => {
		const result = ProjectMemberPublicDto.safeParse({ ...member, password: 'secret' });

		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('password');
	});

	test.each([
		['a Date for createdAt', { createdAt: new Date() }],
		['a non-ISO updatedAt', { updatedAt: 'yesterday' }],
		['a missing email', { email: undefined }],
		['a missing role', { role: undefined }],
	])('rejects %s', (_label, override) => {
		expect(ProjectMemberPublicDto.safeParse({ ...member, ...override }).success).toBe(false);
	});
});

describe('ProjectMemberListPublicDto', () => {
	test('accepts a page with a next cursor', () => {
		const result = ProjectMemberListPublicDto.safeParse({ data: [member], nextCursor: 'abc' });

		expect(result.success).toBe(true);
	});

	test('accepts the last page', () => {
		expect(ProjectMemberListPublicDto.safeParse({ data: [], nextCursor: null }).success).toBe(true);
	});

	test('rejects a missing nextCursor', () => {
		expect(ProjectMemberListPublicDto.safeParse({ data: [] }).success).toBe(false);
	});
});

describe('ListProjectMembersQueryPublicDto', () => {
	test('defaults limit to 100', () => {
		const result = ListProjectMembersQueryPublicDto.safeParse({});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: 100 });
	});

	test('clamps limit to 250', () => {
		const result = ListProjectMembersQueryPublicDto.safeParse({ limit: '300' });

		expect(result.success).toBe(true);
		expect(result.data?.limit).toBe(250);
	});

	test('keeps the cursor', () => {
		const result = ListProjectMembersQueryPublicDto.safeParse({ cursor: 'abc' });

		expect(result.data?.cursor).toBe('abc');
	});

	test('rejects a non-numeric limit', () => {
		expect(ListProjectMembersQueryPublicDto.safeParse({ limit: 'abc' }).success).toBe(false);
	});
});
