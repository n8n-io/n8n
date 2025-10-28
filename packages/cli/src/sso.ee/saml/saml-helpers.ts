import type { SamlAcsDto, SamlPreferences } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { AuthIdentity, AuthIdentityRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomString } from 'n8n-workflow';
import type { FlowResult } from 'samlify/types/src/flow';

import { AuthError } from '@/errors/response-errors/auth.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { License } from '@/license';
import { PasswordUtility } from '@/services/password.utility';

import { getServiceProviderConfigTestReturnUrl } from './service-provider.ee';
import type { SamlAttributeMapping, SamlUserAttributes } from './types';
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
	return Container.get(GlobalConfig).sso.saml.loginEnabled;
}

export function getSamlLoginLabel(): string {
	return Container.get(GlobalConfig).sso.saml.loginLabel;
}

// can only toggle between email and saml, not directly to e.g. ldap
export async function setSamlLoginEnabled(enabled: boolean): Promise<void> {
	const currentAuthenticationMethod = getCurrentAuthenticationMethod();
	if (enabled && !isEmailCurrentAuthenticationMethod() && !isSamlCurrentAuthenticationMethod()) {
		throw new InternalServerError(
			`Cannot switch SAML login enabled state when an authentication method other than email or saml is active (current: ${currentAuthenticationMethod})`,
		);
	}

	const targetAuthenticationMethod =
		!enabled && currentAuthenticationMethod === 'saml' ? 'email' : currentAuthenticationMethod;

	Container.get(GlobalConfig).sso.saml.loginEnabled = enabled;
	await setCurrentAuthenticationMethod(enabled ? 'saml' : targetAuthenticationMethod);
}

export function setSamlLoginLabel(label: string): void {
	Container.get(GlobalConfig).sso.saml.loginLabel = label;
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
				role: { slug: 'global:member' },
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
	if (!resultUser) throw new AuthError('Could not update User');
	const userWithRole = await Container.get(UserRepository).findOne({
		where: { id: resultUser.id },
		relations: ['role'],
		transaction: false,
	});
	if (!userWithRole) throw new AuthError('Failed to fetch user!');
	return userWithRole;
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
		const n8nInstanceRole = attributes[attributeMapping.n8nInstanceRole];

		result.attributes = {
			email,
			firstName,
			lastName,
			userPrincipalName,
			n8nInstanceRole,
		};
		if (!email) result.missingAttributes.push(attributeMapping.email);
		if (!userPrincipalName) result.missingAttributes.push(attributeMapping.userPrincipalName);
		if (!firstName) result.missingAttributes.push(attributeMapping.firstName);
		if (!lastName) result.missingAttributes.push(attributeMapping.lastName);
	}
	return result;
}

export function isConnectionTestRequest(payload: SamlAcsDto): boolean {
	return payload.RelayState === getServiceProviderConfigTestReturnUrl();
}

/**
 * Sanitizes a redirect URL to prevent open redirect vulnerabilities.
 * Allows relative paths and same-origin absolute URLs.
 *
 * @param redirectUrl - The URL to sanitize
 * @param instanceBaseUrl - The instance base URL to validate against
 * @param defaultRedirect - The default redirect if validation fails (default: '/')
 * @returns A safe redirect URL
 */
export function sanitizeRedirectUrl(
	redirectUrl: string | undefined,
	instanceBaseUrl: string,
	defaultRedirect: string = '/',
): string {
	// Return default if empty or not a string
	if (!redirectUrl || typeof redirectUrl !== 'string') {
		return defaultRedirect;
	}

	const trimmedUrl = redirectUrl.trim();

	// Return default if empty after trim
	if (trimmedUrl === '') {
		return defaultRedirect;
	}

	// Allow local redirects (relative paths)
	if (trimmedUrl.startsWith('/')) {
		return trimmedUrl;
	}

	try {
		// Only allow origin domain redirects
		const redirectUrlObj = new URL(trimmedUrl);
		const instanceUrlObj = new URL(instanceBaseUrl);

		if (redirectUrlObj.origin === instanceUrlObj.origin) {
			return trimmedUrl;
		}
	} catch {
		// Invalid URL, fall through to return default
	}

	return defaultRedirect;
}
