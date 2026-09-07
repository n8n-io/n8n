/**
 * Whether encryption-key rotation is enabled: with it on, `getActiveKey()`
 * hands the cipher the active data-encryption key (prefixed output) instead
 * of the legacy instance-key descriptor, and the management API is
 * registered. It also decides whether a failed key seed is fatal on startup
 * (see `EncryptionBootstrapService`). Core no longer reads this flag — the
 * module folds it into the write descriptor and into its module settings.
 * Module load, key seeding, and the provider wiring stay unconditional (see
 * `EncryptionKeyManagerModule`).
 */
export function isKeyRotationEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION === 'true';
}
