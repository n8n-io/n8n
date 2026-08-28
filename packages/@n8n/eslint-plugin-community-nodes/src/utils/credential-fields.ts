import { TSESTree } from '@typescript-eslint/utils';

import { findObjectProperty, getBooleanLiteralValue } from './ast-utils.js';

const SENSITIVE_PATTERNS = [
	'password',
	'secret',
	'token',
	'cert',
	'passphrase',
	'apikey',
	'secretkey',
	'privatekey',
	'authkey',
];

const NON_SENSITIVE_PATTERNS = ['url', 'pub', 'id'];

/**
 * Whether a name looks like it holds a secret. A name is sensitive when it
 * contains a sensitive pattern (or a caller-supplied `extra` one) and none of
 * the `exclusions`. Exclusions win, so under the default set `tokenUrl` and
 * `secretId` are not sensitive even though they contain `token`/`secret`.
 *
 * - Credential-field masking uses the default exclusions (a field named
 *   `tokenUrl` is a URL, not a secret to mask).
 * - Pass `exclusions: []` to match on the raw patterns alone, e.g. when a
 *   second gate (like a value heuristic) already guards against false positives.
 * - Pass `extra` to add caller-specific patterns without widening the shared set.
 */
export function isSensitiveName(
	name: string,
	options: { extra?: string[]; exclusions?: string[] } = {},
): boolean {
	const { extra = [], exclusions = NON_SENSITIVE_PATTERNS } = options;
	const lowerName = name.toLowerCase();

	if (exclusions.some((pattern) => lowerName.includes(pattern))) {
		return false;
	}

	return [...SENSITIVE_PATTERNS, ...extra].some((pattern) => lowerName.includes(pattern));
}

/** Whether the credential field element sets `typeOptions: { password: true }`. */
export function hasPasswordTypeOption(element: TSESTree.ObjectExpression): boolean {
	const typeOptionsProperty = findObjectProperty(element, 'typeOptions');

	if (typeOptionsProperty?.value.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
		return false;
	}

	const passwordProperty = findObjectProperty(typeOptionsProperty.value, 'password');
	const passwordValue = passwordProperty ? getBooleanLiteralValue(passwordProperty.value) : null;

	return passwordValue === true;
}
