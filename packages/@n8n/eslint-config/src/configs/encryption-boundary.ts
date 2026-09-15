import tseslint from 'typescript-eslint';

/**
 * Encryption boundary.
 *
 * New code must encrypt and decrypt through the key-store-aware `Cipher`
 * methods (`encryptV2` / `decryptV2`), so the key-manager module stays in
 * charge of which key is used and in which output format. `nodeConfig`
 * composes this config; baseConfig packages that depend on `n8n-core` or
 * `@n8n/db` compose it in their own eslint.config.mjs. The code-health rule
 * `encryption-boundary` verifies that coverage in CI and rejects package-level
 * downgrades and inline directives that would silence these rules:
 *
 * - `no-legacy-cipher-methods`: the deprecated `Cipher.encrypt` / `decrypt`
 *   always take the legacy instance-key AES-256-CBC path, which key rotation
 *   cannot manage.
 * - `no-misplaced-cipher-primitives`: the raw AES classes and the explicit
 *   `encryptWithKey` / `decryptWithKey` stay inside the encryption area and
 *   database migrations.
 * - `no-deployment-key-delete`: data encrypted with a key becomes unreadable
 *   without it — keys are deactivated, never deleted.
 * - `no-encryption-guardrail-disable`: in-editor feedback that the rules
 *   above cannot be silenced inline; widening the boundary happens here,
 *   under security ownership (see OWNERS).
 *
 * Out of natural scope:
 * - Frontend packages (they use `frontendConfig`, not `nodeConfig`)
 * - Test files (exempted inside the rules — they cover reading the legacy
 *   CBC format that existing deployments still hold)
 * - Confining the instance key itself: do not add instance-key rules here
 *   until its derivations are removed (a later release).
 */
export const encryptionBoundaryConfig = tseslint.config({
	rules: {
		'n8n-local-rules/no-legacy-cipher-methods': 'error',
		'n8n-local-rules/no-misplaced-cipher-primitives': 'error',
		'n8n-local-rules/no-deployment-key-delete': 'error',
		'n8n-local-rules/no-encryption-guardrail-disable': 'error',
	},
});
