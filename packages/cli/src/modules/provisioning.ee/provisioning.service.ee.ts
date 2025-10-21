import { ProvisioningConfigDto, Role, ROLE, roleSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository, User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { PROVISIONING_PREFERENCES_DB_KEY } from './constants';
import { Not } from '@n8n/typeorm';

@Service()
export class ProvisioningService {
	private provisioningConfig: ProvisioningConfigDto;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly userRepository: UserRepository,
		private readonly logger: Logger,
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

	async provisionInstanceRoleForUser(user: User, role: unknown) {
		if (typeof role !== 'string') {
			this.logger.warn(
				`Invalid role type: ${typeof role} expected string, skipping instance role provisioning`,
				{ userId: user.id, role },
			);
			return;
		}

		let parsedRole: Role;

		try {
			parsedRole = roleSchema.parse(role);
		} catch (error) {
			this.logger.warn(
				`Invalid role: ${role} provided, expected oneof ${Object.values(ROLE).join(', ')}, skipping instance role provisioning`,
				{ userId: user.id, role, error },
			);
			return;
		}

		/*
		 * If the user is changing from an owner to a non-owner role,
		 * we need to check if they are the last owner to avoid an instance losing its only owner
		 */
		if (user.role.slug === ROLE.Owner && parsedRole !== ROLE.Owner) {
			const otherOwners = await this.userRepository.count({
				where: { role: { slug: ROLE.Owner }, id: Not(user.id) },
			});

			if (otherOwners === 0) {
				this.logger.warn(
					`Cannot remove last owner role: ${ROLE.Owner} from user: ${user.id}, skipping instance role provisioning`,
					{ userId: user.id, role },
				);
				return;
			}
		}

		// No need to update record if the role hasn't changed
		if (user.role.slug !== parsedRole) {
			await this.userRepository.update(user.id, { role: { slug: parsedRole } });
		}
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
