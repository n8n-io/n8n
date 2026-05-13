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
