import tseslint from 'typescript-eslint';

/**
 * Encryption boundary.
 *
 * New code must encrypt and decrypt through the key-store-aware `Cipher`
 * methods (`encryptV2` / `decryptV2`, or the explicit `*WithKey` variants).
 * The deprecated `Cipher.encrypt` / `Cipher.decrypt` always take the legacy
 * instance-key AES-256-CBC path, which key rotation cannot manage. This turns
 * on `n8n-local-rules/no-legacy-cipher-methods` for every Node backend
 * package (it is part of `nodeConfig`).
 *
 * Out of natural scope:
 * - Frontend packages (they use `frontendConfig`, not `nodeConfig`)
 * - Test files (exempted inside the rule — they cover reading the legacy
 *   CBC format that existing deployments still hold)
 */
export const encryptionBoundaryConfig = tseslint.config({
	rules: {
		'n8n-local-rules/no-legacy-cipher-methods': 'error',
	},
});
