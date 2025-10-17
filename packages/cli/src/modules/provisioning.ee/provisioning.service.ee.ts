import { ProvisioningConfigDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { PROVISIONING_PREFERENCES_DB_KEY } from './constants';
import { ProvisioningConfigPatchDto } from '@n8n/api-types/src/dto/provisioning/config.dto';
import { OnPubSubEvent } from '@n8n/decorators';
import { Publisher } from '@/scaling/pubsub/publisher.service';

@Service()
export class ProvisioningService {
	private provisioningConfig: ProvisioningConfigDto;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly logger: Logger,
		private readonly publisher: Publisher,
	) {}

	async init() {
		this.provisioningConfig = await this.loadConfig();
	}

	async getConfig(): Promise<ProvisioningConfigDto> {
		if (!this.provisioningConfig) {
			this.provisioningConfig = await this.loadConfig();
		}

		return this.provisioningConfig;
	}

	async patchConfig(rawConfig: unknown): Promise<ProvisioningConfigDto> {
		const patchConfig = ProvisioningConfigPatchDto.parse(rawConfig);
		const currentConfig = await this.getConfig();

		const supportedPatchFields = [
			'scopesProvisionInstanceRole',
			'scopesProvisionProjectRoles',
			'scopesProvisioningFrequency',
			'scopesName',
			'scopesInstanceRoleClaimName',
			'scopesProjectsRolesClaimName',
		] as const;

		let updatedConfig: Record<string, unknown> = {
			...currentConfig,
		};

		for (const field of supportedPatchFields) {
			updatedConfig = this.applyPatchField(updatedConfig, field, patchConfig[field]);
		}

		ProvisioningConfigDto.parse(updatedConfig);

		await this.settingsRepository.update(
			{ key: PROVISIONING_PREFERENCES_DB_KEY },
			{ value: JSON.stringify(updatedConfig) },
		);

		await this.publisher.publishCommand({ command: 'reload-sso-provisioning-configuration' });
		this.provisioningConfig = await this.loadConfig();
		return this.getConfig();
	}

	applyPatchField(
		config: Record<string, unknown>,
		field: keyof ProvisioningConfigDto,
		value: unknown,
	) {
		if (value === null) {
			// removes the config value if it null, meaning it should be unset, and default back to env provided config
			delete config[field];
		}

		if (value !== undefined && value !== null) {
			config[field] = value;
		}

		return config;
	}

	@OnPubSubEvent('reload-sso-provisioning-configuration')
	async handleReloadSsoProvisioningConfiguration() {
		this.provisioningConfig = await this.loadConfig();
	}

	async loadConfigurationFromDatabase(): Promise<ProvisioningConfigDto | undefined> {
		const configFromDB = await this.settingsRepository.findByKey(PROVISIONING_PREFERENCES_DB_KEY);

		if (configFromDB) {
			try {
				const configValue = jsonParse<ProvisioningConfigDto>(configFromDB.value);

				return ProvisioningConfigDto.parse(configValue);
			} catch (error) {
				this.logger.warn(
					'Failed to load Provisioning configuration from database, falling back to default configuration.',

					{ error },
				);
			}
		}
		return undefined;
	}

	async loadConfig(): Promise<ProvisioningConfigDto> {
		const envProvidedConfig = ProvisioningConfigDto.parse(this.globalConfig.sso.provisioning);

		const dbProvidedConfig = await this.loadConfigurationFromDatabase();

		if (dbProvidedConfig) {
			return {
				...envProvidedConfig,
				...dbProvidedConfig,
			};
		}

		return envProvidedConfig;
	}
}
