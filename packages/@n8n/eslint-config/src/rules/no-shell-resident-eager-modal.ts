import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import path from 'node:path';

const EAGER_MODALS = 'eagerModals';
const FEATURE_ALIAS = '@/features/';
const FEATURE_DIRECTORY = /(?:^|\/)src\/features\//;

const EXAMPLE = 'To see an example, open src/features/core/auth/modals.ts.';

/** `X as ModalDefinition[]` and `X satisfies ModalDefinition[]` wrap the initializer. */
const unwrapAssertion = (node: TSESTree.Expression): TSESTree.Expression =>
	node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression'
		? unwrapAssertion(node.expression)
		: node;

/** `...AUTH_MODALS` → `AUTH_MODALS`; `...authModals.eager` → `authModals`. */
const rootIdentifier = (node: TSESTree.Node): string | null => {
	if (node.type === 'Identifier') return node.name;
	if (node.type === 'MemberExpression') return rootIdentifier(node.object);
	return null;
};

const isFeatureOrigin = (source: string, filename: string) => {
	if (source.startsWith(FEATURE_ALIAS)) return true;
	if (!source.startsWith('.')) return false;

	const fromDirectory = path.posix.dirname(filename.split(path.win32.sep).join('/'));

	return FEATURE_DIRECTORY.test(path.posix.join(fromDirectory, source));
};

export const NoShellResidentEagerModalRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce that every `eagerModals` entry is a modal fragment imported from `src/features/**`.',
		},
		messages: {
			definedInShell:
				'Do not define an eager modal in the shell. `eagerModals` accepts only a spread of a `ModalDefinition[]` fragment that is imported from `src/features/**`. A definition that lives in the shell gives the shell the modal key back, which is what the extraction gives up. Move the definition to the modals.ts fragment of the feature that owns it, then spread that fragment here. ' +
				EXAMPLE,
			nonFeatureOrigin:
				'Do not spread "{{ imported }}" into `eagerModals`. Its origin "{{ source }}" is not under `src/features/**`, so the shell owns the modal key again. Move the fragment to the feature that owns the modal, then import it from `@/features/...`. ' +
				EXAMPLE,
			notAnArray:
				'Declare `eagerModals` as an array literal of spread fragments, for example `[...AUTH_MODALS]`. This gate reads each entry of that literal. Any other expression hides the origin of the entries from the gate.',
			missingDeclaration:
				'This file must declare `eagerModals`. The gate that keeps a shell-resident modal definition out of the eager phase reads that name. A rename turns the gate off without any error. Keep the name, or update `n8n-local-rules/no-shell-resident-eager-modal` in the same change.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const importSources = new Map<string, string>();
		let declaration: TSESTree.VariableDeclarator | undefined;

		return {
			// Collected up front: an `import` may follow the declaration in source order.
			Program(node) {
				for (const statement of node.body) {
					if (statement.type !== 'ImportDeclaration') continue;

					for (const specifier of statement.specifiers) {
						importSources.set(specifier.local.name, statement.source.value);
					}
				}
			},

			VariableDeclarator(node) {
				if (node.id.type !== 'Identifier' || node.id.name !== EAGER_MODALS) return;

				declaration = node;

				const initializer = node.init ? unwrapAssertion(node.init) : null;

				if (initializer?.type !== 'ArrayExpression') {
					context.report({ node: node.init ?? node, messageId: 'notAnArray' });
					return;
				}

				for (const element of initializer.elements) {
					if (element === null) continue;

					if (element.type !== 'SpreadElement') {
						context.report({ node: element, messageId: 'definedInShell' });
						continue;
					}

					const local = rootIdentifier(element.argument);
					const source = local === null ? undefined : importSources.get(local);

					if (local === null || source === undefined) {
						context.report({ node: element, messageId: 'definedInShell' });
						continue;
					}

					if (!isFeatureOrigin(source, context.filename)) {
						context.report({
							node: element,
							messageId: 'nonFeatureOrigin',
							data: { imported: local, source },
						});
					}
				}
			},

			'Program:exit'() {
				if (declaration === undefined) {
					context.report({ loc: { line: 1, column: 0 }, messageId: 'missingDeclaration' });
				}
			},
		};
	},
});
