import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

export const REDIRECT_LOGIN_TO_SSO_SETTING_KEY = 'sso.redirectLoginToSso';

/**
 * Manages the admin-configurable "redirect login page to SSO" setting. The value
 * is persisted in the database and mirrored into the runtime config; the env var
 * `N8N_SSO_REDIRECT_LOGIN_TO_SSO` is the default when nothing has been persisted.
 */
@Service()
export class SsoSettingsService {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	async setRedirectLoginToSso(enabled: boolean): Promise<void> {
		// `loadOnStartup: false` — this key lives in GlobalConfig, not the legacy
		// config schema, so the generic startup loader must not try to apply it.
		// Startup hydration goes through `reloadRedirectLoginToSso()` instead.
		await this.settingsRepository.save(
			{ key: REDIRECT_LOGIN_TO_SSO_SETTING_KEY, value: enabled.toString(), loadOnStartup: false },
			{ transaction: false },
		);
		this.globalConfig.sso.redirectLoginToSso = enabled;
		await this.broadcastReload();
	}

	/**
	 * Apply the persisted value into the runtime config. Called on startup and when
	 * another main instance broadcasts a change.
	 */
	async reloadRedirectLoginToSso(): Promise<void> {
		const setting = await this.settingsRepository.findByKey(REDIRECT_LOGIN_TO_SSO_SETTING_KEY);
		if (!setting) return;

		if (setting.value === 'true' || setting.value === 'false') {
			this.globalConfig.sso.redirectLoginToSso = setting.value === 'true';
		} else {
			this.logger.warn(
				`Invalid value for setting "${REDIRECT_LOGIN_TO_SSO_SETTING_KEY}", keeping the current configuration`,
				{ value: setting.value },
			);
		}
	}

	@OnPubSubEvent('reload-sso-login-redirect')
	async handleReloadCommand(): Promise<void> {
		await this.reloadRedirectLoginToSso();
	}

	private async broadcastReload(): Promise<void> {
		if (this.instanceSettings.isMultiMain) {
			const { Publisher } = await import('@/scaling/pubsub/publisher.service.js');
			await Container.get(Publisher).publishCommand({ command: 'reload-sso-login-redirect' });
		}
	}
}
