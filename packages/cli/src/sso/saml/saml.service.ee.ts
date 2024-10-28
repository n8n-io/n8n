import type express from 'express';
import Container, { Service } from 'typedi';
import type { User } from '@db/entities/User';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import { getServiceProviderInstance } from './serviceProvider.ee';
import type { SamlUserAttributes } from './types/samlUserAttributes';
import { isSsoJustInTimeProvisioningEnabled } from '../ssoHelpers';
import type { SamlPreferences } from './types/samlPreferences';
import { SAML_PREFERENCES_DB_KEY } from './constants';
import type { IdentityProviderInstance, ServiceProviderInstance } from 'samlify';
import type { BindingContext, PostBindingContext } from 'samlify/types/src/entity';
import {
	createUserFromSamlAttributes,
	getMappedSamlAttributesFromFlowResult,
	getSamlLoginLabel,
	isSamlLicensedAndEnabled,
	isSamlLoginEnabled,
	setSamlLoginEnabled,
	setSamlLoginLabel,
	updateUserFromSamlAttributes,
} from './samlHelpers';
import type { Settings } from '@db/entities/Settings';
import axios from 'axios';
import https from 'https';
import type { SamlLoginBinding } from './types';
import { validateMetadata, validateResponse } from './samlValidator';
import { Logger } from '@/Logger';
import { UserRepository } from '@db/repositories/user.repository';
import { SettingsRepository } from '@db/repositories/settings.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AuthError } from '@/errors/response-errors/auth.error';
import { UrlService } from '@/services/url.service';

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

	public get samlPreferences(): SamlPreferences {
		return {
			...this._samlPreferences,
			loginEnabled: isSamlLoginEnabled(),
			loginLabel: getSamlLoginLabel(),
		};
	}

	constructor(
		private readonly logger: Logger,
		private readonly urlService: UrlService,
	) {}

	async init(): Promise<void> {
		// load preferences first but do not apply so as to not load samlify unnecessarily
		await this.loadFromDbAndApplySamlPreferences(false);
		if (isSamlLicensedAndEnabled()) {
			await this.loadSamlify();
			await this.loadFromDbAndApplySamlPreferences(true);
		}
	}

	async loadSamlify() {
		if (this.samlify === undefined) {
			this.logger.debug('Loading samlify library into memory');
			this.samlify = await import('samlify');
		}
		this.samlify.setSchemaValidator({
			validate: async (response: string) => {
				const valid = await validateResponse(response);
				if (!valid) {
					throw new ApplicationError('Invalid SAML response');
				}
			},
		});
	}

	getIdentityProviderInstance(forceRecreate = false): IdentityProviderInstance {
		if (this.samlify === undefined) {
			throw new ApplicationError('Samlify is not initialized');
		}
		if (this.identityProviderInstance === undefined || forceRecreate) {
			this.identityProviderInstance = this.samlify.IdentityProvider({
				metadata: this._samlPreferences.metadata,
			});
		}

		return this.identityProviderInstance;
	}

	getServiceProviderInstance(): ServiceProviderInstance {
		if (this.samlify === undefined) {
			throw new ApplicationError('Samlify is not initialized');
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
			const user = await Container.get(UserRepository).findOne({
				where: { email: lowerCasedEmail },
				relations: ['authIdentities'],
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

	async setSamlPreferences(prefs: SamlPreferences): Promise<SamlPreferences | undefined> {
		await this.loadSamlify();
		await this.loadPreferencesWithoutValidation(prefs);
		if (prefs.metadataUrl) {
			const fetchedMetadata = await this.fetchMetadataFromUrl();
			if (fetchedMetadata) {
				this._samlPreferences.metadata = fetchedMetadata;
			}
		} else if (prefs.metadata) {
			const validationResult = await validateMetadata(prefs.metadata);
			if (!validationResult) {
				throw new ApplicationError('Invalid SAML metadata');
			}
		}
		this.getIdentityProviderInstance(true);
		const result = await this.saveSamlPreferencesToDb();
		return result;
	}

	async loadPreferencesWithoutValidation(prefs: SamlPreferences) {
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

	async loadFromDbAndApplySamlPreferences(apply = true): Promise<SamlPreferences | undefined> {
		const samlPreferences = await Container.get(SettingsRepository).findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		if (samlPreferences) {
			const prefs = jsonParse<SamlPreferences>(samlPreferences.value);
			if (prefs) {
				if (apply) {
					await this.setSamlPreferences(prefs);
				} else {
					await this.loadPreferencesWithoutValidation(prefs);
				}
				return prefs;
			}
		}
		return;
	}

	async saveSamlPreferencesToDb(): Promise<SamlPreferences | undefined> {
		const samlPreferences = await Container.get(SettingsRepository).findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		const settingsValue = JSON.stringify(this.samlPreferences);
		let result: Settings;
		if (samlPreferences) {
			samlPreferences.value = settingsValue;
			result = await Container.get(SettingsRepository).save(samlPreferences, {
				transaction: false,
			});
		} else {
			result = await Container.get(SettingsRepository).save(
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
				const validationResult = await validateMetadata(xml);
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
}
