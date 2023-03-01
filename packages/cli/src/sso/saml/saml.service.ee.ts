import type express from 'express';
import * as Db from '@/Db';
import type { User } from '@/databases/entities/User';
import { jsonParse, LoggerProxy } from 'n8n-workflow';
import { AuthError, BadRequestError } from '@/ResponseHelper';
import { getServiceProviderInstance } from './serviceProvider.ee';
import type { SamlUserAttributes } from './types/samlUserAttributes';
import type { SamlAttributeMapping } from './types/samlAttributeMapping';
import { isSsoJustInTimeProvisioningEnabled } from '../ssoHelpers';
import type { SamlPreferences } from './types/samlPreferences';
import { SAML_PREFERENCES_DB_KEY } from './constants';
import type { IdentityProviderInstance } from 'samlify';
import { IdentityProvider } from 'samlify';
import {
	createUserFromSamlAttributes,
	getMappedSamlAttributesFromFlowResult,
	getSamlLoginLabel,
	isSamlLoginEnabled,
	setSamlLoginEnabled,
	setSamlLoginLabel,
	updateUserFromSamlAttributes,
} from './samlHelpers';
import type { Settings } from '../../databases/entities/Settings';
import axios from 'axios';
import type { SamlLoginBinding } from './types';
import type { BindingContext, PostBindingContext } from 'samlify/types/src/entity';

export class SamlService {
	private static instance: SamlService;

	private identityProviderInstance: IdentityProviderInstance | undefined;

	private _attributeMapping: SamlAttributeMapping = {
		email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
		firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/firstname',
		lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/lastname',
		userPrincipalName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
	};

	public get attributeMapping(): SamlAttributeMapping {
		return this._attributeMapping;
	}

	public set attributeMapping(mapping: SamlAttributeMapping) {
		// TODO:SAML: add validation
		this._attributeMapping = mapping;
	}

	private _metadata = '';

	private metadataUrl = '';

	private loginBinding: SamlLoginBinding = 'post';

	public get metadata(): string {
		return this._metadata;
	}

	public set metadata(metadata: string) {
		this._metadata = metadata;
	}

	constructor() {
		this.loadFromDbAndApplySamlPreferences()
			.then(() => {
				LoggerProxy.debug('Initializing SAML service');
			})
			.catch(() => {
				LoggerProxy.error('Error initializing SAML service');
			});
	}

	static getInstance(): SamlService {
		if (!SamlService.instance) {
			SamlService.instance = new SamlService();
		}
		return SamlService.instance;
	}

	async init(): Promise<void> {
		await this.loadFromDbAndApplySamlPreferences();
	}

	getIdentityProviderInstance(forceRecreate = false): IdentityProviderInstance {
		if (this.identityProviderInstance === undefined || forceRecreate) {
			this.identityProviderInstance = IdentityProvider({
				metadata: this.metadata,
			});
		}

		return this.identityProviderInstance;
	}

	getLoginRequestUrl(binding?: SamlLoginBinding): {
		binding: SamlLoginBinding;
		context: BindingContext | PostBindingContext;
	} {
		if (binding === undefined) binding = this.loginBinding;
		if (binding === 'post') {
			return {
				binding,
				context: this.getPostLoginRequestUrl(),
			};
		} else {
			return {
				binding,
				context: this.getRedirectLoginRequestUrl(),
			};
		}
	}

	private getRedirectLoginRequestUrl(): BindingContext {
		const loginRequest = getServiceProviderInstance().createLoginRequest(
			this.getIdentityProviderInstance(),
			'redirect',
		);
		//TODO:SAML: debug logging
		LoggerProxy.debug(loginRequest.context);
		return loginRequest;
	}

	private getPostLoginRequestUrl(): PostBindingContext {
		const loginRequest = getServiceProviderInstance().createLoginRequest(
			this.getIdentityProviderInstance(),
			'post',
		) as PostBindingContext;
		//TODO:SAML: debug logging

		LoggerProxy.debug(loginRequest.context);
		return loginRequest;
	}

