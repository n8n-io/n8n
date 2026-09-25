import { mockInstance } from '@n8n/backend-test-utils';
import {
	SettingsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';

import { EventService } from '@/events/event.service';
import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { RoleService } from '@/services/role.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

describe('SecuritySettingsService', () => {
	const settingsRepository = mockInstance(SettingsRepository);
	const roleService = mockInstance(RoleService);
	const workflowRepository = mockInstance(WorkflowRepository);
	const sharedWorkflowRepository = mockInstance(SharedWorkflowRepository);
	const sharedCredentialsRepository = mockInstance(SharedCredentialsRepository);
	const instanceRedactionEnforcementService = mockInstance(InstanceRedactionEnforcementService);
	const eventService = mockInstance(EventService);
	const securitySettingsService = new SecuritySettingsService(
		settingsRepository,
		roleService,
		workflowRepository,
		sharedWorkflowRepository,
		sharedCredentialsRepository,
		instanceRedactionEnforcementService,
		eventService,
	);

	const actor = {
		id: 'user-1',
		email: 'admin@n8n.io',
		firstName: 'Admin',
		lastName: 'User',
		role: { slug: 'global:owner' },
	};

	const PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
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

	describe('getPublishedPersonalWorkflowsCount', () => {
		test('should delegate to workflowRepository.getPublishedPersonalWorkflowsCount', async () => {
			workflowRepository.getPublishedPersonalWorkflowsCount.mockResolvedValue(5);

			const result = await securitySettingsService.getPublishedPersonalWorkflowsCount();

			expect(workflowRepository.getPublishedPersonalWorkflowsCount).toHaveBeenCalled();
			expect(result).toBe(5);
		});

		test('should return 0 when repository returns 0', async () => {
			workflowRepository.getPublishedPersonalWorkflowsCount.mockResolvedValue(0);

			const result = await securitySettingsService.getPublishedPersonalWorkflowsCount();

			expect(result).toBe(0);
		});
	});

	describe('getSharedPersonalWorkflowsCount', () => {
		test('should delegate to sharedWorkflowRepository.getSharedPersonalWorkflowsCount', async () => {
			sharedWorkflowRepository.getSharedPersonalWorkflowsCount.mockResolvedValue(12);

			const result = await securitySettingsService.getSharedPersonalWorkflowsCount();

			expect(sharedWorkflowRepository.getSharedPersonalWorkflowsCount).toHaveBeenCalled();
			expect(result).toBe(12);
		});

		test('should return 0 when repository returns 0', async () => {
			sharedWorkflowRepository.getSharedPersonalWorkflowsCount.mockResolvedValue(0);

			const result = await securitySettingsService.getSharedPersonalWorkflowsCount();

			expect(result).toBe(0);
		});
	});

	describe('getSharedPersonalCredentialsCount', () => {
		test('should delegate to sharedCredentialsRepository.getSharedPersonalCredentialsCount', async () => {
			sharedCredentialsRepository.getSharedPersonalCredentialsCount.mockResolvedValue(5);

			const result = await securitySettingsService.getSharedPersonalCredentialsCount();

			expect(sharedCredentialsRepository.getSharedPersonalCredentialsCount).toHaveBeenCalled();
			expect(result).toBe(5);
		});

		test('should return 0 when repository returns 0', async () => {
			sharedCredentialsRepository.getSharedPersonalCredentialsCount.mockResolvedValue(0);

			const result = await securitySettingsService.getSharedPersonalCredentialsCount();

			expect(result).toBe(0);
		});
	});

	describe('getSecuritySettings', () => {
		test('assembles personal-space settings, counts and redaction floor', async () => {
			settingsRepository.findByKeys.mockResolvedValue([
				{ key: PERSONAL_SPACE_PUBLISHING_SETTING.key, value: 'true' },
				{ key: PERSONAL_SPACE_SHARING_SETTING.key, value: 'false' },
			] as never);
			workflowRepository.getPublishedPersonalWorkflowsCount.mockResolvedValue(5);
			sharedWorkflowRepository.getSharedPersonalWorkflowsCount.mockResolvedValue(12);
			sharedCredentialsRepository.getSharedPersonalCredentialsCount.mockResolvedValue(3);
			instanceRedactionEnforcementService.get.mockResolvedValue('production');

			const result = await securitySettingsService.getSecuritySettings();

			expect(result).toEqual({
				personalSpacePublishing: true,
				personalSpaceSharing: false,
				publishedPersonalWorkflowsCount: 5,
				sharedPersonalWorkflowsCount: 12,
				sharedPersonalCredentialsCount: 3,
				redactionEnforcement: { floor: 'production' },
			});
		});
	});

	describe('updateSecuritySettings', () => {
		test('updates only personalSpacePublishing and emits its policy event', async () => {
			const result = await securitySettingsService.updateSecuritySettings(
				{ personalSpacePublishing: false },
				actor,
			);

			expect(result).toEqual({ personalSpacePublishing: false });
			expect(settingsRepository.upsert).toHaveBeenCalledWith(
				{ key: PERSONAL_SPACE_PUBLISHING_SETTING.key, value: 'false', loadOnStartup: true },
				['key'],
			);
			expect(eventService.emit).toHaveBeenCalledWith('instance-policies-updated', {
				user: actor,
				settingName: 'workflow_publishing',
				value: false,
			});
		});

		test('updates only personalSpaceSharing and emits its policy event', async () => {
			const result = await securitySettingsService.updateSecuritySettings(
				{ personalSpaceSharing: true },
				actor,
			);

			expect(result).toEqual({ personalSpaceSharing: true });
			expect(eventService.emit).toHaveBeenCalledWith('instance-policies-updated', {
				user: actor,
				settingName: 'workflow_sharing',
				value: true,
			});
		});

		test('does nothing and emits nothing when no fields are provided', async () => {
			const result = await securitySettingsService.updateSecuritySettings({}, actor);

			expect(result).toEqual({});
			expect(settingsRepository.upsert).not.toHaveBeenCalled();
			expect(instanceRedactionEnforcementService.set).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		});

		test('normalizes the actor to the minimal audit envelope', async () => {
			await securitySettingsService.updateSecuritySettings({ personalSpacePublishing: true }, {
				id: 'user-1',
				email: 'admin@n8n.io',
				firstName: 'Admin',
				lastName: 'User',
				role: { slug: 'global:owner' },
				password: 'secret-hash',
			} as never);

			const [, payload] = eventService.emit.mock.calls[0];
			expect(payload).not.toHaveProperty('user.password');
			expect(payload).toMatchObject({
				user: {
					id: 'user-1',
					email: 'admin@n8n.io',
					firstName: 'Admin',
					lastName: 'User',
					role: { slug: 'global:owner' },
				},
			});
		});

		describe('redaction enforcement', () => {
			test('persists the floor and emits both events when it changes', async () => {
				instanceRedactionEnforcementService.get.mockResolvedValue('off');

				const result = await securitySettingsService.updateSecuritySettings(
					{ redactionEnforcement: { floor: 'all' } },
					actor,
				);

				expect(result).toEqual({ redactionEnforcement: { floor: 'all' } });
				expect(instanceRedactionEnforcementService.set).toHaveBeenCalledWith('all');
				expect(eventService.emit).toHaveBeenCalledWith('redaction-enforcement-updated', {
					user: actor,
					before: 'off',
					after: 'all',
				});
				expect(eventService.emit).toHaveBeenCalledWith('instance-policies-updated', {
					user: actor,
					settingName: 'data_redaction_enforcement_floor',
					value: 'all',
				});
			});

			test('reports the production-only floor as `production`', async () => {
				instanceRedactionEnforcementService.get.mockResolvedValue('off');

				await securitySettingsService.updateSecuritySettings(
					{ redactionEnforcement: { floor: 'production' } },
					actor,
				);

				expect(instanceRedactionEnforcementService.set).toHaveBeenCalledWith('production');
				expect(eventService.emit).toHaveBeenCalledWith('instance-policies-updated', {
					user: actor,
					settingName: 'data_redaction_enforcement_floor',
					value: 'production',
				});
			});

			test('does not persist or emit when the floor is unchanged', async () => {
				instanceRedactionEnforcementService.get.mockResolvedValue('all');

				const result = await securitySettingsService.updateSecuritySettings(
					{ redactionEnforcement: { floor: 'all' } },
					actor,
				);

				expect(instanceRedactionEnforcementService.set).not.toHaveBeenCalled();
				expect(eventService.emit).not.toHaveBeenCalled();
				// The applied subset still echoes the requested floor.
				expect(result.redactionEnforcement).toEqual({ floor: 'all' });
			});
		});

		test('applies personal-space and redaction changes together', async () => {
			instanceRedactionEnforcementService.get.mockResolvedValue('off');

			const result = await securitySettingsService.updateSecuritySettings(
				{ personalSpacePublishing: true, redactionEnforcement: { floor: 'production' } },
				actor,
			);

			expect(result).toEqual({
				personalSpacePublishing: true,
				redactionEnforcement: { floor: 'production' },
			});
			expect(settingsRepository.upsert).toHaveBeenCalledTimes(1);
			expect(instanceRedactionEnforcementService.set).toHaveBeenCalledTimes(1);
		});
	});
});
