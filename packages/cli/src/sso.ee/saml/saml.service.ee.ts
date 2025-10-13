import type { SamlPreferences } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { Settings, User } from '@n8n/db';
import { isValidEmail, SettingsRepository, UserRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import axios from 'axios';
import type express from 'express';
import https from 'https';
import { InstanceSettings } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { type IdentityProviderInstance, type ServiceProviderInstance } from 'samlify';
import type { BindingContext, PostBindingContext } from 'samlify/types/src/entity';

import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UrlService } from '@/services/url.service';

import { SAML_PREFERENCES_DB_KEY } from './constants';
import { InvalidSamlMetadataUrlError } from './errors/invalid-saml-metadata-url.error';
import { InvalidSamlMetadataError } from './errors/invalid-saml-metadata.error';
import {
	createUserFromSamlAttributes,
	getMappedSamlAttributesFromFlowResult,
	getSamlLoginLabel,
	isSamlLicensedAndEnabled,
	isSamlLoginEnabled,
	setSamlLoginEnabled,
	setSamlLoginLabel,
	updateUserFromSamlAttributes,
} from './saml-helpers';
import { SamlValidator } from './saml-validator';
import { getServiceProviderInstance } from './service-provider.ee';
import type { SamlLoginBinding, SamlUserAttributes } from './types';
import { isSsoJustInTimeProvisioningEnabled, reloadAuthenticationMethod } from '../sso-helpers';

@Service()
export class SamlService {
	private identityProviderInstance: IdentityProviderInstance | undefined;

	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	private samlify: typeof import('samlify') | undefined;

	private _samlPreferences: SamlPreferences = {
		mapping: {
			email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
			firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
			lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
			userPrincipalName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
		},
		metadata: '',
		metadataUrl: '',
		ignoreSSL: false,
		loginBinding: 'redirect',
		acsBinding: 'post',
		authnRequestsSigned: false,
		loginEnabled: false,
		loginLabel: 'SAML',
		wantAssertionsSigned: true,
		wantMessageSigned: true,
		relayState: this.urlService.getInstanceBaseUrl(),
		signatureConfig: {
			prefix: 'ds',
			location: {
				reference: '/samlp:Response/saml:Issuer',
				action: 'after',
			},
		},
	};

	get samlPreferences(): SamlPreferences {
		return {
			...this._samlPreferences,
			loginEnabled: isSamlLoginEnabled(),
			loginLabel: getSamlLoginLabel(),
		};
	}

