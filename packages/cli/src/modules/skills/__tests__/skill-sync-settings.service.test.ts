import type { LicenseState } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { SkillSourceRepository } from '../database/repositories/skill-source.repository';
import { SkillSyncSettingsService } from '../services/skill-sync-settings.service';

const KEY = 'skills.skillSync.enabled';

function createService({
	enterprise = false,
	saved,
	hasSource = false,
	managedByEnv = false,
	envEnabled = false,
}: {
	enterprise?: boolean;
	saved?: boolean;
	hasSource?: boolean;
	managedByEnv?: boolean;
	envEnabled?: boolean;
} = {}) {
	const config = new InstanceSettingsLoaderConfig();
	config.skillSyncManagedByEnv = managedByEnv;
	config.skillSyncEnabled = envEnabled;
	const licenseState = mock<LicenseState>();
	licenseState.isEnterprisePlan.mockReturnValue(enterprise);
	const settingsRepository = mock<SettingsRepository>();
	settingsRepository.findByKeyInContext.mockResolvedValue(
		saved === undefined ? null : mock<Settings>({ key: KEY, value: String(saved) }),
	);
	const sourceRepository = mock<SkillSourceRepository>();
	sourceRepository.hasAnySource.mockResolvedValue(hasSource);
	const service = new SkillSyncSettingsService(
		config,
		licenseState,
		settingsRepository,
		sourceRepository,
	);
	return { service, licenseState, settingsRepository };
}

describe('SkillSyncSettingsService', () => {
	it.each([
		{ enterprise: false, expected: true },
		{ enterprise: true, expected: false },
	])(
		'is $expected with no saved value (enterprise: $enterprise)',
		async ({ enterprise, expected }) => {
			const { service } = createService({ enterprise });
			await service.init();

			expect(service.isEnabled()).toBe(expected);
		},
	);

	it.each([
		{ enterprise: false, saved: false },
		{ enterprise: true, saved: true },
	])(
		'uses the saved value (enterprise: $enterprise, saved: $saved)',
		async ({ enterprise, saved }) => {
			const { service } = createService({ enterprise, saved });
			await service.init();

			expect(service.isEnabled()).toBe(saved);
		},
	);

	it('follows a plan change while no value is saved', async () => {
		const { service, licenseState } = createService();
		await service.init();
		expect(service.isEnabled()).toBe(true);

		licenseState.isEnterprisePlan.mockReturnValue(true);

		expect(service.isEnabled()).toBe(false);
	});

	it.each([true, false])(
		'uses the env value when env manages the switch (env: %s)',
		async (envEnabled) => {
			const { service, settingsRepository } = createService({
				managedByEnv: true,
				envEnabled,
				saved: !envEnabled,
				enterprise: true,
				hasSource: true,
			});
			await service.init();

			expect(service.isManagedByEnv).toBe(true);
			expect(service.isEnabled()).toBe(envEnabled);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		},
	);

	it('keeps an enterprise instance that has a skill source on, and saves it', async () => {
		const { service, settingsRepository } = createService({ enterprise: true, hasSource: true });
		await service.init();

		expect(service.isEnabled()).toBe(true);
		expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(KEY, 'true', true, {});
	});

	it.each([
		{ enterprise: true, hasSource: false, saved: undefined },
		{ enterprise: false, hasSource: true, saved: undefined },
		{ enterprise: true, hasSource: true, saved: false },
	])(
		'saves nothing at startup (enterprise: $enterprise, source: $hasSource, saved: $saved)',
		async (options) => {
			const { service, settingsRepository } = createService(options);
			await service.init();

			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		},
	);

	it('saves a new value and uses it', async () => {
		const { service, settingsRepository } = createService({ saved: true });
		await service.init();

		await service.setEnabled(false);

		expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(KEY, 'false', true, {});
		expect(service.isEnabled()).toBe(false);
	});
});
