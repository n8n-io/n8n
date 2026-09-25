import { SECRETS_PROVIDER_KEY_PATTERN } from '@n8n/api-types';
import get from 'lodash/get';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { getAllKeyPaths } from '@/utils';

const SECRETS_REFERENCE_REGEX = /\$secrets\b/;

/**
 * Checks if a string value references `$secrets` inside an expression block.
 *
 * Detects both dot notation ($secrets.vault.key) and bracket notation ($secrets['vault']['key']) and considering that string can have whitespaces, line terminators, etc.
 */
function containsExternalSecretExpression(value: string): boolean {
	for (const [, blockContent] of value.matchAll(/\{\{(.*?)\}\}/gs)) {
		if (SECRETS_REFERENCE_REGEX.test(blockContent)) {
			return true;
		}
	}
	return false;
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

		// Match provider keys in dot notation, including mixed notation and
		// whitespace/line terminators between the identifier and the accessor:
		// - $secrets.providerKey.secret
		// - $secrets.providerKey['secret']
		// - $secrets.providerKey["secret"]
		// - $secrets .providerKey['secret']
		// - $secrets\n.providerKey["secret"]
		const dotMatches = expressionContent.matchAll(
			new RegExp(`\\$secrets\\s*\\.\\s*(${SECRETS_PROVIDER_KEY_PATTERN})(?=\\s*\\.|\\s*\\[)`, 'g'),
		);
		for (const match of dotMatches) {
			providerKeys.add(match[1]);
		}

		// Match bracket notation occurrences where the provider key is a string
		// literal directly bracket-accessed (whitespace tolerant):
		// - $secrets['providerKey']
		// - $secrets ['providerKey']
		// - $secrets["providerKey"]
		const bracketMatches = expressionContent.matchAll(
			new RegExp(`\\$secrets\\s*\\[\\s*['"](${SECRETS_PROVIDER_KEY_PATTERN})['"]\\s*\\]`, 'g'),
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