	async handleSamlLogin(
		req: express.Request,
		binding: SamlLoginBinding,
	): Promise<
		| {
				authenticatedUser: User | undefined;
				attributes: SamlUserAttributes;
				onboardingRequired: boolean;
		  }
		| undefined
	> {
		const attributes = await this.getAttributesFromLoginResponse(req, binding);
		if (attributes.email) {
			const user = await Db.collections.User.findOne({
				where: { email: attributes.email },
				relations: ['globalRole', 'authIdentities'],
			});
			if (user) {
				// Login path for existing users that are fully set up
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
					return {
						authenticatedUser: updatedUser,
						attributes,
						onboardingRequired: true,
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
		return undefined;
	}

	getSamlPreferences(): SamlPreferences {
		return {
			mapping: this.attributeMapping,
			metadata: this.metadata,
			metadataUrl: this.metadataUrl,
			loginBinding: this.loginBinding,
			loginEnabled: isSamlLoginEnabled(),
			loginLabel: getSamlLoginLabel(),
		};
	}

	async setSamlPreferences(prefs: SamlPreferences): Promise<SamlPreferences | undefined> {
		this.loginBinding = prefs.loginBinding ?? this.loginBinding;
		this.metadata = prefs.metadata ?? this.metadata;
		this.attributeMapping = prefs.mapping ?? this.attributeMapping;
		if (prefs.metadataUrl) {
			this.metadataUrl = prefs.metadataUrl;
			const fetchedMetadata = await this.fetchMetadataFromUrl();
			if (fetchedMetadata) {
				this.metadata = fetchedMetadata;
			}
		}
		setSamlLoginEnabled(prefs.loginEnabled ?? isSamlLoginEnabled());
		setSamlLoginLabel(prefs.loginLabel ?? getSamlLoginLabel());
		this.getIdentityProviderInstance(true);
		const result = await this.saveSamlPreferencesToDb();
		return result;
	}

	async loadFromDbAndApplySamlPreferences(): Promise<SamlPreferences | undefined> {
		const samlPreferences = await Db.collections.Settings.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		if (samlPreferences) {
			const prefs = jsonParse<SamlPreferences>(samlPreferences.value);
			if (prefs) {
				await this.setSamlPreferences(prefs);
				return prefs;
			}
		}
		return;
	}

	async saveSamlPreferencesToDb(): Promise<SamlPreferences | undefined> {
		const samlPreferences = await Db.collections.Settings.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		const settingsValue = JSON.stringify(this.getSamlPreferences());
		let result: Settings;
		if (samlPreferences) {
			samlPreferences.value = settingsValue;
			result = await Db.collections.Settings.save(samlPreferences);
		} else {
			result = await Db.collections.Settings.save({
				key: SAML_PREFERENCES_DB_KEY,
				value: settingsValue,
				loadOnStartup: true,
			});
		}
		if (result) return jsonParse<SamlPreferences>(result.value);
		return;
	}

	async fetchMetadataFromUrl(): Promise<string | undefined> {
		try {
			const prevRejectStatus = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
			const response = await axios.get(this.metadataUrl);
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevRejectStatus;
			if (response.status === 200 && response.data) {
				const xml = (await response.data) as string;
				// TODO: SAML: validate XML
				// throw new BadRequestError('Received XML is not valid SAML metadata.');
				return xml;
			}
		} catch (error) {
			throw new BadRequestError('SAML Metadata URL is invalid or response is .');
		}
		return;
	}

	async getAttributesFromLoginResponse(
		req: express.Request,
		binding: SamlLoginBinding,
	): Promise<SamlUserAttributes> {
		let parsedSamlResponse;
		try {
			parsedSamlResponse = await getServiceProviderInstance().parseLoginResponse(
				this.getIdentityProviderInstance(),
				binding,
				req,
			);
		} catch (error) {
			throw error;
			// throw new AuthError('SAML Authentication failed. Could not parse SAML response.');
		}
		const { attributes, missingAttributes } = getMappedSamlAttributesFromFlowResult(
			parsedSamlResponse,
			this.attributeMapping,
		);
		if (!attributes) {
			throw new AuthError('SAML Authentication failed. Invalid SAML response.');
		}
		if (!attributes.email && missingAttributes.length > 0) {
			throw new AuthError(
				`SAML Authentication failed. Invalid SAML response (missing attributes: ${missingAttributes.join(
					', ',
				)}).`,
			);
		}
		return attributes;
	}

	async testSamlConnection(): Promise<boolean> {
		try {
			const requestContext = this.getLoginRequestUrl();
			if (!requestContext) return false;
			if (requestContext.binding === 'redirect') {
				const fetchResult = await axios.get(requestContext.context.context);
				if (fetchResult.status !== 200) {
					LoggerProxy.debug('SAML: Error while testing SAML connection.');
					return false;
				}
			} else if (requestContext.binding === 'post') {
				const context = requestContext.context as PostBindingContext;
				const endpoint = context.entityEndpoint;
				const params = new URLSearchParams();
				params.append(context.type, context.context);
				if (context.relayState) {
					params.append('RelayState', context.relayState);
				}
				const fetchResult = await axios.post(endpoint, params, {
					headers: {
						// eslint-disable-next-line @typescript-eslint/naming-convention
						'Content-type': 'application/x-www-form-urlencoded',
					},
				});
				if (fetchResult.status !== 200) {
					LoggerProxy.debug('SAML: Error while testing SAML connection.');
					return false;
				}
			}
			return true;
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			LoggerProxy.debug('SAML: Error while testing SAML connection: ', error);
		}
		return false;
	}
}
