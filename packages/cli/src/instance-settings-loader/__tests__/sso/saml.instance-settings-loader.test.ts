import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { SamlInstanceSettingsLoader } from '../../loaders/sso/saml.instance-settings-loader';

describe('SamlInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const settingsRepository = mock<SettingsRepository>();

	const baseConfig: Partial<InstanceSettingsLoaderConfig> = {
		samlMetadata: '',
		samlMetadataUrl: '',
		samlLoginEnabled: false,
	};

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = { ...baseConfig, ...configOverrides } as InstanceSettingsLoaderConfig;
		return new SamlInstanceSettingsLoader(config, settingsRepository, logger);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
	});

	describe('when SAML login is enabled', () => {
		it('should throw when neither metadata nor metadataUrl is provided', async () => {
			const loader = createLoader({ samlLoginEnabled: true });

			await expect(loader.apply()).rejects.toThrow(
				'At least one of N8N_SSO_SAML_METADATA or N8N_SSO_SAML_METADATA_URL is required',
			);
		});

		it('should save preferences when valid config with metadata is provided', async () => {
			const loader = createLoader({
				samlLoginEnabled: true,
				samlMetadata: '<xml>metadata</xml>',
			});

			await loader.apply();

			expect(settingsRepository.save).toHaveBeenCalledWith({
				key: 'features.saml',
				value: JSON.stringify({ metadata: '<xml>metadata</xml>', loginEnabled: true }),
				loadOnStartup: true,
			});
		});

		it('should save preferences when valid config with metadataUrl is provided', async () => {
			const loader = createLoader({
				samlLoginEnabled: true,
				samlMetadataUrl: 'https://idp.example.com/metadata',
			});

			await loader.apply();

			const saved = JSON.parse(
				(settingsRepository.save.mock.calls[0][0] as { value: string }).value,
			);
			expect(saved.metadataUrl).toBe('https://idp.example.com/metadata');
			expect(saved.metadata).toBeUndefined();
		});
	});

	describe('when SAML login is disabled', () => {
		it('should write loginEnabled=false', async () => {
			const loader = createLoader({ samlLoginEnabled: false });

			await loader.apply();

			expect(settingsRepository.save).toHaveBeenCalledWith({
				key: 'features.saml',
				value: JSON.stringify({ loginEnabled: false }),
				loadOnStartup: true,
			});
		});

		it('should ignore SAML env vars and write loginEnabled=false', async () => {
			const loader = createLoader({
				samlLoginEnabled: false,
				samlMetadata: '<xml>metadata</xml>',
			});

			await loader.apply();

			expect(settingsRepository.save).toHaveBeenCalledWith({
				key: 'features.saml',
				value: JSON.stringify({ loginEnabled: false }),
				loadOnStartup: true,
			});
		});
	});
});
