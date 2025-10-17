import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { type SettingsRepository } from '@n8n/db';
import { type GlobalConfig } from '@n8n/config';
import { PROVISIONING_PREFERENCES_DB_KEY } from '../constants';
import { type ProvisioningConfigDto } from '@n8n/api-types';
import { type Publisher } from '@/scaling/pubsub/publisher.service';

const globalConfig = mock<GlobalConfig>();
const settingsRepository = mock<SettingsRepository>();
const logger = mock<Logger>();
const publisher = mock<Publisher>();

const provisioningService = new ProvisioningService(
	globalConfig,
	settingsRepository,
	logger,
	publisher,
);

describe('ProvisioningService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const provisioningConfigDto: ProvisioningConfigDto = {
		scopesProvisionInstanceRole: true,
		scopesProvisionProjectRoles: true,
		scopesProvisioningFrequency: 'every_login',
		scopesName: 'n8n_test_scope',
		scopesInstanceRoleClaimName: 'n8n_test_instance_role',
		scopesProjectsRolesClaimName: 'n8n_test_projects_roles',
	};

	describe('init', () => {
		it('should set provisioning config from the result of loadConfig', async () => {
			const originStateLoadConfig = provisioningService.loadConfig;

			provisioningService.loadConfig = jest.fn().mockResolvedValue({ foo: 'bar' });

			await provisioningService.init();
			// @ts-expect-error - provisioningConfig is private and only accessible within the class
			expect(provisioningService.provisioningConfig).toEqual({ foo: 'bar' });

			provisioningService.loadConfig = originStateLoadConfig;
		});
	});

	describe('getConfig', () => {
		it('should set provisioning config from the result of loadConfig, then return it if it is not set', async () => {
			const originStateLoadConfig = provisioningService.loadConfig;
			// @ts-expect-error - provisioningConfig is private and only accessible within the class
			provisioningService.provisioningConfig = undefined;

			provisioningService.loadConfig = jest.fn().mockResolvedValue({ foo: 'bar' });

			const config = await provisioningService.getConfig();
			expect(config).toEqual({ foo: 'bar' });
			expect(provisioningService.loadConfig).toHaveBeenCalledTimes(1);

			provisioningService.loadConfig = originStateLoadConfig;
		});

		it('should return the provisioning config', async () => {
			// @ts-expect-error - provisioningConfig is private and only accessible within the class
			provisioningService.provisioningConfig = { foo: 'bar' };

			const config = await provisioningService.getConfig();
			expect(config).toEqual({ foo: 'bar' });
		});
	});

	describe('loadConfigurationFromDatabase', () => {
		it('should return the provisioning config from the database', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(provisioningConfigDto),
				loadOnStartup: true,
			});

			const config = await provisioningService.loadConfigurationFromDatabase();
			expect(config).toEqual(provisioningConfigDto);
		});

		it('should return undefined if the provisioning config is not found in the database', async () => {
			settingsRepository.findByKey.mockResolvedValue(null);

			const config = await provisioningService.loadConfigurationFromDatabase();
			expect(config).toBeUndefined();
		});

		it('should return undefined if the provisioning config is invalid', async () => {
			settingsRepository.findByKey.mockResolvedValue({
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: 'invalid',
				loadOnStartup: true,
			});

			const config = await provisioningService.loadConfigurationFromDatabase();
			expect(config).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to load Provisioning configuration from database, falling back to default configuration.',
				{ error: expect.any(Error) },
			);
		});
	});

	describe('loadConfig', () => {
		it('should return the provisioning config from the database, overriding the environment configuration', async () => {
			globalConfig.sso.provisioning = provisioningConfigDto;

			const overriddenConfig = {
				scopesProvisionInstanceRole: false,
				scopesProvisionProjectRoles: false,
				scopesProvisioningFrequency: 'never',
				scopesName: 'n8n_test_scope_overridden',
				scopesInstanceRoleClaimName: 'n8n_test_instance_role_overridden',
				scopesProjectsRolesClaimName: 'n8n_test_projects_roles_overridden',
			};
			settingsRepository.findByKey.mockResolvedValue({
				key: PROVISIONING_PREFERENCES_DB_KEY,
				value: JSON.stringify(overriddenConfig),
				loadOnStartup: true,
			});

			const config = await provisioningService.loadConfig();
			expect(config).toEqual(overriddenConfig);
		});

		it('should return the environment configuration if the database configuration is not found', async () => {
			globalConfig.sso.provisioning = provisioningConfigDto;

			settingsRepository.findByKey.mockResolvedValue(null);

			const config = await provisioningService.loadConfig();
			expect(config).toEqual(provisioningConfigDto);
		});
	});

	describe('applyPatchField', () => {
		it('should apply the patch field to the provisioning config', () => {
			const config = provisioningService.applyPatchField(
				{ ...provisioningConfigDto },
				'scopesProvisionInstanceRole',
				false,
			);
			expect(config).toEqual({ ...provisioningConfigDto, scopesProvisionInstanceRole: false });
		});

		it('should remove the field if the value is null', () => {
			const config = provisioningService.applyPatchField(
				{ ...provisioningConfigDto },
				'scopesProvisionInstanceRole',
				null,
			);
			expect(config).toEqual({ ...provisioningConfigDto, scopesProvisionInstanceRole: undefined });
		});
	});

	describe('handleReloadSsoProvisioningConfiguration', () => {
		it('should reload the provisioning config', async () => {
			const originStateLoadConfig = provisioningService.loadConfig;
			provisioningService.loadConfig = jest.fn().mockResolvedValue({ foo: 'bar' });

			await provisioningService.handleReloadSsoProvisioningConfiguration();
			// @ts-expect-error - provisioningConfig is private and only accessible within the class
			expect(provisioningService.provisioningConfig).toEqual({ foo: 'bar' });

			provisioningService.loadConfig = originStateLoadConfig;
		});
	});

	describe('patchConfig', () => {
		it('should patch the provisioning config, sending out pubsub updates for other nodes to reload', async () => {
			const originStateLoadConfig = provisioningService.loadConfig;
			const originStateGetConfig = provisioningService.getConfig;

			provisioningService.getConfig = jest
				.fn()
				.mockResolvedValueOnce(provisioningConfigDto)
				.mockResolvedValueOnce({ ...provisioningConfigDto, scopesProvisionInstanceRole: false });
			provisioningService.loadConfig = jest
				.fn()
				.mockResolvedValue({ ...provisioningConfigDto, scopesProvisionInstanceRole: false });

			const config = await provisioningService.patchConfig({ scopesProvisionInstanceRole: false });
			expect(config).toEqual({ ...provisioningConfigDto, scopesProvisionInstanceRole: false });
			expect(provisioningService.loadConfig).toHaveBeenCalledTimes(1);
			expect(provisioningService.getConfig).toHaveBeenCalledTimes(2);
			expect(settingsRepository.update).toHaveBeenCalledTimes(1);
			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-sso-provisioning-configuration',
			});

			provisioningService.loadConfig = originStateLoadConfig;
			provisioningService.getConfig = originStateGetConfig;
		});
	});
});
