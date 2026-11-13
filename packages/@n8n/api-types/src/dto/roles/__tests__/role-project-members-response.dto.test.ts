import { RoleProjectMembersResponseDto } from '../role-project-members-response.dto';

const person = {
	userId: 'user-1',
	firstName: 'Ada',
	lastName: 'Lovelace',
	email: 'ada@example.com',
	role: 'project:editor',
	kind: 'person',
};

const serviceAccount = {
	userId: 'user-2',
	firstName: 'Deploy bot',
	lastName: null,
	email: '',
	role: 'project:editor',
	kind: 'service',
};

describe('RoleProjectMembersResponseDto', () => {
	describe('Valid responses', () => {
		test.each([
			{ name: 'a person and a service account', members: [person, serviceAccount] },
			{ name: 'no members', members: [] },
		])('should pass validation with $name', ({ members }) => {
			const result = RoleProjectMembersResponseDto.safeParse({ members });
			expect(result.success).toBe(true);
		});

		test('should keep the kind of each member', () => {
			const result = RoleProjectMembersResponseDto.parse({ members: [person, serviceAccount] });
			expect(result.members.map((member) => member.kind)).toEqual(['person', 'service']);
		});
	});

	describe('Invalid responses', () => {
		test.each([
			{ name: 'a member without kind', member: { ...person, kind: undefined } },
			{ name: 'an unknown kind', member: { ...person, kind: 'robot' } },
			{ name: 'a null email', member: { ...serviceAccount, email: null } },
		])('should fail validation for $name', ({ member }) => {
			const result = RoleProjectMembersResponseDto.safeParse({ members: [member] });
			expect(result.success).toBe(false);
		});
	});
});
