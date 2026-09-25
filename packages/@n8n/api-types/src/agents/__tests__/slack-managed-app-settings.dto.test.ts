import { UpdateSlackManagedAppSettingsDto } from '../slack';

describe('UpdateSlackManagedAppSettingsDto', () => {
	const validSettings = {
		credentialId: 'bot-credential',
		name: 'Support Bot',
		description: 'Handles support requests',
		alwaysOnline: true,
	};

	it('accepts valid managed Slack app settings', () => {
		expect(UpdateSlackManagedAppSettingsDto.safeParse(validSettings).success).toBe(true);
	});

	it.each([
		[{ ...validSettings, name: '' }, 'name'],
		[{ ...validSettings, name: 'a'.repeat(81) }, 'name'],
		[{ ...validSettings, description: '' }, 'description'],
		[{ ...validSettings, description: 'a'.repeat(141) }, 'description'],
	])('rejects invalid settings %#', (settings, path) => {
		const result = UpdateSlackManagedAppSettingsDto.safeParse(settings);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.path).toContain(path);
		}
	});
});
