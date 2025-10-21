import { ProvisioningConfigDto, ProvisioningConfigPatchDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { PROVISIONING_PREFERENCES_DB_KEY } from './constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { type Publisher } from '@/scaling/pubsub/publisher.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ZodError } from 'zod';

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
		let patchConfig: ProvisioningConfigPatchDto;

		try {
			patchConfig = ProvisioningConfigPatchDto.parse(rawConfig);
		} catch (error) {
			if (error instanceof ZodError) {
				throw new BadRequestError(error.message);
			}

			throw error;
		}

		const currentConfig = await this.getConfig();

		const supportedPatchFields = [
			'scopesProvisionInstanceRole',
			'scopesProvisionProjectRoles',
			'scopesProvisioningFrequency',
			'scopesName',
			'scopesInstanceRoleClaimName',
			'scopesProjectsRolesClaimName',
		] as const;

		const updatedConfig: Record<string, unknown> = {
			...currentConfig,
			...patchConfig,
		};

		for (const supportedPatchField of supportedPatchFields) {
			if (patchConfig[supportedPatchField] === null) {
				delete updatedConfig[supportedPatchField];
			}
		}

		ProvisioningConfigDto.parse(updatedConfig);

		await this.settingsRepository.update(
			{ key: PROVISIONING_PREFERENCES_DB_KEY },
			{ value: JSON.stringify(updatedConfig) },
		);

		await this.publisher.publishCommand({ command: 'reload-sso-provisioning-configuration' });
		this.provisioningConfig = await this.loadConfig();
		return await this.getConfig();
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
