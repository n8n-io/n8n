/**
 * Whether the encryption-key-rotation paths and management API are enabled.
 * It also decides whether a failed key seed is fatal on startup (see
 * `EncryptionBootstrapService`). Module load, key seeding, and the provider
 * wiring are unconditional (see `EncryptionKeyManagerModule`) so the keys
 * exist fleet-wide, but the cipher still checks this flag per instance before
 * using them to encrypt or decrypt — moving that decision out of the cipher
 * is a separate step.
 */
export function isKeyRotationEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION === 'true';
}
