import { LicenseState, Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { isAuthProviderType, SettingsRepository, type AuthProviderType } from '@n8n/db';
import { Container } from '@n8n/di';

import config from '@/config';
import { BadRequestError } from '@n8n/errors';

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

export function isOidcLicensedAndEnabled(): boolean {
	return (
		Container.get(GlobalConfig).sso.oidc.loginEnabled &&
		Container.get(LicenseState).isOidcLicensed() &&
		isOidcCurrentAuthenticationMethod()
	);
}

/**
 * Tells if SAML or OIDC single sign-on is on. LDAP does not count, because
 * features such as SCIM provisioning need an identity provider that signs
 * users in.
 */
export function isSamlOrOidcLoginEnabled(): boolean {
	return isSamlLicensedAndEnabled() || isOidcLicensedAndEnabled();
}

export type SamlOrOidc = Extract<AuthProviderType, 'saml' | 'oidc'>;

/**
 * Emits `sso-login-disabled`, the contract for every path that turns SAML or
 * OIDC sign-in off. Call it only when the authentication method changes from
 * `protocol` to email. A switch from one protocol to the other keeps single
 * sign-on on, so it must not call this.
 */
export async function emitSsoLoginDisabled(protocol: SamlOrOidc): Promise<void> {
	Container.get(EventService).emit('sso-login-disabled', {
		protocol,
		scimWasEnabled: await isScimProvisioningEnabled(),
	});
}

/**
 * The SCIM module turns SCIM off when it gets `sso-login-disabled`, so read
 * the switch before the event. The import is lazy, so that SSO code has no
 * static dependency on the SCIM module. The SSO change is already saved, so
 * a read failure must not fail it.
 */
async function isScimProvisioningEnabled(): Promise<boolean> {
	try {
		const { ScimSettingsService } = await import('@/modules/scim/scim-settings.service.js');
		return await Container.get(ScimSettingsService).isEnabled();
	} catch (error) {
		Container.get(Logger).warn('Failed to read the SCIM provisioning state', { error });
		return false;
	}
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

/** Only one authentication method (`email` or a single SSO method) can be active at a time. */
export function assertAuthenticationMethodCanBeEnabled(
	method: Extract<AuthProviderType, 'ldap' | 'saml' | 'oidc'>,
): void {
	const currentAuthenticationMethod = getCurrentAuthenticationMethod();
	if (currentAuthenticationMethod !== 'email' && currentAuthenticationMethod !== method) {
		throw new BadRequestError(
			`Cannot switch ${method} login enabled state when an authentication method other than email or ${method} is active (current: ${currentAuthenticationMethod})`,
		);
	}
}

export function isSsoJustInTimeProvisioningEnabled(): boolean {
	return Container.get(GlobalConfig).sso.justInTimeProvisioning;
}

export function doRedirectUsersFromLoginToSsoFlow(): boolean {
	return Container.get(GlobalConfig).sso.redirectLoginToSso;
}
