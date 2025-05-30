import type { OidcConfigDto } from '@n8n/api-types';
import { AuthIdentityRepository, SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';

import config from '@/config';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

import {
	OIDC_CLIENT_SECRET_REACTED_VALUE,
	OIDC_LOGIN_ENABLED,
	OIDC_PREFERENCES_DB_KEY,
} from './constants';
import {
	getCurrentAuthenticationMethod,
	isEmailCurrentAuthenticationMethod,
	isOidcCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '../sso-helpers';

const DEFAULT_OIDC_CONFIG: OidcConfigDto = {
	clientId: '',
	clientSecret: '',
	discoveryEndpoint: '',
	loginEnabled: false,
};

@Service()
export class OidcService {
	constructor(
		private settingsRepository: SettingsRepository,
		private authIdentityRepository: AuthIdentityRepository,
		private readonly cipher: Cipher,
	) {}

	async init() {
		const oidcConfig = await this.loadConfig();
		await this.setOidcLoginEnabled(oidcConfig.loginEnabled);
	}

	async loadConfig(decryptSecret = false): Promise<OidcConfigDto> {
		const currentConfig = await this.settingsRepository.findOneBy({
			key: OIDC_PREFERENCES_DB_KEY,
		});

		if (currentConfig) {
			const oidcConfig = jsonParse<OidcConfigDto>(currentConfig.value);

			if (oidcConfig.clientSecret && decryptSecret) {
				oidcConfig.clientSecret = this.cipher.decrypt(oidcConfig.clientSecret);
			}
			return oidcConfig;
		} else {
			await this.settingsRepository.save({
				key: OIDC_PREFERENCES_DB_KEY,
				value: JSON.stringify(DEFAULT_OIDC_CONFIG),
				loadOnStartup: true,
			});
			return DEFAULT_OIDC_CONFIG;
		}
	}

	async updateConfig(newConfig: OidcConfigDto) {
		const oidcConfig: Record<string, string | boolean> = {
			clientId: newConfig.clientId,
			discoveryEndpoint: newConfig.discoveryEndpoint,
			loginEnabled: newConfig.loginEnabled,
		};

		const existingConfig = await this.loadConfig();

		if (newConfig.clientSecret !== OIDC_CLIENT_SECRET_REACTED_VALUE) {
			oidcConfig.clientSecret = this.cipher.encrypt(newConfig.clientSecret);
		} else {
			oidcConfig.clientSecret = existingConfig.clientSecret;
		}

		await this.settingsRepository.update(
			{
				key: OIDC_PREFERENCES_DB_KEY,
			},
			{ value: JSON.stringify(oidcConfig) },
		);

		if (existingConfig.loginEnabled && !newConfig.loginEnabled) {
			await this.deleteAllOidcIdentities();
		}

		await this.setOidcLoginEnabled(newConfig.loginEnabled);
	}

	private async setOidcLoginEnabled(enabled: boolean): Promise<void> {
		if (isEmailCurrentAuthenticationMethod() || isOidcCurrentAuthenticationMethod()) {
			if (enabled) {
				config.set(OIDC_LOGIN_ENABLED, true);
				await setCurrentAuthenticationMethod('oidc');
			} else if (!enabled) {
				config.set(OIDC_LOGIN_ENABLED, false);
				await setCurrentAuthenticationMethod('email');
			}
		} else {
			throw new InternalServerError(
				`Cannot switch OIDC login enabled state when an authentication method other than email or OIDC is active (current: ${getCurrentAuthenticationMethod()})`,
			);
		}
	}

	private async deleteAllOidcIdentities() {
		await this.authIdentityRepository.delete({
			providerType: 'oidc',
		});
	}
}
