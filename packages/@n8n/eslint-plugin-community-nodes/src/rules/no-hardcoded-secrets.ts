import { TSESTree } from '@typescript-eslint/utils';

import { createRule, getStringLiteralValue, isSensitiveName } from '../utils/index.js';

const { AST_NODE_TYPES } = TSESTree;

/**
 * Extra name fragments (beyond the shared sensitive set in `credential-fields`)
 * that suggest a JS identifier holds a credential. Bare `key`/`auth` are broad,
 * but the value heuristic below narrows the match, and they catch separator
 * forms such as `api_key` that the compound fragments miss.
 */
const EXTRA_SECRET_NAME_FRAGMENTS = ['key', 'passwd', 'auth'];

/**
 * Fragments that mark a value as an obvious placeholder rather than a real
 * secret. These are skipped to keep the (intentionally heuristic) rule quieter.
 */
const PLACEHOLDER_FRAGMENTS = [
	'example',
	'placeholder',
	'changeme',
	'your',
	'dummy',
	'xxxx',
	'<',
	'{{',
];

const MIN_SECRET_LENGTH = 16;

function nameLooksLikeSecret(name: string): boolean {
	// `exclusions: []` disables the URL/ID/pub name exclusions on purpose: the
	// value heuristic below is the real gate, so a suspicious value on e.g.
	// `publicKeyUrl` should still be flagged rather than silently skipped. Erring
	// toward a false positive is safer than missing a secret.
	return isSensitiveName(name, { extra: EXTRA_SECRET_NAME_FRAGMENTS, exclusions: [] });
}

function looksLikePlaceholder(value: string): boolean {
	const lower = value.toLowerCase();
	return PLACEHOLDER_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

/**
 * Heuristic: does this string value look like a real credential? Real secrets
 * are long, contiguous tokens with the shape of a hex digest or a base64/token
 * string. The digit+letter/punctuation requirement keeps ordinary long
 * camelCase words from being treated as secrets.
 */
function looksLikeSecretValue(value: string): boolean {
	// Require at least MIN_SECRET_LENGTH characters; anything shorter is almost
	// always a non-secret word or identifier rather than a generated credential.
	if (value.length < MIN_SECRET_LENGTH) return false;
	if (/\s/.test(value)) return false;
	if (looksLikePlaceholder(value)) return false;

	// A long, purely hexadecimal string (e.g. an MD5/SHA/hex API key).
	if (/^[0-9a-f]+$/i.test(value)) return true;

	// A base64 / base64url / token-shaped string.
	if (/^[A-Za-z0-9+/=_.-]+$/.test(value)) {
		const hasDigit = /[0-9]/.test(value);
		const hasLetter = /[a-z]/i.test(value);
		// Only `+ / =` count as a standalone signal: they are hallmarks of base64
		// but rarely appear in ordinary code strings. `. - _` are excluded here
		// because dotted/hyphenated/snake_case constants (scopes, paths, ids) use
		// them heavily and would otherwise be misflagged.
		const hasStrongBase64Punctuation = /[+/=]/.test(value);
		return (hasDigit && hasLetter) || hasStrongBase64Punctuation;
	}

	return false;
}

function getStaticStringValue(node: TSESTree.Node | null | undefined): string | null {
	if (!node) return null;

	const literal = getStringLiteralValue(node);
	if (literal !== null) return literal;

	if (
		node.type === AST_NODE_TYPES.TemplateLiteral &&
		node.expressions.length === 0 &&
		node.quasis.length === 1
	) {
		return node.quasis[0]?.value.cooked ?? null;
	}

	return null;
}

function getKeyName(key: TSESTree.Node): string | null {
	if (key.type === AST_NODE_TYPES.Identifier) return key.name;
	if (key.type === AST_NODE_TYPES.Literal && typeof key.value === 'string') return key.value;
	return null;
}

export const NoHardcodedSecretsRule = createRule({
	name: 'no-hardcoded-secrets',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow hardcoded secrets (API keys, tokens, passwords) embedded as string literals in source.',
		},
		messages: {
			hardcodedSecret:
				'Possible hardcoded secret assigned to `{{ name }}`. Store secrets in credentials or environment variables instead of embedding them in source. If this is not a real secret, rename the variable or move the value out of source to silence this rule.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const check = (name: string | null, valueNode: TSESTree.Node | null | undefined) => {
			if (!name || !valueNode || !nameLooksLikeSecret(name)) return;

			const value = getStaticStringValue(valueNode);
			if (value === null || !looksLikeSecretValue(value)) return;

			context.report({
				node: valueNode,
				messageId: 'hardcodedSecret',
				data: { name },
			});
		};

		return {
			// const apiKey = '...'
			VariableDeclarator(node) {
				if (node.id.type !== AST_NODE_TYPES.Identifier) return;
				check(node.id.name, node.init);
			},

			// class field: private token = '...'
			PropertyDefinition(node) {
				if (node.computed) return;
				check(getKeyName(node.key), node.value);
			},

			// object literal: { apiKey: '...' } or { 'api_key': '...' }
			Property(node) {
				if (node.computed) return;
				check(getKeyName(node.key), node.value);
			},

			// this.secret = '...' / config.token = '...' / secret = '...'
			AssignmentExpression(node) {
				if (node.left.type === AST_NODE_TYPES.Identifier) {
					check(node.left.name, node.right);
				} else if (
					node.left.type === AST_NODE_TYPES.MemberExpression &&
					!node.left.computed &&
					node.left.property.type === AST_NODE_TYPES.Identifier
				) {
					check(node.left.property.name, node.right);
				}
			},
		};
	},
});
