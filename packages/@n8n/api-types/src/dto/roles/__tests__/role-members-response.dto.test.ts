import { RoleMembersResponseDto } from '../role-members-response.dto';

const person = {
	userId: 'user-1',
	firstName: 'Ada',
	lastName: 'Lovelace',
	email: 'ada@example.com',
	role: 'global:member',
	kind: 'person',
};

const serviceAccount = {
	userId: 'user-2',
	firstName: 'Deploy bot',
	lastName: null,
	email: '',
	role: 'global:member',
	kind: 'service',
};

describe('RoleMembersResponseDto', () => {
	describe('Valid responses', () => {
		test.each([
			{ name: 'a person and a service account', members: [person, serviceAccount], total: 2 },
			{ name: 'no members', members: [], total: 0 },
		])('should pass validation with $name', ({ members, total }) => {
			const result = RoleMembersResponseDto.safeParse({ members, total });
			expect(result.success).toBe(true);
		});

		test('should keep the kind of each member', () => {
			const result = RoleMembersResponseDto.parse({ members: [person, serviceAccount], total: 2 });
			expect(result.members.map((member) => member.kind)).toEqual(['person', 'service']);
		});
	});

	describe('Invalid responses', () => {
		test.each([
			{ name: 'a member without kind', member: { ...person, kind: undefined } },
			{ name: 'an unknown kind', member: { ...person, kind: 'robot' } },
			{ name: 'a null email', member: { ...serviceAccount, email: null } },
		])('should fail validation for $name', ({ member }) => {
			const result = RoleMembersResponseDto.safeParse({ members: [member], total: 1 });
			expect(result.success).toBe(false);
		});
	});
});