	constructor(
		private readonly logger: Logger,
		private readonly urlService: UrlService,
		private readonly validator: SamlValidator,
		private readonly userRepository: UserRepository,
		private readonly settingsRepository: SettingsRepository,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async init(): Promise<void> {
		try {
			// load preferences first but do not apply so as to not load samlify unnecessarily
			await this.loadFromDbAndApplySamlPreferences(false);
			await this.validator.init();
			if (isSamlLicensedAndEnabled()) {
				await this.loadSamlify();
				await this.loadFromDbAndApplySamlPreferences(true);
			}
		} catch (error) {
			// If the SAML configuration has been corrupted in the database we'll
			// delete the corrupted configuration and enable email logins again.
			if (
				error instanceof InvalidSamlMetadataUrlError ||
				error instanceof InvalidSamlMetadataError ||
				error instanceof SyntaxError
			) {
				this.logger.warn(
					`SAML initialization failed because of invalid metadata in database: ${error.message}. IMPORTANT: Disabling SAML and switching to email-based login for all users. Please review your configuration and re-enable SAML.`,
				);
				await this.reset();
			} else {
				throw error;
			}
		}
	}

	async loadSamlify() {
		if (this.samlify === undefined) {
			this.logger.debug('Loading samlify library into memory');
			this.samlify = await import('samlify');
		}

		this.samlify.setSchemaValidator({
			validate: async (response: string) => {
				const valid = await this.validator.validateResponse(response);
				if (!valid) {
					throw new InvalidSamlMetadataError();
				}
			},
		});
	}

	getIdentityProviderInstance(forceRecreate = false): IdentityProviderInstance {
		if (this.samlify === undefined) {
			throw new UnexpectedError('Samlify is not initialized');
		}
		if (this.identityProviderInstance === undefined || forceRecreate) {
			this.identityProviderInstance = this.samlify.IdentityProvider({
				metadata: this._samlPreferences.metadata,
			});
		}

		this.validator.validateIdentiyProvider(this.identityProviderInstance);

		return this.identityProviderInstance;
	}

	getServiceProviderInstance(): ServiceProviderInstance {
		if (this.samlify === undefined) {
			throw new UnexpectedError('Samlify is not initialized');
		}
		return getServiceProviderInstance(this._samlPreferences, this.samlify);
	}

	async getLoginRequestUrl(
		relayState?: string,
		binding?: SamlLoginBinding,
	): Promise<{
		binding: SamlLoginBinding;
		context: BindingContext | PostBindingContext;
	}> {
		await this.loadSamlify();
		if (binding === undefined) binding = this._samlPreferences.loginBinding ?? 'redirect';
		if (binding === 'post') {
			return {
				binding,
				context: this.getPostLoginRequestUrl(relayState),
			};
		} else {
			return {
				binding,
				context: this.getRedirectLoginRequestUrl(relayState),
			};
		}
	}

	private getRedirectLoginRequestUrl(relayState?: string): BindingContext {
		const sp = this.getServiceProviderInstance();
		sp.entitySetting.relayState = relayState ?? this.urlService.getInstanceBaseUrl();
		const loginRequest = sp.createLoginRequest(this.getIdentityProviderInstance(), 'redirect');
		return loginRequest;
	}

	private getPostLoginRequestUrl(relayState?: string): PostBindingContext {
		const sp = this.getServiceProviderInstance();
		sp.entitySetting.relayState = relayState ?? this.urlService.getInstanceBaseUrl();
		const loginRequest = sp.createLoginRequest(
			this.getIdentityProviderInstance(),
			'post',
		) as PostBindingContext;
		return loginRequest;
	}

	async handleSamlLogin(
		req: express.Request,
		binding: SamlLoginBinding,
	): Promise<{
		authenticatedUser: User | undefined;
		attributes: SamlUserAttributes;
		onboardingRequired: boolean;
	}> {
		const attributes = await this.getAttributesFromLoginResponse(req, binding);
		if (attributes.email) {
			const lowerCasedEmail = attributes.email.toLowerCase();

			if (!isValidEmail(lowerCasedEmail)) {
				throw new BadRequestError('Invalid email format');
			}

			const user = await this.userRepository.findOne({
				where: { email: lowerCasedEmail },
				relations: ['authIdentities', 'role'],
			});
			if (user) {
				// Login path for existing users that are fully set up and that have a SAML authIdentity set up
				if (
					user.authIdentities.find(
						(e) => e.providerType === 'saml' && e.providerId === attributes.userPrincipalName,
					)
				) {
					return {
						authenticatedUser: user,
						attributes,
						onboardingRequired: false,
					};
				} else {
					// Login path for existing users that are NOT fully set up for SAML
					const updatedUser = await updateUserFromSamlAttributes(user, attributes);
					const onboardingRequired = !updatedUser.firstName || !updatedUser.lastName;
					return {
						authenticatedUser: updatedUser,
						attributes,
						onboardingRequired,
					};
				}
			} else {
				// New users to be created JIT based on SAML attributes
				if (isSsoJustInTimeProvisioningEnabled()) {
					const newUser = await createUserFromSamlAttributes(attributes);
					return {
						authenticatedUser: newUser,
						attributes,
						onboardingRequired: true,
					};
				}
			}
		}
		return {
			authenticatedUser: undefined,
			attributes,
			onboardingRequired: false,
		};
	}

	private async broadcastReloadSAMLConfigurationCommand(): Promise<void> {
		if (this.instanceSettings.isMultiMain) {
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			await Container.get(Publisher).publishCommand({ command: 'reload-saml-config' });
		}
	}

	private isReloading = false;

	@OnPubSubEvent('reload-saml-config')
	async reload(): Promise<void> {
		if (this.isReloading) {
			this.logger.warn('SAML configuration reload already in progress');
			return;
		}
		this.isReloading = true;
		try {
			this.logger.debug('SAML configuration changed, starting to load it from the database');
			await this.loadFromDbAndApplySamlPreferences(true, false);

			await reloadAuthenticationMethod();

			const samlLoginEnabled = isSamlLoginEnabled();

			this.logger.debug(`SAML login is now ${samlLoginEnabled ? 'enabled' : 'disabled'}.`);

			Container.get(GlobalConfig).sso.saml.loginEnabled = samlLoginEnabled;
		} catch (error) {
			this.logger.error('SAML configuration changed, failed to reload SAML configuration', {
				error,
			});
		} finally {
			this.isReloading = false;
		}
	}

	async setSamlPreferences(
		prefs: Partial<SamlPreferences>,
		tryFallback: boolean = false,
		broadcastReload: boolean = true,
	): Promise<SamlPreferences | undefined> {
		await this.loadSamlify();
		const previousMetadataUrl = this._samlPreferences.metadataUrl;
		await this.loadPreferencesWithoutValidation(prefs);
		if (prefs.metadataUrl) {
			try {
				const fetchedMetadata = await this.fetchMetadataFromUrl();
				if (fetchedMetadata) {
					this._samlPreferences.metadata = fetchedMetadata;
				} else {
					// in this case the metadata url didn't produce a valid metadata for SAML
					// therefore we are rejecting the change to it
					throw new InvalidSamlMetadataUrlError(prefs.metadataUrl);
				}
			} catch (error) {
				this._samlPreferences.metadataUrl = previousMetadataUrl;
				if (!tryFallback) {
					throw error;
				}
				// we were not able to produce correct metadata from the URL, but
				// in this case we don't care and try to fallback on the saved metadata in the
				// database.
				this.logger.error(
					'SAML initialization detected an invalid metadata URL in database. Trying to initialize from metadata in database if available.',

					{ error },
				);
			}
		} else if (prefs.metadata) {
			const validationResult = await this.validator.validateMetadata(prefs.metadata);
			if (!validationResult) {
				throw new InvalidSamlMetadataError();
			}
		}
		// If SAML login is enabled, we need to ensure that we have valid metadata available
		// if the metadata url is provided and it was possible to fetch and validate that metadata
		// it is now stored in this._samlPreferences.metadata.
		// if no metadata url was provided but metadata directly as XML, it is also already stored
		// in this._samlPreferences.metadata.
		if (isSamlLoginEnabled()) {
			if (this._samlPreferences.metadata) {
				const validationResult = await this.validator.validateMetadata(
					this._samlPreferences.metadata,
				);
				if (!validationResult) {
					throw new InvalidSamlMetadataError();
				}
			} else {
				// in this case SAML login is enabled but no valid metadata is available
				throw new InvalidSamlMetadataError();
			}
		}
		this.getIdentityProviderInstance(true);
		const result = await this.saveSamlPreferencesToDb();

		if (broadcastReload) {
			await this.broadcastReloadSAMLConfigurationCommand();
		}
		return result;
	}

	async loadPreferencesWithoutValidation(prefs: Partial<SamlPreferences>) {
		this._samlPreferences.loginBinding = prefs.loginBinding ?? this._samlPreferences.loginBinding;
		this._samlPreferences.metadata = prefs.metadata ?? this._samlPreferences.metadata;
		this._samlPreferences.mapping = prefs.mapping ?? this._samlPreferences.mapping;
		this._samlPreferences.ignoreSSL = prefs.ignoreSSL ?? this._samlPreferences.ignoreSSL;
		this._samlPreferences.acsBinding = prefs.acsBinding ?? this._samlPreferences.acsBinding;
		this._samlPreferences.signatureConfig =
			prefs.signatureConfig ?? this._samlPreferences.signatureConfig;
		this._samlPreferences.authnRequestsSigned =
			prefs.authnRequestsSigned ?? this._samlPreferences.authnRequestsSigned;
		this._samlPreferences.wantAssertionsSigned =
			prefs.wantAssertionsSigned ?? this._samlPreferences.wantAssertionsSigned;
		this._samlPreferences.wantMessageSigned =
			prefs.wantMessageSigned ?? this._samlPreferences.wantMessageSigned;
		if (prefs.metadataUrl) {
			this._samlPreferences.metadataUrl = prefs.metadataUrl;
		} else if (prefs.metadata) {
			// remove metadataUrl if metadata is set directly
			this._samlPreferences.metadataUrl = undefined;
			this._samlPreferences.metadata = prefs.metadata;
		}
		await setSamlLoginEnabled(prefs.loginEnabled ?? isSamlLoginEnabled());
		setSamlLoginLabel(prefs.loginLabel ?? getSamlLoginLabel());
	}

	async loadFromDbAndApplySamlPreferences(
		apply = true,
		broadcastReload: boolean = true,
	): Promise<SamlPreferences | undefined> {
		const samlPreferences = await this.settingsRepository.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		if (samlPreferences) {
			const prefs = jsonParse<SamlPreferences>(samlPreferences.value);
			if (prefs) {
				if (apply) {
					await this.setSamlPreferences(prefs, true, broadcastReload);
				} else {
					await this.loadPreferencesWithoutValidation(prefs);
				}
				return prefs;
			}
		}
		return;
	}

	async saveSamlPreferencesToDb(): Promise<SamlPreferences | undefined> {
		const samlPreferences = await this.settingsRepository.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		const settingsValue = JSON.stringify(this.samlPreferences);
		let result: Settings;
		if (samlPreferences) {
			samlPreferences.value = settingsValue;
			result = await this.settingsRepository.save(samlPreferences, {
				transaction: false,
			});
		} else {
			result = await this.settingsRepository.save(
				{
					key: SAML_PREFERENCES_DB_KEY,
					value: settingsValue,
					loadOnStartup: true,
				},
				{ transaction: false },
			);
		}
		if (result) return jsonParse<SamlPreferences>(result.value);
		return;
	}

	async fetchMetadataFromUrl(): Promise<string | undefined> {
		await this.loadSamlify();
		if (!this._samlPreferences.metadataUrl)
			throw new BadRequestError('Error fetching SAML Metadata, no Metadata URL set');
		try {
			// TODO:SAML: this will not work once axios is upgraded to > 1.2.0 (see checkServerIdentity)
			const agent = new https.Agent({
				rejectUnauthorized: !this._samlPreferences.ignoreSSL,
			});
			const response = await axios.get(this._samlPreferences.metadataUrl, { httpsAgent: agent });
			if (response.status === 200 && response.data) {
				const xml = (await response.data) as string;
				const validationResult = await this.validator.validateMetadata(xml);
				if (!validationResult) {
					throw new BadRequestError(
						`Data received from ${this._samlPreferences.metadataUrl} is not valid SAML metadata.`,
					);
				}
				return xml;
			}
		} catch (error) {
			throw new BadRequestError(
				`Error fetching SAML Metadata from ${this._samlPreferences.metadataUrl}: ${error}`,
			);
		}
		return;
	}

	async getAttributesFromLoginResponse(
		req: express.Request,
		binding: SamlLoginBinding,
	): Promise<SamlUserAttributes> {
		let parsedSamlResponse;
		if (!this._samlPreferences.mapping)
			throw new BadRequestError('Error fetching SAML Attributes, no Attribute mapping set');
		try {
			await this.loadSamlify();
			parsedSamlResponse = await this.getServiceProviderInstance().parseLoginResponse(
				this.getIdentityProviderInstance(),
				binding,
				req,
			);
		} catch (error) {
			// throw error;
			throw new AuthError(
				// INFO: The error can be a string. Samlify rejects promises with strings.
				`SAML Authentication failed. Could not parse SAML response. ${error instanceof Error ? error.message : error}`,
			);
		}
		const { attributes, missingAttributes } = getMappedSamlAttributesFromFlowResult(
			parsedSamlResponse,
			this._samlPreferences.mapping,
		);
		if (!attributes) {
			throw new AuthError('SAML Authentication failed. Invalid SAML response.');
		}
		if (missingAttributes.length > 0) {
			throw new AuthError(
				`SAML Authentication failed. Invalid SAML response (missing attributes: ${missingAttributes.join(
					', ',
				)}).`,
			);
		}
		return attributes;
	}

	/**
	 * Disables SAML, switches to email based logins and deletes the SAML
	 * configuration from the database.
	 */
	async reset() {
		await setSamlLoginEnabled(false);
		await this.settingsRepository.delete({ key: SAML_PREFERENCES_DB_KEY });
	}
}
