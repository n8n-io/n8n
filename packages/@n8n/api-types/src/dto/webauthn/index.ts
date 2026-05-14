export interface WebAuthnCredentialResponse {
	id: string;
	credentialId: string;
	label: string;
	deviceType: string | null;
	backedUp: boolean;
	transports: string[] | null;
	aaguid: string | null;
	createdAt: string;
	lastUsedAt: string | null;
}

/**
 * Classify a WebAuthn credential as a platform authenticator (passkey) vs a
 * roaming authenticator (security key). Shared with the backend so the FE
 * and BE classify the same row identically.
 */
export function isPlatformCredential(c: {
	transports?: string[] | null;
	deviceType?: string | null;
}): boolean {
	return (c.transports ?? []).includes('internal') || c.deviceType === 'multiDevice';
}
