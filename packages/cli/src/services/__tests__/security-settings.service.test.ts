import { mockInstance } from '@n8n/backend-test-utils';
import { SettingsRepository } from '@n8n/db';
import { PERSONAL_SPACE_PUBLISHING_SETTING_KEY } from '@n8n/permissions';

import { RoleService } from '@/services/role.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

describe('SecuritySettingsService', () => {
	const settingsRepository = mockInstance(SettingsRepository);
	const roleService = mockInstance(RoleService);
	const securitySettingsService = new SecuritySettingsService(settingsRepository, roleService);

	const PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';
	const WORKFLOW_PUBLISH_SCOPE = 'workflow:publish';

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('setPersonalSpacePublishing', () => {
		test('should upsert setting with true and add workflow:publish scope when enabled', async () => {
			await securitySettingsService.setPersonalSpacePublishing(true);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: PERSONAL_SPACE_PUBLISHING_SETTING_KEY,
					value: 'true',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(roleService.addScopeToRole).toHaveBeenCalledWith(
				PERSONAL_OWNER_ROLE_SLUG,
				WORKFLOW_PUBLISH_SCOPE,
			);
			expect(roleService.removeScopeFromRole).not.toHaveBeenCalled();
		});

		test('should upsert setting with false and remove workflow:publish scope when disabled', async () => {
			await securitySettingsService.setPersonalSpacePublishing(false);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: PERSONAL_SPACE_PUBLISHING_SETTING_KEY,
					value: 'false',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(roleService.removeScopeFromRole).toHaveBeenCalledWith(
				PERSONAL_OWNER_ROLE_SLUG,
				WORKFLOW_PUBLISH_SCOPE,
			);
			expect(roleService.addScopeToRole).not.toHaveBeenCalled();
		});
	});

	describe('isPersonalSpacePublishingEnabled', () => {
		test('should return true when setting does not exist (backward compatibility) with original behaviour', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			const result = await securitySettingsService.isPersonalSpacePublishingEnabled();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith(
				PERSONAL_SPACE_PUBLISHING_SETTING_KEY,
			);
			expect(result).toBe(true);
		});

		test('should return true when setting value is "true"', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				key: PERSONAL_SPACE_PUBLISHING_SETTING_KEY,
				value: 'true',
			} as never);

			const result = await securitySettingsService.isPersonalSpacePublishingEnabled();

			expect(result).toBe(true);
		});

		test.each([
			{ value: 'false', description: '"false"' },
			{ value: 'invalid', description: 'an invalid string' },
			{ value: '', description: 'an empty string' },
		])('should return false when setting value is $description', async ({ value }) => {
			settingsRepository.findByKey.mockResolvedValue({
				key: PERSONAL_SPACE_PUBLISHING_SETTING_KEY,
				value,
			} as never);

			const result = await securitySettingsService.isPersonalSpacePublishingEnabled();

			expect(result).toBe(false);
		});
	});
});
