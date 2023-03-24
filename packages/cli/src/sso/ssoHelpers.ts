import config from '@/config';
import * as Db from '@/Db';
import type { AuthProviderType } from '@/databases/entities/AuthIdentity';

export function isSamlCurrentAuthenticationMethod(): boolean {
	return config.getEnv('userManagement.authenticationMethod') === 'saml';
}

export function isEmailCurrentAuthenticationMethod(): boolean {
	return config.getEnv('userManagement.authenticationMethod') === 'email';
}

export function isSsoJustInTimeProvisioningEnabled(): boolean {
	return config.getEnv('sso.justInTimeProvisioning');
}

export function doRedirectUsersFromLoginToSsoFlow(): boolean {
	return config.getEnv('sso.redirectLoginToSso');
}

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
