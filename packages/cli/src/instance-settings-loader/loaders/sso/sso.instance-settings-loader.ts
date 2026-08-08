import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import {
	getCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

import { OidcInstanceSettingsLoader } from './oidc.instance-settings-loader';
import { ProvisioningInstanceSettingsLoader } from './provisioning.instance-settings-loader';
import { SamlInstanceSettingsLoader } from './saml.instance-settings-loader';
import { InstanceBootstrappingError } from '../../instance-bootstrapping.error';

@Service()
export class SsoInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly samlLoader: SamlInstanceSettingsLoader,
		private readonly oidcLoader: OidcInstanceSettingsLoader,
		private readonly provisioningLoader: ProvisioningInstanceSettingsLoader,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.ssoManagedByEnv) {
			this.logger.debug('ssoManagedByEnv is disabled — skipping SSO config');
			return 'skipped';
		}

		const { samlLoginEnabled, oidcLoginEnabled } = this.config;

		if (samlLoginEnabled && oidcLoginEnabled) {
			throw new InstanceBootstrappingError(
				'N8N_SSO_SAML_LOGIN_ENABLED and N8N_SSO_OIDC_LOGIN_ENABLED cannot both be true. Only one SSO protocol can be enabled at a time.',
			);
		}

		await this.samlLoader.apply();
		await this.oidcLoader.apply();

		if (samlLoginEnabled || oidcLoginEnabled) {
			await this.provisioningLoader.apply();
		}

		await this.syncAuthMethod();

		return 'created';
	}

	private async syncAuthMethod(): Promise<void> {
		const { samlLoginEnabled, oidcLoginEnabled } = this.config;

		if (samlLoginEnabled) {
			await setCurrentAuthenticationMethod('saml');
			this.logger.debug(
				'Switching authentication method to SAML. Current authentication method: saml',
			);
			return;
		}

		if (oidcLoginEnabled) {
			await setCurrentAuthenticationMethod('oidc');
			this.logger.debug(
				'Switching authentication method to OIDC. Current authentication method: oidc',
			);
			return;
		}

		const current = getCurrentAuthenticationMethod();
		if (current === 'saml' || current === 'oidc') {
			await setCurrentAuthenticationMethod('email');
			this.logger.debug(
				`Switching authentication method to email because SAML or OIDC is disabled. Current authentication method: ${current}`,
			);
		}
	}
}
