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

/** Whether the field name contains any marker that suggests it may hold a secret. */
export function containsSensitivePattern(name: string): boolean {
	const lowerName = name.toLowerCase();
	return SENSITIVE_PATTERNS.some((pattern) => lowerName.includes(pattern));
}

/**
 * Whether the field name should be treated as sensitive (and therefore masked).
 * A name that contains a non-sensitive marker (URL, ID, public) is never treated
 * as sensitive, even if it also contains a sensitive one.
 */
export function isSensitiveFieldName(name: string): boolean {
	const lowerName = name.toLowerCase();

	if (NON_SENSITIVE_PATTERNS.some((pattern) => lowerName.includes(pattern))) {
		return false;
	}

	return containsSensitivePattern(name);
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
