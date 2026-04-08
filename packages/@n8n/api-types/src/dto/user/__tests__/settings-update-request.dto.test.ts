import { SettingsUpdateRequestDto } from '../settings-update-request.dto';

describe('SettingsUpdateRequestDto', () => {
	it('should pass validation with missing userActivated', () => {
		const data = {
			allowSSOManualLogin: false,
		};

		const result = SettingsUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(true);
	});

	it('should pass validation with missing allowSSOManualLogin', () => {
		const data = {
			userActivated: true,
		};

		const result = SettingsUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(true);
	});

	it('should pass validation with missing userActivated and allowSSOManualLogin', () => {
		const data = {};

		const result = SettingsUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(true);
	});

	it('should fail validation with invalid userActivated', () => {
		const data = {
			userActivated: 'invalid',
			allowSSOManualLogin: false,
		};

		const result = SettingsUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path[0]).toBe('userActivated');
		expect(result.error?.issues[0].message).toBe('Expected boolean, received string');
	});

	it('should fail validation with invalid allowSSOManualLogin', () => {
		const data = {
			userActivated: true,
			allowSSOManualLogin: 'invalid',
		};

		const result = SettingsUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path[0]).toBe('allowSSOManualLogin');
		expect(result.error?.issues[0].message).toBe('Expected boolean, received string');
	});

	it('should pass validation with valid data', () => {
		const data = {
			userActivated: true,
			allowSSOManualLogin: false,
		};

		const result = SettingsUpdateRequestDto.safeParse(data);

		expect(result.success).toBe(true);
	});
});
