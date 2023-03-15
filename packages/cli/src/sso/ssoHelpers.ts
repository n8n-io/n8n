import config from '@/config';
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

export function setCurrentAuthenticationMethod(authenticationMethod: AuthProviderType): void {
	config.set('userManagement.authenticationMethod', authenticationMethod);
}
