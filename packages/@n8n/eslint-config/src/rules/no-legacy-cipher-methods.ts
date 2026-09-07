import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const BANNED_METHODS = new Set(['encrypt', 'decrypt']);

/**
 * Test files may keep calling the legacy methods: they intentionally produce
 * and read the legacy CBC format to cover read-support for existing data.
 */
const TEST_FILE_PATTERN = /(\.(test|spec)\.ts$)|([\\/]__tests__[\\/])|([\\/]test[\\/])/;

export const NoLegacyCipherMethodsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow calling the deprecated `Cipher.encrypt` / `Cipher.decrypt`. They always use the legacy instance-key AES-256-CBC path and bypass the encryption key store, so new call sites would write data that key rotation cannot manage.',
		},
		messages: {
			noLegacyCipherMethods:
				'`Cipher.{{ method }}()` is deprecated: it always uses the legacy instance-key AES-256-CBC path and bypasses the encryption key store. Use `await cipher.{{ method }}V2()` instead, or `{{ method }}WithKey()` when an explicit key and algorithm are required.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (TEST_FILE_PATTERN.test(context.filename)) return {};

		return {
			CallExpression(node) {
				const callee =
					node.callee.type === TSESTree.AST_NODE_TYPES.ChainExpression
						? node.callee.expression
						: node.callee;
				if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) return;

				const { property } = callee;
				let method: string | null = null;
				if (!callee.computed && property.type === TSESTree.AST_NODE_TYPES.Identifier) {
					method = property.name;
				} else if (
					callee.computed &&
					property.type === TSESTree.AST_NODE_TYPES.Literal &&
					typeof property.value === 'string'
				) {
					method = property.value;
				}
				if (method === null || !BANNED_METHODS.has(method)) return;

				// Cheap syntactic prefilter passed — only now consult the type checker.
				const services = ESLintUtils.getParserServices(context);
				const receiverType = services.getTypeAtLocation(callee.object);
				const symbolName = (receiverType.getSymbol() ?? receiverType.aliasSymbol)?.getName();
				if (symbolName !== 'Cipher') return;

				context.report({ node: property, messageId: 'noLegacyCipherMethods', data: { method } });
			},
		};
	},
});
