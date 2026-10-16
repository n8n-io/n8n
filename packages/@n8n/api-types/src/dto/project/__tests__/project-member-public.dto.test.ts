import {
	AddProjectMembersPublicDto,
	ChangeProjectMemberRolePublicDto,
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
	test('accepts all the expected fields', () => {
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
	test('exposes limit and cursor and drops offset', () => {
		const result = ListProjectMembersQueryPublicDto.safeParse({
			limit: '5',
			cursor: 'abc',
			offset: '3',
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ limit: 5, cursor: 'abc' });
	});
});

describe('AddProjectMembersPublicDto', () => {
	test('accepts relations and, as the legacy schema did, ignores an unknown key', () => {
		const result = AddProjectMembersPublicDto.safeParse({
			relations: [{ userId: member.id, role: 'project:viewer', extra: true }],
		});

		expect(result.success).toBe(true);
		expect(result.data).toEqual({ relations: [{ userId: member.id, role: 'project:viewer' }] });
	});

	test('rejects an empty relations list', () => {
		expect(AddProjectMembersPublicDto.safeParse({ relations: [] }).success).toBe(false);
	});
});

describe('ChangeProjectMemberRolePublicDto', () => {
	test('accepts any non-empty role; the service checks that it exists', () => {
		expect(ChangeProjectMemberRolePublicDto.safeParse({ role: 'custom:role' }).success).toBe(true);
		expect(ChangeProjectMemberRolePublicDto.safeParse({ role: '' }).success).toBe(false);
	});
});
