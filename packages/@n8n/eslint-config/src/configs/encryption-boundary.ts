import tseslint from 'typescript-eslint';

/**
 * Encryption boundary (IAM-1291).
 *
 * New code must encrypt and decrypt through the key-store-aware `Cipher`
 * methods (`encryptV2` / `decryptV2`), so the key-manager module stays in
 * charge of which key is used and in which output format. Enforced for every
 * package on `nodeConfig`, plus the baseConfig backend packages that can
 * reach the primitives or the entity — `@n8n/db` and `@n8n/task-runner`
 * compose this config in their own eslint.config.mjs:
 *
 * - `no-legacy-cipher-methods`: the deprecated `Cipher.encrypt` / `decrypt`
 *   always take the legacy instance-key AES-256-CBC path, which key rotation
 *   cannot manage.
 * - `no-misplaced-cipher-primitives`: the raw AES classes and the explicit
 *   `encryptWithKey` / `decryptWithKey` stay inside the encryption area and
 *   database migrations.
 * - `no-deployment-key-delete`: data encrypted with a key becomes unreadable
 *   without it — keys are deactivated, never deleted.
 * - `no-encryption-guardrail-disable`: the rules above cannot be silenced
 *   inline; widening the boundary happens here, under security ownership
 *   (see OWNERS).
 *
 * Out of natural scope:
 * - Frontend packages (they use `frontendConfig`, not `nodeConfig`)
 * - Test files (exempted inside the rules — they cover reading the legacy
 *   CBC format that existing deployments still hold)
 * - Confining the instance key itself is IAM-650 (Release C) — do not add
 *   instance-key rules here until the derivations are removed.
 */
export const encryptionBoundaryConfig = tseslint.config({
	rules: {
		'n8n-local-rules/no-legacy-cipher-methods': 'error',
		'n8n-local-rules/no-misplaced-cipher-primitives': 'error',
		'n8n-local-rules/no-deployment-key-delete': 'error',
		'n8n-local-rules/no-encryption-guardrail-disable': 'error',
	},
});
