import { PasswordUpdateRequestDto } from '../password-update-request.dto';

describe('PasswordUpdateRequestDto', () => {
	it('should fail validation with missing currentPassword', () => {
		const data = {
			newPassword: 'newPassword123',
			mfaCode: '123456',
		};

		const result = PasswordUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path[0]).toBe('currentPassword');
	});

	it('should fail validation with missing newPassword', () => {
		const data = {
			currentPassword: 'oldPassword123',
			mfaCode: '123456',
		};

		const result = PasswordUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path[0]).toBe('newPassword');
	});

	it('should pass validation with missing mfaCode', () => {
		const data = {
			currentPassword: 'oldPassword123',
			newPassword: 'newPassword123',
		};

		const result = PasswordUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(true);
	});

	it('should pass validation with valid data', () => {
		const data = {
			currentPassword: 'oldPassword123',
			newPassword: 'newPassword123',
			mfaCode: '123456',
		};

		const result = PasswordUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(true);
	});
});
