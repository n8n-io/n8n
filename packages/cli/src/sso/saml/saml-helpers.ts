import { randomString } from 'n8n-workflow';
import type { FlowResult } from 'samlify/types/src/flow';
import { Container } from 'typedi';

import config from '@/config';
import { AuthIdentity } from '@/databases/entities/auth-identity';
import type { User } from '@/databases/entities/user';
import { AuthIdentityRepository } from '@/databases/repositories/auth-identity.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { AuthError } from '@/errors/response-errors/auth.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { License } from '@/license';
import { PasswordUtility } from '@/services/password.utility';

import { SAML_LOGIN_ENABLED, SAML_LOGIN_LABEL } from './constants';
import { getServiceProviderConfigTestReturnUrl } from './service-provider.ee';
import type { SamlConfiguration } from './types/requests';
import type { SamlAttributeMapping } from './types/saml-attribute-mapping';
import type { SamlPreferences } from './types/saml-preferences';
import type { SamlUserAttributes } from './types/saml-user-attributes';
import {
	getCurrentAuthenticationMethod,
	isEmailCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '../sso-helpers';

/**
 *  Check whether the SAML feature is licensed and enabled in the instance
 */
export function isSamlLoginEnabled(): boolean {
	return config.getEnv(SAML_LOGIN_ENABLED);
}

export function getSamlLoginLabel(): string {
	return config.getEnv(SAML_LOGIN_LABEL);
}

// can only toggle between email and saml, not directly to e.g. ldap
export async function setSamlLoginEnabled(enabled: boolean): Promise<void> {
	if (isEmailCurrentAuthenticationMethod() || isSamlCurrentAuthenticationMethod()) {
		if (enabled) {
			config.set(SAML_LOGIN_ENABLED, true);
			await setCurrentAuthenticationMethod('saml');
		} else if (!enabled) {
			config.set(SAML_LOGIN_ENABLED, false);
			await setCurrentAuthenticationMethod('email');
		}
	} else {
		throw new InternalServerError(
			`Cannot switch SAML login enabled state when an authentication method other than email or saml is active (current: ${getCurrentAuthenticationMethod()})`,
		);
	}
}

export function setSamlLoginLabel(label: string): void {
	config.set(SAML_LOGIN_LABEL, label);
}

export function isSamlLicensed(): boolean {
	return Container.get(License).isSamlEnabled();
}

export function isSamlLicensedAndEnabled(): boolean {
	return isSamlLoginEnabled() && isSamlLicensed() && isSamlCurrentAuthenticationMethod();
}

export const isSamlPreferences = (candidate: unknown): candidate is SamlPreferences => {
	const o = candidate as SamlPreferences;
	return (
		typeof o === 'object' &&
		typeof o.metadata === 'string' &&
		typeof o.mapping === 'object' &&
		o.mapping !== null &&
		o.loginEnabled !== undefined
	);
};

export async function createUserFromSamlAttributes(attributes: SamlUserAttributes): Promise<User> {
	const randomPassword = randomString(18);
	const userRepository = Container.get(UserRepository);
	return await userRepository.manager.transaction(async (trx) => {
		const { user } = await userRepository.createUserWithProject(
			{
				email: attributes.email.toLowerCase(),
				firstName: attributes.firstName,
				lastName: attributes.lastName,
				role: 'global:member',
				// generates a password that is not used or known to the user
				password: await Container.get(PasswordUtility).hash(randomPassword),
			},
			trx,
		);

		await trx.save(
			trx.create(AuthIdentity, {
				providerId: attributes.userPrincipalName,
				providerType: 'saml',
				userId: user.id,
			}),
		);

		return user;
	});
}

export async function updateUserFromSamlAttributes(
	user: User,
	attributes: SamlUserAttributes,
): Promise<User> {
	if (!attributes.email) throw new AuthError('Email is required to update user');
	if (!user) throw new AuthError('User not found');
	let samlAuthIdentity = user?.authIdentities.find((e) => e.providerType === 'saml');
	if (!samlAuthIdentity) {
		samlAuthIdentity = new AuthIdentity();
		samlAuthIdentity.providerId = attributes.userPrincipalName;
		samlAuthIdentity.providerType = 'saml';
		samlAuthIdentity.user = user;
		user.authIdentities.push(samlAuthIdentity);
	} else {
		samlAuthIdentity.providerId = attributes.userPrincipalName;
	}
	await Container.get(AuthIdentityRepository).save(samlAuthIdentity, { transaction: false });
	user.firstName = attributes.firstName;
	user.lastName = attributes.lastName;
	const resultUser = await Container.get(UserRepository).save(user, { transaction: false });
	if (!resultUser) throw new AuthError('Could not create User');
	return resultUser;
}

type GetMappedSamlReturn = {
	attributes: SamlUserAttributes | undefined;
	missingAttributes: string[];
};

export function getMappedSamlAttributesFromFlowResult(
	flowResult: FlowResult,
	attributeMapping: SamlAttributeMapping,
): GetMappedSamlReturn {
	const result: GetMappedSamlReturn = {
		attributes: undefined,
		missingAttributes: [] as string[],
	};
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (flowResult?.extract?.attributes) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const attributes = flowResult.extract.attributes as { [key: string]: string };
		// TODO:SAML: fetch mapped attributes from flowResult.extract.attributes and create or login user
		const email = attributes[attributeMapping.email];
		const firstName = attributes[attributeMapping.firstName];
		const lastName = attributes[attributeMapping.lastName];
		const userPrincipalName = attributes[attributeMapping.userPrincipalName];

		result.attributes = {
			email,
			firstName,
			lastName,
			userPrincipalName,
		};
		if (!email) result.missingAttributes.push(attributeMapping.email);
		if (!userPrincipalName) result.missingAttributes.push(attributeMapping.userPrincipalName);
		if (!firstName) result.missingAttributes.push(attributeMapping.firstName);
		if (!lastName) result.missingAttributes.push(attributeMapping.lastName);
	}
	return result;
}

export function isConnectionTestRequest(req: SamlConfiguration.AcsRequest): boolean {
	return req.body.RelayState === getServiceProviderConfigTestReturnUrl();
}
