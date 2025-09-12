import { GlobalConfig } from '@n8n/config';
import { isAuthProviderType, SettingsRepository, type AuthProviderType } from '@n8n/db';
import { Container } from '@n8n/di';

import config from '@/config';
import { Logger } from '@n8n/backend-common';

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

export function isLdapCurrentAuthenticationMethod(): boolean {
	return getCurrentAuthenticationMethod() === 'ldap';
}

export function isOidcCurrentAuthenticationMethod(): boolean {
	return getCurrentAuthenticationMethod() === 'oidc';
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
