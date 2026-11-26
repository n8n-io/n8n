import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { AiPreferenceSettingsService } from '@/services/ai-preference-settings.service';

import { AiPreferencesInstanceSettingsLoader } from '../loaders/ai-preferences.instance-settings-loader';

describe('AiPreferencesInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const settingsService = mock<AiPreferenceSettingsService>();

	const createLoader = (config: Partial<InstanceSettingsLoaderConfig>) =>
		new AiPreferencesInstanceSettingsLoader(
			{
				preferencesManagedByEnv: false,
				preferencesEnabled: false,
				...config,
			} as InstanceSettingsLoaderConfig,
			settingsService,
			logger,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	it('ignores the value when the env does not manage preferences', async () => {
		const result = await createLoader({ preferencesEnabled: true }).run();

		expect(result).toBe('skipped');
		expect(settingsService.setEnabled).not.toHaveBeenCalled();
	});

	it.each([true, false])('saves %s when the env manages preferences', async (enabled) => {
		const result = await createLoader({
			preferencesManagedByEnv: true,
			preferencesEnabled: enabled,
		}).run();

		expect(result).toBe('created');
		expect(settingsService.setEnabled).toHaveBeenCalledWith(enabled);
	});
});
