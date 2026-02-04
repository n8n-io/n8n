import { mockInstance } from '@n8n/backend-test-utils';
import { SettingsRepository } from '@n8n/db';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

import { RoleService } from '@/services/role.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

describe('SecuritySettingsService', () => {
	const settingsRepository = mockInstance(SettingsRepository);
	const roleService = mockInstance(RoleService);
	const securitySettingsService = new SecuritySettingsService(settingsRepository, roleService);

	const PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('setPersonalSpacePublishing', () => {
		test('should upsert setting with true and add workflow:publish scope when enabled', async () => {
			await securitySettingsService.setPersonalSpaceSetting(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				true,
			);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: PERSONAL_SPACE_PUBLISHING_SETTING.key,
					value: 'true',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(roleService.addScopesToRole).toHaveBeenCalledWith(
				PERSONAL_OWNER_ROLE_SLUG,
				PERSONAL_SPACE_PUBLISHING_SETTING.scopes,
			);
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
		});

		test('should upsert setting with false and remove workflow:publish scope when disabled', async () => {
			await securitySettingsService.setPersonalSpaceSetting(
				PERSONAL_SPACE_PUBLISHING_SETTING,
				false,
			);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: PERSONAL_SPACE_PUBLISHING_SETTING.key,
					value: 'false',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(roleService.removeScopesFromRole).toHaveBeenCalledWith(
				PERSONAL_OWNER_ROLE_SLUG,
				PERSONAL_SPACE_PUBLISHING_SETTING.scopes,
			);
			expect(roleService.addScopesToRole).not.toHaveBeenCalled();
		});
	});

	describe('arePersonalSpaceSettingsEnabled (personalSpacePublishing)', () => {
		test('should return personalSpacePublishing true when setting does not exist (backward compatibility)', async () => {
			settingsRepository.findByKeys.mockResolvedValue([]);

			const result = await securitySettingsService.arePersonalSpaceSettingsEnabled();

			expect(settingsRepository.findByKeys).toHaveBeenCalledWith([
				PERSONAL_SPACE_PUBLISHING_SETTING.key,
				PERSONAL_SPACE_SHARING_SETTING.key,
			]);
			expect(result.personalSpacePublishing).toBe(true);
		});

		test('should return personalSpacePublishing true when setting value is "true"', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: PERSONAL_SPACE_PUBLISHING_SETTING.key, value: 'true' },
			] as never);

			const result = await securitySettingsService.arePersonalSpaceSettingsEnabled();

			expect(result.personalSpacePublishing).toBe(true);
		});

		test('should return personalSpacePublishing false when setting value is "false"', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: PERSONAL_SPACE_PUBLISHING_SETTING.key, value: 'false' },
			] as never);

			const result = await securitySettingsService.arePersonalSpaceSettingsEnabled();

			expect(result.personalSpacePublishing).toBe(false);
		});

		test('should return personalSpacePublishing true for values other than "false" (e.g. empty or invalid)', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: PERSONAL_SPACE_PUBLISHING_SETTING.key, value: 'invalid' },
			] as never);

			const result = await securitySettingsService.arePersonalSpaceSettingsEnabled();

			expect(result.personalSpacePublishing).toBe(true);
		});
	});

	describe('setPersonalSpaceSharing', () => {
		test('should upsert setting with true and add sharing scopes when enabled', async () => {
			await securitySettingsService.setPersonalSpaceSetting(PERSONAL_SPACE_SHARING_SETTING, true);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: PERSONAL_SPACE_SHARING_SETTING.key,
					value: 'true',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(roleService.addScopesToRole).toHaveBeenCalledWith(
				PERSONAL_OWNER_ROLE_SLUG,
				PERSONAL_SPACE_SHARING_SETTING.scopes,
			);
			expect(roleService.removeScopesFromRole).not.toHaveBeenCalled();
		});

		test('should upsert setting with false and remove sharing scopes when disabled', async () => {
			await securitySettingsService.setPersonalSpaceSetting(PERSONAL_SPACE_SHARING_SETTING, false);

			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{
					key: PERSONAL_SPACE_SHARING_SETTING.key,
					value: 'false',
					loadOnStartup: true,
				},
				['key'],
			);
			expect(roleService.removeScopesFromRole).toHaveBeenCalledWith(
				PERSONAL_OWNER_ROLE_SLUG,
				PERSONAL_SPACE_SHARING_SETTING.scopes,
			);
			expect(roleService.addScopesToRole).not.toHaveBeenCalled();
		});
	});

	describe('arePersonalSpaceSettingsEnabled (personalSpaceSharing)', () => {
		test('should return personalSpaceSharing true when setting does not exist (backward compatibility)', async () => {
			settingsRepository.findByKeys.mockResolvedValue([]);

			const result = await securitySettingsService.arePersonalSpaceSettingsEnabled();

			expect(settingsRepository.findByKeys).toHaveBeenCalledWith([
				PERSONAL_SPACE_PUBLISHING_SETTING.key,
				PERSONAL_SPACE_SHARING_SETTING.key,
			]);
			expect(result.personalSpaceSharing).toBe(true);
		});

		test('should return personalSpaceSharing true when setting value is "true"', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: PERSONAL_SPACE_SHARING_SETTING.key, value: 'true' },
			] as never);

			const result = await securitySettingsService.arePersonalSpaceSettingsEnabled();

			expect(result.personalSpaceSharing).toBe(true);
		});

		test('should return personalSpaceSharing false when setting value is "false"', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: PERSONAL_SPACE_SHARING_SETTING.key, value: 'false' },
			] as never);

			const result = await securitySettingsService.arePersonalSpaceSettingsEnabled();

			expect(result.personalSpaceSharing).toBe(false);
		});

		test('should return personalSpaceSharing true for values other than "false" (e.g. empty or invalid)', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: PERSONAL_SPACE_SHARING_SETTING.key, value: '' },
			] as never);

			const result = await securitySettingsService.arePersonalSpaceSettingsEnabled();

			expect(result.personalSpaceSharing).toBe(true);
		});
	});
});
