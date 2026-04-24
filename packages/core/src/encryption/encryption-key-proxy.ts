export type KeyInfo = { id: string; value: string; algorithm: string };

/**
 * Bridge between `Cipher` (packages/core) and the key manager (packages/cli).
 * The concrete implementation is registered by `EncryptionKeyManagerModule`
 * via `Container.set(EncryptionKeyProxy, Container.get(KeyManagerService))`.
 * Cipher retrieves it lazily so that no circular dependency is introduced.
 *
 * `value` in `KeyInfo` is the key material already encrypted with the instance key.
 * Callers must `decryptWithInstanceKey()` before using it for data encryption.
 */
export abstract class EncryptionKeyProxy {
	abstract getActiveKey(): Promise<KeyInfo>;
	abstract getKeyById(id: string): Promise<KeyInfo | null>;
	abstract getLegacyKey(): Promise<KeyInfo>;
}
