import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

const PRIMITIVE_CLASSES = new Set(['CipherAes256CBC', 'CipherAes256GCM']);
const EXPLICIT_KEY_METHODS = new Set(['encryptWithKey', 'decryptWithKey']);

/**
 * Wildcard re-exports from these sources would expose the primitives.
 * `n8n-core`'s own barrel (`export * from './encryption'`) is the sanctioned
 * public surface and is not matched.
 */
const REEXPORT_SOURCE = /(^n8n-core$)|(aes-256)/;

/**
 * The encryption area itself and the database migrations may use the raw
 * primitives; everything else must encrypt through the key-store-aware
 * `encryptV2` / `decryptV2`. Only the actual database migration root is
 * exempt — an unrelated directory that happens to be called `migrations`
 * is not.
 */
const ALLOWED_PATH_PATTERN =
	/([\\/]core[\\/]src[\\/]encryption[\\/])|([\\/]@n8n[\\/]db[\\/]src[\\/]migrations[\\/])/;

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
				'`Cipher.{{method}}` is restricted to the encryption area and database migrations. New encryption must go through `encryptV2`/`decryptV2` so the key store stays in charge of key and format.',
			noWildcardReexport:
				'Do not `export *` from `{{source}}` outside the encryption area — it re-exports the raw cipher primitives.',
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

		/** True for `Cipher` itself and for anything extending it. */
		const typeIsCipher = (type: ts.Type, seen = new Set<ts.Type>()): boolean => {
			if (seen.has(type)) return false;
			seen.add(type);
			if ((type.getSymbol() ?? type.aliasSymbol)?.getName() === 'Cipher') return true;
			if (type.isClassOrInterface()) {
				return (type.getBaseTypes() ?? []).some((base) => typeIsCipher(base, seen));
			}
			return false;
		};

		return {
			// A blanket identifier check catches every reference shape: static and
			// dynamic imports, namespace member access, named re-exports, and
			// direct use.
			Identifier(node) {
				if (!PRIMITIVE_CLASSES.has(node.name)) return;
				if (reportedAt.has(node.range[0])) return;
				reportedAt.add(node.range[0]);
				context.report({ node, messageId: 'noPrimitiveReference', data: { name: node.name } });
			},
			// Wildcard re-exports carry no identifier, so catch them by source.
			ExportAllDeclaration(node) {
				const source = String(node.source.value);
				if (REEXPORT_SOURCE.test(source)) {
					context.report({ node, messageId: 'noWildcardReexport', data: { source } });
				}
			},
			// Member references (not just calls) so bound or passed method
			// references cannot escape the boundary either.
			MemberExpression(node) {
				const { property } = node;
				let method: string | null = null;
				if (!node.computed && property.type === TSESTree.AST_NODE_TYPES.Identifier) {
					method = property.name;
				} else if (
					node.computed &&
					property.type === TSESTree.AST_NODE_TYPES.Literal &&
					typeof property.value === 'string'
				) {
					method = property.value;
				}
				if (method === null || !EXPLICIT_KEY_METHODS.has(method)) return;

				// Cheap syntactic prefilter passed — only now consult the type checker.
				const services = ESLintUtils.getParserServices(context);
				const receiverType = services.getTypeAtLocation(node.object);
				if (!typeIsCipher(receiverType)) return;

				context.report({ node: property, messageId: 'noExplicitKeyCall', data: { method } });
			},
		};
	},
});
