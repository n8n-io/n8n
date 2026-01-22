import { LicenseState, Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { isAuthProviderType, SettingsRepository, type AuthProviderType } from '@n8n/db';
import { Container } from '@n8n/di';

import config from '@/config';

/**
 * Only one authentication method can be active at a time. This function sets
 * the current authentication method and saves it to the database.
 * SSO methods should only switch to email and then to another method. Email
 * can switch to any method.
 */
export async function setCurrentAuthenticationMethod(
	authenticationMethod: AuthProviderType,
): Promise<void> {
	config.set('userManagement.authenticationMethod', authenticationMethod);
	await Container.get(SettingsRepository).save(
		{
			key: 'userManagement.authenticationMethod',
			value: authenticationMethod,
			loadOnStartup: true,
		},
		{ transaction: false },
	);
}

export async function reloadAuthenticationMethod(): Promise<void> {
	const settings = await Container.get(SettingsRepository).findByKey(
		'userManagement.authenticationMethod',
	);
	if (settings) {
		if (isAuthProviderType(settings.value)) {
			const authenticationMethod = settings.value;
			config.set('userManagement.authenticationMethod', authenticationMethod);
			Container.get(Logger).debug('Reloaded authentication method from the database', {
				authenticationMethod,
			});
		} else {
			Container.get(Logger).warn('Invalid authentication method read from the database', {
				value: settings.value,
			});
		}
	}
}

export function getCurrentAuthenticationMethod(): AuthProviderType {
	return config.getEnv('userManagement.authenticationMethod');
}

export function isSamlCurrentAuthenticationMethod(): boolean {
	return getCurrentAuthenticationMethod() === 'saml';
}

/**
 *  Check whether the SAML feature is licensed and enabled in the instance
 */
export function isSamlLoginEnabled(): boolean {
	return Container.get(GlobalConfig).sso.saml.loginEnabled;
}

export function getSamlLoginLabel(): string {
	return Container.get(GlobalConfig).sso.saml.loginLabel;
}

export function isSamlLicensed(): boolean {
	return Container.get(LicenseState).isSamlLicensed();
}

export function isSamlLicensedAndEnabled(): boolean {
	return isSamlLoginEnabled() && isSamlLicensed() && isSamlCurrentAuthenticationMethod();
}

export function isLdapCurrentAuthenticationMethod(): boolean {
	return getCurrentAuthenticationMethod() === 'ldap';
}

export function isOidcCurrentAuthenticationMethod(): boolean {
	return getCurrentAuthenticationMethod() === 'oidc';
}

export function isSsoCurrentAuthenticationMethod(): boolean {
	return (
		isSamlCurrentAuthenticationMethod() ||
		isLdapCurrentAuthenticationMethod() ||
		isOidcCurrentAuthenticationMethod()
	);
}

export function isEmailCurrentAuthenticationMethod(): boolean {
	return getCurrentAuthenticationMethod() === 'email';
}

export function isSsoJustInTimeProvisioningEnabled(): boolean {
	return Container.get(GlobalConfig).sso.justInTimeProvisioning;
}

export function doRedirectUsersFromLoginToSsoFlow(): boolean {
	return Container.get(GlobalConfig).sso.redirectLoginToSso;
}
