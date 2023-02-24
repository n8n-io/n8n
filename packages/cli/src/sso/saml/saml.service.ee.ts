import type express from 'express';
import * as Db from '@/Db';
import type { User } from '@/databases/entities/User';
import { jsonParse, LoggerProxy } from 'n8n-workflow';
import { AuthError } from '@/ResponseHelper';
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
	updateUserFromSamlAttributes,
} from './samlHelpers';

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

	public get metadata(): string {
		return this._metadata;
	}

	public set metadata(metadata: string) {
		this._metadata = metadata;
	}

	constructor() {
		this.loadSamlPreferences()
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
		await this.loadSamlPreferences();
	}

	getIdentityProviderInstance(forceRecreate = false): IdentityProviderInstance {
		if (this.identityProviderInstance === undefined || forceRecreate) {
			this.identityProviderInstance = IdentityProvider({
				metadata: this.metadata,
			});
		}

		return this.identityProviderInstance;
	}

	getRedirectLoginRequestUrl(): string {
		const loginRequest = getServiceProviderInstance().createLoginRequest(
			this.getIdentityProviderInstance(),
			'redirect',
		);
		//TODO:SAML: debug logging
		LoggerProxy.debug(loginRequest.context);
		return loginRequest.context;
	}

	async handleSamlLogin(
		req: express.Request,
		binding: 'post' | 'redirect',
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

	async getSamlPreferences(): Promise<SamlPreferences> {
		return {
			mapping: this.attributeMapping,
			metadata: this.metadata,
		};
	}

	async setSamlPreferences(prefs: SamlPreferences): Promise<void> {
		this.attributeMapping = prefs.mapping;
		this.metadata = prefs.metadata;
		this.getIdentityProviderInstance(true);
		await this.saveSamlPreferences();
	}

	async loadSamlPreferences(): Promise<SamlPreferences | undefined> {
		const samlPreferences = await Db.collections.Settings.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		if (samlPreferences) {
			const prefs = jsonParse<SamlPreferences>(samlPreferences.value);
			if (prefs) {
				this.attributeMapping = prefs.mapping;
				this.metadata = prefs.metadata;
			}
			return prefs;
		}
		return;
	}

	async saveSamlPreferences(): Promise<void> {
		const samlPreferences = await Db.collections.Settings.findOne({
			where: { key: SAML_PREFERENCES_DB_KEY },
		});
		if (samlPreferences) {
			samlPreferences.value = JSON.stringify({
				mapping: this.attributeMapping,
				metadata: this.metadata,
			});
			samlPreferences.loadOnStartup = true;
			await Db.collections.Settings.save(samlPreferences);
		} else {
			await Db.collections.Settings.save({
				key: SAML_PREFERENCES_DB_KEY,
				value: JSON.stringify({
					mapping: this.attributeMapping,
					metadata: this.metadata,
				}),
				loadOnStartup: true,
			});
		}
	}

	async getAttributesFromLoginResponse(
		req: express.Request,
		binding: 'post' | 'redirect',
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
}
