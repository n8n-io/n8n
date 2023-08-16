import config from '@/config';
import * as Db from '@/Db';
import type { AuthProviderType } from '@db/entities/AuthIdentity';

/**
 * Only one authentication method can be active at a time. This function sets the current authentication method
 * and saves it to the database.
 * SSO methods should only switch to email and then to another method. Email can switch to any method.
 * @param authenticationMethod
 */
export async function setCurrentAuthenticationMethod(
	authenticationMethod: AuthProviderType,
): Promise<void> {
	config.set('userManagement.authenticationMethod', authenticationMethod);
	await Db.collections.Settings.save({
		key: 'userManagement.authenticationMethod',
		value: authenticationMethod,
		loadOnStartup: true,
	});
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

export function isEmailCurrentAuthenticationMethod(): boolean {
	return getCurrentAuthenticationMethod() === 'email';
}

export function isSsoJustInTimeProvisioningEnabled(): boolean {
	return config.getEnv('sso.justInTimeProvisioning');
}

export function doRedirectUsersFromLoginToSsoFlow(): boolean {
	return config.getEnv('sso.redirectLoginToSso');
}
