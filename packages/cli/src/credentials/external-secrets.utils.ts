import get from 'lodash/get';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { getAllKeyPaths } from '@/utils';

/**
 * Regular expression pattern for valid provider keys.
 * Keep this in sync with the regex implemented in CreateSecretsProviderConnectionDto.
 */
const PROVIDER_KEY_PATTERN = '[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*';

/**
 * Checks if a string value contains an external secret expression.
 * Detects both dot notation ($secrets.vault.key) and bracket notation ($secrets['vault']['key']).
 */
function containsExternalSecretExpression(value: string): boolean {
	const containsExpression = value.includes('{{') && value.includes('}}');
	if (!containsExpression) {
		return false;
	}
	return value.includes('$secrets.') || value.includes('$secrets[');
}

export function getExternalSecretExpressionPaths(data: unknown): string[] {
	return getAllKeyPaths(data, '', [], containsExternalSecretExpression);
}

/**
 * Extracts the provider keys from an expression string.
 * Supports both dot notation ($secrets.vault.key) and bracket notation ($secrets['vault']['key']).
 * Only extracts provider keys from $secrets references inside {{ }} expression braces.
 */
export function extractProviderKeysFromExpression(expression: string): string[] {
	const providerKeys = new Set<string>();

	const expressionBlocks = expression.matchAll(/\{\{(.*?)\}\}/gs);

	for (const expression of expressionBlocks) {
		const expressionContent = expression[1]; // Content inside {{ }}

		// Match all dot notation occurrences: $secrets.providerKey
		const dotMatches = expressionContent.matchAll(
			new RegExp(`\\$secrets\\.(${PROVIDER_KEY_PATTERN})(?=\\.)`, 'g'),
		);
		for (const match of dotMatches) {
			providerKeys.add(match[1]);
		}

		// Match all bracket notation occurrences: $secrets['providerKey'] or $secrets["providerKey"]
		const bracketMatches = expressionContent.matchAll(
			new RegExp(`\\$secrets\\[['"](${PROVIDER_KEY_PATTERN})['"]\\]`, 'g'),
		);
		for (const match of bracketMatches) {
			providerKeys.add(match[1]);
		}
	}

	return Array.from(providerKeys);
}

export function extractProviderKeysFromCredentialData(
	data: ICredentialDataDecryptedObject,
): ReadonlySet<string> {
	const secretPaths = getExternalSecretExpressionPaths(data);
	const providerKeys = new Set<string>();

	for (const path of secretPaths) {
		const expressionString = get(data, path);
		if (typeof expressionString !== 'string') continue;
		for (const providerKey of extractProviderKeysFromExpression(expressionString)) {
			providerKeys.add(providerKey);
		}
	}

	return providerKeys;
}
