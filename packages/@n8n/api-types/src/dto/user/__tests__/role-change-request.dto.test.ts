import { RoleChangeRequestDto } from '../role-change-request.dto';

describe('RoleChangeRequestDto', () => {
	it('should fail validation with missing newRoleName', () => {
		const data = {};

		const result = RoleChangeRequestDto.safeParse(data);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path[0]).toBe('newRoleName');
		expect(result.error?.issues[0].message).toBe('New role is required');
	});

	it('should fail validation with invalid newRoleName global:owner', () => {
		const data = {
			newRoleName: 'global:owner',
		};

		const result = RoleChangeRequestDto.safeParse(data);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path[0]).toBe('newRoleName');
		expect(result.error?.issues[0].message).toBe('This global role value is not assignable');
	});

	it.each<string>(['global:admin', 'custom:role'])(
		'should pass validation with valid newRoleName %s',
		(role) => {
			const data = {
				newRoleName: role,
			};

			const result = RoleChangeRequestDto.safeParse(data);

			expect(result.success).toBe(true);
		},
	);
});
