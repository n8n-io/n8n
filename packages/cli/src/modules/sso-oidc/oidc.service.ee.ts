import { OidcConfigDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	AuthIdentity,
	AuthIdentityRepository,
	isValidEmail,
	GLOBAL_MEMBER_ROLE,
	SettingsRepository,
	type User,
	UserRepository,
} from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { randomUUID } from 'crypto';
import { Cipher, InstanceSettings } from 'n8n-core';
import { jsonParse, UserError } from 'n8n-workflow';
import type * as openidClientTypes from 'openid-client';
import { EnvHttpProxyAgent } from 'undici';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { JwtService } from '@/services/jwt.service';
import { UrlService } from '@/services/url.service';
import {
	getCurrentAuthenticationMethod,
	isEmailCurrentAuthenticationMethod,
	isOidcCurrentAuthenticationMethod,
	reloadAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

import { OIDC_CLIENT_SECRET_REDACTED_VALUE, OIDC_PREFERENCES_DB_KEY } from './constants';

const DEFAULT_OIDC_CONFIG: OidcConfigDto = {
	clientId: '',
	clientSecret: '',
	discoveryEndpoint: '',
	loginEnabled: false,
	prompt: 'select_account',
	authenticationContextClassReference: [],
};

type OidcRuntimeConfig = Pick<
	OidcConfigDto,
	'clientId' | 'clientSecret' | 'loginEnabled' | 'prompt' | 'authenticationContextClassReference'
> & {
	discoveryEndpoint: URL;
};

const DEFAULT_OIDC_RUNTIME_CONFIG: OidcRuntimeConfig = {
	...DEFAULT_OIDC_CONFIG,
	discoveryEndpoint: new URL('http://n8n.io/not-set'),
};

@Service()
export class OidcService {
	private oidcConfig: OidcRuntimeConfig = DEFAULT_OIDC_RUNTIME_CONFIG;

	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	private openidClient: typeof import('openid-client');

	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly authIdentityRepository: AuthIdentityRepository,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly userRepository: UserRepository,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
		private readonly jwtService: JwtService,
		private readonly instanceSettings: InstanceSettings,
		private readonly provisioningService: ProvisioningService,
	) {}

	async init() {
		this.oidcConfig = await this.loadConfig(true);
		this.logger.debug(`OIDC login is ${this.oidcConfig.loginEnabled ? 'enabled' : 'disabled'}.`);
		await this.setOidcLoginEnabled(this.oidcConfig.loginEnabled);
		if (this.oidcConfig.loginEnabled) {
			await this.loadOpenIdClient();
		}
	}

	private async loadOpenIdClient() {
		if (!this.openidClient) {
			this.openidClient = await import('openid-client');
		}
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

	generateState() {
		const state = `n8n_state:${randomUUID()}`;
		return {
			signed: this.jwtService.sign({ state }, { expiresIn: '15m' }),
			plaintext: state,
		};
	}

	verifyState(signedState: string) {
		let state: string;
		try {
			const decodedState = this.jwtService.verify(signedState);
			state = decodedState?.state;
		} catch (error) {
			this.logger.error('Failed to verify state', { error });
			throw new BadRequestError('Invalid state');
		}

		if (typeof state !== 'string') {
			this.logger.error('Provided state has an invalid format');
			throw new BadRequestError('Invalid state');
		}

		const splitState = state.split(':');

		if (splitState.length !== 2 || splitState[0] !== 'n8n_state') {
			this.logger.error('Provided state is missing the well-known prefix');
			throw new BadRequestError('Invalid state');
		}

		if (
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				splitState[1],
			)
		) {
			this.logger.error('Provided state is not formatted correctly');
			throw new BadRequestError('Invalid state');
		}
		return state;
	}

	generateNonce() {
		const nonce = `n8n_nonce:${randomUUID()}`;
		return {
			signed: this.jwtService.sign({ nonce }, { expiresIn: '15m' }),
			plaintext: nonce,
		};
	}

	verifyNonce(signedNonce: string) {
		let nonce: string;
		try {
			const decodedNonce = this.jwtService.verify(signedNonce);
			nonce = decodedNonce?.nonce;
		} catch (error) {
			this.logger.error('Failed to verify nonce', { error });
			throw new BadRequestError('Invalid nonce');
		}

		if (typeof nonce !== 'string') {
			this.logger.error('Provided nonce has an invalid format');
			throw new BadRequestError('Invalid nonce');
		}

		const splitNonce = nonce.split(':');

		if (splitNonce.length !== 2 || splitNonce[0] !== 'n8n_nonce') {
			this.logger.error('Provided nonce is missing the well-known prefix');
			throw new BadRequestError('Invalid nonce');
		}

		if (
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				splitNonce[1],
			)
		) {
			this.logger.error('Provided nonce is not formatted correctly');
			throw new BadRequestError('Invalid nonce');
		}
		return nonce;
	}

	async generateLoginUrl(): Promise<{ url: URL; state: string; nonce: string }> {
		await this.loadOpenIdClient();
		const configuration = await this.getOidcConfiguration();

		const state = this.generateState();
		const nonce = this.generateNonce();

		const prompt = this.oidcConfig.prompt;
		const authenticationContextClassReference = this.oidcConfig.authenticationContextClassReference;

		const provisioningConfig = await this.provisioningService.getConfig();
		const provisioningEnabled =
			provisioningConfig.scopesProvisionInstanceRole ||
			provisioningConfig.scopesProvisionProjectRoles;

		// Include the custom n8n scope if provisioning is enabled
		const scope = provisioningEnabled
			? `openid email profile ${provisioningConfig.scopesName}`
			: 'openid email profile';

		const authorizationURL = this.openidClient.buildAuthorizationUrl(configuration, {
			redirect_uri: this.getCallbackUrl(),
			response_type: 'code',
			scope,
			prompt,
			state: state.plaintext,
			nonce: nonce.plaintext,
			...(authenticationContextClassReference.length > 0 && {
				acr_values: authenticationContextClassReference.join(' '),
			}),
		});

		return { url: authorizationURL, state: state.signed, nonce: nonce.signed };
	}

	async loginUser(callbackUrl: URL, storedState: string, storedNonce: string): Promise<User> {
		await this.loadOpenIdClient();
		const configuration = await this.getOidcConfiguration();

		const expectedState = this.verifyState(storedState);
		const expectedNonce = this.verifyNonce(storedNonce);

		let tokens;
		try {
			tokens = await this.openidClient.authorizationCodeGrant(configuration, callbackUrl, {
				expectedState,
				expectedNonce,
			});
		} catch (error) {
			this.logger.error('Failed to exchange authorization code for tokens', { error });
			throw new BadRequestError('Invalid authorization code');
		}

		let claims;
		try {
			claims = tokens.claims();
		} catch (error) {
			this.logger.error('Failed to extract claims from tokens', { error });
			throw new BadRequestError('Invalid token');
		}

		if (!claims) {
			throw new ForbiddenError('No claims found in the OIDC token');
		}

		let userInfo;
		try {
			userInfo = await this.openidClient.fetchUserInfo(
				configuration,
				tokens.access_token,
				claims.sub,
			);
		} catch (error) {
			this.logger.error('Failed to fetch user info', { error });
			throw new BadRequestError('Invalid token');
		}

		if (!userInfo.email) {
			throw new BadRequestError('An email is required');
		}

		if (!isValidEmail(userInfo.email)) {
			throw new BadRequestError('Invalid email format');
		}

		const openidUser = await this.authIdentityRepository.findOne({
			where: { providerId: claims.sub, providerType: 'oidc' },
			relations: {
				user: {
					role: true,
				},
			},
		});

		if (openidUser) {
			await this.applySsoProvisioning(openidUser.user, claims);

			return openidUser.user;
		}

		const foundUser = await this.userRepository.findOne({
			where: { email: userInfo.email },
			relations: ['authIdentities', 'role'],
		});

		if (foundUser) {
			this.logger.debug(
				`OIDC login: User with email ${userInfo.email} already exists, linking OIDC identity.`,
			);
			// If the user already exists, we just add the OIDC identity to the user
			const id = this.authIdentityRepository.create({
				providerId: claims.sub,
				providerType: 'oidc',
				userId: foundUser.id,
			});

			await this.authIdentityRepository.save(id);
			await this.applySsoProvisioning(foundUser, claims);

			return foundUser;
		}

		return await this.userRepository.manager.transaction(async (trx) => {
			const { user } = await this.userRepository.createUserWithProject(
				{
					firstName: userInfo.given_name,
					lastName: userInfo.family_name,
					email: userInfo.email,
					authIdentities: [],
					role: GLOBAL_MEMBER_ROLE,
					password: 'no password set',
				},
				trx,
			);

			await trx.save(
				trx.create(AuthIdentity, {
					providerId: claims.sub,
					providerType: 'oidc',
					userId: user.id,
				}),
			);

			await this.applySsoProvisioning(user, claims);

			return user;
		});
	}

	private async applySsoProvisioning(user: User, claims: any) {
		const provisioningConfig = await this.provisioningService.getConfig();
		const projectRoleMapping = claims[provisioningConfig.scopesProjectsRolesClaimName];
		const instanceRole = claims[provisioningConfig.scopesInstanceRoleClaimName];
		if (instanceRole) {
			await this.provisioningService.provisionInstanceRoleForUser(user, instanceRole);
		}
		if (projectRoleMapping) {
			await this.provisioningService.provisionProjectRolesForUser(user.id, projectRoleMapping);
		}
	}

	private async broadcastReloadOIDCConfigurationCommand(): Promise<void> {
		if (this.instanceSettings.isMultiMain) {
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			await Container.get(Publisher).publishCommand({ command: 'reload-oidc-config' });
		}
	}

	private isReloading = false;

	@OnPubSubEvent('reload-oidc-config')
	async reload(): Promise<void> {
		if (this.isReloading) {
			this.logger.warn('OIDC configuration reload already in progress');
			return;
		}
		this.isReloading = true;
		try {
			this.logger.debug('OIDC configuration changed, starting to load it from the database');
			const configFromDB = await this.loadConfigurationFromDatabase(true);
			if (configFromDB) {
				this.oidcConfig = configFromDB;
				this.cachedOidcConfiguration = undefined;
			} else {
				this.logger.warn('OIDC configuration not found in database, ignoring reload message');
			}
			await reloadAuthenticationMethod();

			const isOidcLoginEnabled = isOidcCurrentAuthenticationMethod();

			this.logger.debug(`OIDC login is now ${isOidcLoginEnabled ? 'enabled' : 'disabled'}.`);

			Container.get(GlobalConfig).sso.oidc.loginEnabled = isOidcLoginEnabled;
		} catch (error) {
			this.logger.error('OIDC configuration changed, failed to reload OIDC configuration', {
				error,
			});
		} finally {
			this.isReloading = false;
		}
	}

	async loadConfigurationFromDatabase(
		decryptSecret = false,
	): Promise<OidcRuntimeConfig | undefined> {
		const configFromDB = await this.settingsRepository.findByKey(OIDC_PREFERENCES_DB_KEY);

		if (configFromDB) {
			try {
				const configValue = jsonParse<OidcConfigDto>(configFromDB.value);

				if (configValue.discoveryEndpoint === '') return undefined;

				const oidcConfig = OidcConfigDto.parse(configValue);

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

					{ error },
				);
			}
		}
		return undefined;
	}

	async loadConfig(decryptSecret = false): Promise<OidcRuntimeConfig> {
		const currentConfig = await this.loadConfigurationFromDatabase(decryptSecret);

		if (currentConfig) {
			return currentConfig;
		}

		return DEFAULT_OIDC_RUNTIME_CONFIG;
	}

	async updateConfig(newConfig: OidcConfigDto) {
		const isEnablingOidcWhileOtherSsoProtocolIsAlreadyEnabled =
			newConfig.loginEnabled &&
			!isEmailCurrentAuthenticationMethod() &&
			!isOidcCurrentAuthenticationMethod();
		if (isEnablingOidcWhileOtherSsoProtocolIsAlreadyEnabled) {
			throw new InternalServerError(
				`Cannot switch OIDC login enabled state when an authentication method other than email or OIDC is active (current: ${getCurrentAuthenticationMethod()})`,
			);
		}

		let discoveryEndpoint: URL;
		try {
			// Validating that discoveryEndpoint is a valid URL
			discoveryEndpoint = new URL(newConfig.discoveryEndpoint);
		} catch (error) {
			this.logger.error(`The provided endpoint is not a valid URL: ${newConfig.discoveryEndpoint}`);
			throw new UserError('Provided discovery endpoint is not a valid URL');
		}
		if (newConfig.clientSecret === OIDC_CLIENT_SECRET_REDACTED_VALUE) {
			newConfig.clientSecret = this.oidcConfig.clientSecret;
		}
		try {
			const discoveredMetadata = await this.createProxyAwareConfiguration(
				discoveryEndpoint,
				newConfig.clientId,
				newConfig.clientSecret,
			);
			// TODO: validate Metadata against features
			this.logger.debug(`Discovered OIDC metadata: ${JSON.stringify(discoveredMetadata)}`);
		} catch (error) {
			this.logger.error('Failed to discover OIDC metadata', { error });
			throw new UserError('Failed to discover OIDC metadata, based on the provided configuration');
		}
		await this.settingsRepository.save({
			key: OIDC_PREFERENCES_DB_KEY,
			value: JSON.stringify({
				...newConfig,
				clientSecret: this.cipher.encrypt(newConfig.clientSecret),
			}),
			loadOnStartup: true,
		});

		// TODO: Discuss this in product
		// if (this.oidcConfig.loginEnabled && !newConfig.loginEnabled) {
		// 	 await this.deleteAllOidcIdentities();
		// }

		this.oidcConfig = {
			...newConfig,
			discoveryEndpoint,
		};
		this.cachedOidcConfiguration = undefined; // reset cached configuration
		this.logger.debug(
			`OIDC login is now ${this.oidcConfig.loginEnabled ? 'enabled' : 'disabled'}.`,
		);

		await this.setOidcLoginEnabled(this.oidcConfig.loginEnabled);

		await this.broadcastReloadOIDCConfigurationCommand();
	}

	private async setOidcLoginEnabled(enabled: boolean): Promise<void> {
		const currentAuthenticationMethod = getCurrentAuthenticationMethod();

		const isEnablingOidcWhileOtherSsoProtocolIsAlreadyEnabled =
			enabled && !isEmailCurrentAuthenticationMethod() && !isOidcCurrentAuthenticationMethod();
		if (isEnablingOidcWhileOtherSsoProtocolIsAlreadyEnabled) {
			throw new InternalServerError(
				`Cannot switch OIDC login enabled state when an authentication method other than email or OIDC is active (current: ${currentAuthenticationMethod})`,
			);
		}

		const targetAuthenticationMethod =
			!enabled && currentAuthenticationMethod === 'oidc' ? 'email' : currentAuthenticationMethod;

		Container.get(GlobalConfig).sso.oidc.loginEnabled = enabled;
		await setCurrentAuthenticationMethod(enabled ? 'oidc' : targetAuthenticationMethod);
	}

	private cachedOidcConfiguration:
		| ({
				configuration: Promise<openidClientTypes.Configuration>;
				validTill: Date;
		  } & OidcRuntimeConfig)
		| undefined;

	/**
	 * Creates a proxy-aware configuration for openid-client.
	 * This method configures customFetch to respect HTTP_PROXY, HTTPS_PROXY, and NO_PROXY environment variables.
	 */
	private async createProxyAwareConfiguration(
		discoveryUrl: URL,
		clientId: string,
		clientSecret: string,
	): Promise<openidClientTypes.Configuration> {
		await this.loadOpenIdClient();
		const configuration = await this.openidClient.discovery(discoveryUrl, clientId, clientSecret);

		// Check if proxy environment variables are set
		const hasProxyConfig =
			process.env.HTTP_PROXY ?? process.env.HTTPS_PROXY ?? process.env.ALL_PROXY;

		if (hasProxyConfig) {
			this.logger.debug('Configuring OIDC client with proxy support', {
				HTTP_PROXY: process.env.HTTP_PROXY,
				HTTPS_PROXY: process.env.HTTPS_PROXY,
				NO_PROXY: process.env.NO_PROXY,
				ALL_PROXY: process.env.ALL_PROXY,
			});

			// Create a proxy agent that automatically reads from environment variables
			const proxyAgent = new EnvHttpProxyAgent();

			// Configure customFetch to use the proxy agent
			configuration[this.openidClient.customFetch] = async (...args) => {
				const [url, options] = args;
				return await fetch(url, {
					...options,
					// @ts-expect-error - dispatcher is an undici-specific option not in standard fetch
					dispatcher: proxyAgent,
				});
			};
		}

		return configuration;
	}

	private async getOidcConfiguration(): Promise<openidClientTypes.Configuration> {
		const now = Date.now();
		if (
			this.cachedOidcConfiguration === undefined ||
			now >= this.cachedOidcConfiguration.validTill.getTime() ||
			this.oidcConfig.discoveryEndpoint.toString() !==
				this.cachedOidcConfiguration.discoveryEndpoint.toString() ||
			this.oidcConfig.clientId !== this.cachedOidcConfiguration.clientId ||
			this.oidcConfig.clientSecret !== this.cachedOidcConfiguration.clientSecret
		) {
			this.cachedOidcConfiguration = {
				...this.oidcConfig,
				configuration: this.createProxyAwareConfiguration(
					this.oidcConfig.discoveryEndpoint,
					this.oidcConfig.clientId,
					this.oidcConfig.clientSecret,
				),
				validTill: new Date(Date.now() + 60 * 60 * 1000), // Cache for 1 hour
			};
		}

		return await this.cachedOidcConfiguration.configuration;
	}
}
