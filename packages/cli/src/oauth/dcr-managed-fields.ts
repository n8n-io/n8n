import type { OAuth2CredentialData } from '@n8n/client-oauth2';

/**
 * Credential fields owned by the dynamic client registration handshake, not by
 * the user. They are written when the client registers with the authorization
 * server and are hidden in the UI, so a credential save never carries them —
 * without them a stored token can no longer be refreshed.
 */
export const DCR_MANAGED_CREDENTIAL_FIELDS = [
	'authUrl',
	'accessTokenUrl',
	'grantType',
	'authentication',
	'usePkce',
	'clientId',
	'clientSecret',
] as const;

export type DcrManagedCredentialField = (typeof DCR_MANAGED_CREDENTIAL_FIELDS)[number];

/** Values negotiated for {@link DCR_MANAGED_CREDENTIAL_FIELDS}; `undefined` clears the field. */
export type DcrManagedCredentialValues = {
	[Field in DcrManagedCredentialField]: OAuth2CredentialData[Field] | undefined;
};
