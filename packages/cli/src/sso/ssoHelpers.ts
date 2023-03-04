import config from '@/config';

export function isSamlCurrentAuthenticationMethod(): boolean {
	return config.getEnv('userManagement.authenticationMethod') === 'saml';
}

export function isSsoJustInTimeProvisioningEnabled(): boolean {
	return config.getEnv('sso.justInTimeProvisioning');
}

export function doRedirectUsersFromLoginToSsoFlow(): boolean {
	return config.getEnv('sso.redirectLoginToSso');
}

export function setCurrentAuthenticationMethod(
	authenticationMethod: 'email' | 'ldap' | 'saml',
): void {
	config.set('userManagement.authenticationMethod', authenticationMethod);
}
