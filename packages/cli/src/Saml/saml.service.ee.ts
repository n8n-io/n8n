import type express from 'express';
import * as Db from '@/Db';
import type { User } from '../databases/entities/User';
import { LoggerProxy } from 'n8n-workflow';
import { AuthError } from '../ResponseHelper';
import { getIdentityProviderInstance } from './identityProvider.ee';
import { getServiceProviderInstance } from './serviceProvider.ee';
import type { SamlUserAttributes } from './types/samlUserAttributes';
import type { SamlAttributeMapping } from './types/samlAttributeMapping';
import { isSsoJustInTimeProvisioningEnabled } from './helpers';

export class SamlService {
	private static instance: SamlService;

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

	static getInstance(): SamlService {
		if (!SamlService.instance) {
			SamlService.instance = new SamlService();
		}
		return SamlService.instance;
	}

	getRedirectLoginRequestUrl(): string {
		const loginRequest = getServiceProviderInstance().createLoginRequest(
			getIdentityProviderInstance(),
			'redirect',
		);
		// TODO:SAML: remove, but keep for manual testing for now
		LoggerProxy.debug(JSON.stringify(loginRequest));
		return loginRequest.context;
	}

	async handleSamlLogin(req: express.Request): Promise<
		| {
				authenticatedUser: User | undefined;
				attributes: SamlUserAttributes;
				onboardingRequired: boolean;
		  }
		| undefined
	> {
		const attributes = await SamlService.getInstance().getAttributesFromLoginResponse(req);
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
					return {
						authenticatedUser: user,
						attributes,
						onboardingRequired: true,
					};
					// TODO:SAML: redirect to user details page
				}
			} else {
				// New users to be created JIT based on SAML attributes
				if (isSsoJustInTimeProvisioningEnabled()) {
					console.log('// TODO:SAML: create user');
					// TODO:SAML: create user
					// TODO:SAML: redirect to details page
					return {
						authenticatedUser: undefined,
						attributes,
						onboardingRequired: true,
					};
				}
			}
		}
		return undefined;
	}

	async getAttributesFromLoginResponse(req: express.Request): Promise<SamlUserAttributes> {
		const parsedSamlResponse = await getServiceProviderInstance().parseLoginResponse(
			getIdentityProviderInstance(),
			'post',
			req,
		);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (parsedSamlResponse?.extract?.attributes) {
			// TODO:SAML: remove, but keep for manual testing for now
			// LoggerProxy.debug(JSON.stringify(parsedSamlResponse.extract));
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const attributes = parsedSamlResponse.extract.attributes as { [key: string]: string };
			// TODO:SAML: fetch mapped attributes from parsedSamlResponse.extract.attributes and create or login user
			const email = attributes[this.attributeMapping.email];
			const firstName = attributes[this.attributeMapping.firstName];
			const lastName = attributes[this.attributeMapping.lastName];
			const userPrincipalName = attributes[this.attributeMapping.userPrincipalName];

			if (email) {
				return {
					email,
					firstName,
					lastName,
					userPrincipalName,
				};
			} else {
				// collect missing attributes for more informative error message
				const attributesErrors = [];
				if (!email) attributesErrors.push(this.attributeMapping.email);
				if (!userPrincipalName) attributesErrors.push(this.attributeMapping.userPrincipalName);
				if (!firstName) attributesErrors.push(this.attributeMapping.firstName);
				if (!lastName) attributesErrors.push(this.attributeMapping.lastName);

				throw new AuthError(
					`SAML Authentication failed. ${
						attributesErrors ? 'Missing or invalid attributes: ' + attributesErrors.join(', ') : ''
					}`,
				);
			}
		} else {
			throw new AuthError(
				'SAML Authentication failed. Invalid SAML response (missing attributes).',
			);
		}
	}
}
