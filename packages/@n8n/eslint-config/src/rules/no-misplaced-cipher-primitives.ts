import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const PRIMITIVE_CLASSES = new Set(['CipherAes256CBC', 'CipherAes256GCM']);
const EXPLICIT_KEY_METHODS = new Set(['encryptWithKey', 'decryptWithKey']);

/**
 * The encryption area itself and database migrations may use the raw
 * primitives; everything else must encrypt through the key-store-aware
 * `encryptV2` / `decryptV2`.
 */
const ALLOWED_PATH_PATTERN = /([\\/]core[\\/]src[\\/]encryption[\\/])|([\\/]migrations[\\/])/;

/** Test files stay free to exercise any format for coverage. */
const TEST_FILE_PATTERN = /(\.(test|spec)\.ts$)|([\\/]__tests__[\\/])|([\\/]test[\\/])/;

export const NoMisplacedCipherPrimitivesRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Restrict the raw cipher primitives (`CipherAes256CBC`/`CipherAes256GCM`, `Cipher.encryptWithKey`/`decryptWithKey`) to the encryption area and database migrations. New encryption elsewhere must go through `encryptV2`/`decryptV2` so the key store stays in charge of key and format.',
		},
		messages: {
			noPrimitiveReference:
				'Do not reference `{{name}}` outside the encryption area. Encrypt through `cipher.encryptV2()` / `cipher.decryptV2()` instead.',
			noExplicitKeyCall:
				'`Cipher.{{method}}()` is restricted to the encryption area and database migrations. New encryption must go through `encryptV2`/`decryptV2` so the key store stays in charge of key and format.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (ALLOWED_PATH_PATTERN.test(context.filename) || TEST_FILE_PATTERN.test(context.filename)) {
			return {};
		}

		// Import specifiers expose the same source range twice (imported +
		// local identifier); report each range once.
		const reportedAt = new Set<number>();

		return {
			// A blanket identifier check catches every reference shape: static and
			// dynamic imports, namespace member access, re-exports, and direct use.
			Identifier(node) {
				if (!PRIMITIVE_CLASSES.has(node.name)) return;
				if (reportedAt.has(node.range[0])) return;
				reportedAt.add(node.range[0]);
				context.report({ node, messageId: 'noPrimitiveReference', data: { name: node.name } });
			},
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
				if (method === null || !EXPLICIT_KEY_METHODS.has(method)) return;

				// Cheap syntactic prefilter passed — only now consult the type checker.
				const services = ESLintUtils.getParserServices(context);
				const receiverType = services.getTypeAtLocation(callee.object);
				const symbolName = (receiverType.getSymbol() ?? receiverType.aliasSymbol)?.getName();
				if (symbolName !== 'Cipher') return;

				context.report({ node: property, messageId: 'noExplicitKeyCall', data: { method } });
			},
		};
	},
});
