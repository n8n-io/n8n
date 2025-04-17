import { RoleChangeRequestDto } from '../role-change-request.dto';

describe('RoleChangeRequestDto', () => {
	it('should fail validation with missing newRoleName', () => {
		const data = {};

		const result = RoleChangeRequestDto.safeParse(data);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path[0]).toBe('newRoleName');
		expect(result.error?.issues[0].message).toBe('New role is required');
	});

	it('should fail validation with invalid newRoleName', () => {
		const data = {
			newRoleName: 'invalidRole',
		};

		const result = RoleChangeRequestDto.safeParse(data);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path[0]).toBe('newRoleName');
		expect(result.error?.issues[0].message).toBe(
			"Invalid enum value. Expected 'global:admin' | 'global:member', received 'invalidRole'",
		);
	});

	it('should pass validation with valid data', () => {
		const data = {
			newRoleName: 'global:admin',
		};

		const result = RoleChangeRequestDto.safeParse(data);

		expect(result.success).toBe(true);
	});
});
