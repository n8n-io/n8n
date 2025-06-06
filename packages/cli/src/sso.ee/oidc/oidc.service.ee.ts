import type { OidcConfigDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthIdentityRepository, SettingsRepository, type User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import * as client from 'openid-client';

import config from '@/config';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { UrlService } from '@/services/url.service';

import {
	OIDC_CLIENT_SECRET_REDACTED_VALUE,
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

type OidcRuntimeConfig = Pick<OidcConfigDto, 'clientId' | 'clientSecret' | 'loginEnabled'> & {
	discoveryEndpoint: URL;
};

const DEFAULT_OIDC_RUNTIME_CONFIG: OidcRuntimeConfig = {
	...DEFAULT_OIDC_CONFIG,
	discoveryEndpoint: new URL('http://n8n.io/not-set'),
};

@Service()
export class OidcService {
	private oidcConfig: OidcRuntimeConfig = DEFAULT_OIDC_RUNTIME_CONFIG;

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly authIdentityRepository: AuthIdentityRepository,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly userRepository: UserRepository,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
	) {}

	async init() {
		this.oidcConfig = await this.loadConfig(true);
		await this.setOidcLoginEnabled(this.oidcConfig.loginEnabled);
	}

	getCallbackUrl(): string {
		return `${this.urlService.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}/sso/oidc/callback`;
	}

	getRedactedConfig(): OidcConfigDto {
		return {
			...this.oidcConfig,
			discoveryEndpoint: this.oidcConfig.discoveryEndpoint.toString(),
			clientSecret: OIDC_CLIENT_SECRET_REDACTED_VALUE,
		};
	}

	async generateLoginUrl(): Promise<URL> {
		const configuration = await this.getOidcConfiguration();

		const authorizationURL = client.buildAuthorizationUrl(configuration, {
			redirect_uri: this.getCallbackUrl(),
			response_type: 'code',
			scope: 'openid email profile',
			prompt: 'select_account',
		});

		return authorizationURL;
	}

	async loginUser(callbackUrl: URL): Promise<User> {
		const configuration = await this.getOidcConfiguration();

		const tokens = await client.authorizationCodeGrant(configuration, callbackUrl);

		const claims = tokens.claims();

		if (!claims) {
			throw new ForbiddenError('No claims found in the OIDC token');
		}

		const userInfo = await client.fetchUserInfo(configuration, tokens.access_token, claims.sub);

		if (!userInfo.email_verified) {
			throw new BadRequestError('Email needs to be verified');
		}

		if (!userInfo.email) {
			throw new BadRequestError('An email is required');
		}

		const openidUser = await this.authIdentityRepository.findOne({
			where: { providerId: claims.sub },
			relations: ['user'],
		});

		if (openidUser) {
			return openidUser.user;
		}

		const foundUser = await this.userRepository.findOneBy({ email: userInfo.email });

		if (foundUser) {
			throw new BadRequestError('User already exist with that email.');
		}

		const { user } = await this.userRepository.createUserWithProject({
			firstName: userInfo.given_name ?? '',
			lastName: userInfo.family_name ?? '',
			email: userInfo.email,
			authIdentities: [],
			role: 'global:member',
			password: 'no password set',
		});

		const authIdentity = this.authIdentityRepository.create({
			user,
			userId: user.id,
			providerId: claims.sub,
			providerType: 'oidc',
		});

		await this.authIdentityRepository.save(authIdentity);

		return user;
	}

	async loadConfig(decryptSecret = false): Promise<OidcRuntimeConfig> {
		const currentConfig = await this.settingsRepository.findOneBy({
			key: OIDC_PREFERENCES_DB_KEY,
		});

		if (currentConfig) {
			try {
				const oidcConfig = jsonParse<OidcConfigDto>(currentConfig.value);
				const discoveryUrl = new URL(oidcConfig.discoveryEndpoint);

				if (oidcConfig.clientSecret && decryptSecret) {
					oidcConfig.clientSecret = this.cipher.decrypt(oidcConfig.clientSecret);
				}
				return {
					...oidcConfig,
					discoveryEndpoint: discoveryUrl,
				};
			} catch (error) {
				this.logger.warn(
					'Failed to load OIDC configuration from database, falling back to default configuration.',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					{ error },
				);
			}
		}

		await this.settingsRepository.save({
			key: OIDC_PREFERENCES_DB_KEY,
			value: JSON.stringify(DEFAULT_OIDC_CONFIG),
			loadOnStartup: true,
		});
		return DEFAULT_OIDC_RUNTIME_CONFIG;
	}

	async updateConfig(newConfig: OidcConfigDto) {
		let discoveryEndpoint: URL;
		try {
			// Validating that discoveryEndpoint is a valid URL
			discoveryEndpoint = new URL(newConfig.discoveryEndpoint);
		} catch (error) {
			throw new BadRequestError('Provided discovery endpoint is not a valid URL');
		}
		if (newConfig.clientSecret === OIDC_CLIENT_SECRET_REDACTED_VALUE) {
			newConfig.clientSecret = this.oidcConfig.clientSecret;
		}
		await this.settingsRepository.update(
			{
				key: OIDC_PREFERENCES_DB_KEY,
			},
			{
				value: JSON.stringify({
					...newConfig,
					clientSecret: this.cipher.encrypt(newConfig.clientSecret),
				}),
			},
		);

		// TODO: Discuss this in product
		// if (this.oidcConfig.loginEnabled && !newConfig.loginEnabled) {
		// 	 await this.deleteAllOidcIdentities();
		// }

		this.oidcConfig = {
			...newConfig,
			discoveryEndpoint,
		};

		await this.setOidcLoginEnabled(this.oidcConfig.loginEnabled);
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

	private cachedOidcConfiguration:
		| Promise<{
				configuration: client.Configuration;
				validTill: Date;
		  }>
		| undefined;

	private async getOidcConfiguration(): Promise<client.Configuration> {
		const now = Date.now();
		if (
			this.cachedOidcConfiguration === undefined ||
			now >= (await this.cachedOidcConfiguration).validTill.getTime()
		) {
			this.cachedOidcConfiguration = (async () => {
				const configuration = await client.discovery(
					this.oidcConfig.discoveryEndpoint,
					this.oidcConfig.clientId,
					this.oidcConfig.clientSecret,
				);
				const validTill = new Date(Date.now() + 60 * 60 * 1000); // Cache for 1 hour
				return { configuration, validTill };
			})();
		}

		return (await this.cachedOidcConfiguration).configuration;
	}
}
