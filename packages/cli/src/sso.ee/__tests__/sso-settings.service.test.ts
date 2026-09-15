import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { REDIRECT_LOGIN_TO_SSO_SETTING_KEY, SsoSettingsService } from '../sso-settings.service';

describe('SsoSettingsService', () => {
	let globalConfig: GlobalConfig;
	let settingsRepository: SettingsRepository;
	let instanceSettings: InstanceSettings;
	let logger: Logger;
	let service: SsoSettingsService;

	beforeEach(() => {
		globalConfig = { sso: { redirectLoginToSso: true } } as GlobalConfig;
		settingsRepository = mock<SettingsRepository>();
		instanceSettings = mock<InstanceSettings>({ isMultiMain: false });
		logger = mock<Logger>();
		service = new SsoSettingsService(globalConfig, settingsRepository, instanceSettings, logger);
	});

	describe('setRedirectLoginToSso', () => {
		it('persists the value with loadOnStartup false and mirrors it into config', async () => {
			await service.setRedirectLoginToSso(false);

			expect(globalConfig.sso.redirectLoginToSso).toBe(false);
			expect(settingsRepository.save).toHaveBeenCalledWith(
				{ key: REDIRECT_LOGIN_TO_SSO_SETTING_KEY, value: 'false', loadOnStartup: false },
				{ transaction: false },
			);
		});
	});

	describe('reloadRedirectLoginToSso', () => {
		it.each([
			['true', true],
			['false', false],
		])('applies persisted value "%s" into config', async (value, expected) => {
			settingsRepository.findByKey = vi.fn().mockResolvedValue({ value });

			await service.reloadRedirectLoginToSso();

			expect(globalConfig.sso.redirectLoginToSso).toBe(expected);
		});

		it('keeps the current config and warns on a malformed value', async () => {
			settingsRepository.findByKey = vi.fn().mockResolvedValue({ value: 'garbage' });

			await service.reloadRedirectLoginToSso();

			expect(globalConfig.sso.redirectLoginToSso).toBe(true);
			expect(logger.warn).toHaveBeenCalled();
		});

		it('leaves config untouched when nothing is persisted', async () => {
			settingsRepository.findByKey = vi.fn().mockResolvedValue(null);

			await service.reloadRedirectLoginToSso();

			expect(globalConfig.sso.redirectLoginToSso).toBe(true);
		});
	});
});
