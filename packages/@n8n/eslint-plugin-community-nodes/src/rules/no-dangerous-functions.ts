import { TSESTree } from '@typescript-eslint/utils';

import { createRule, getStaticStringValue, isDirectRequireCall } from '../utils/index.js';

const { AST_NODE_TYPES } = TSESTree;

const CHILD_PROCESS_MODULES = new Set(['child_process', 'node:child_process']);

/**
 * `child_process` functions that spawn OS processes and are therefore
 * vulnerable to command injection when fed untrusted input.
 */
const DANGEROUS_CHILD_PROCESS_FUNCTIONS = new Set([
	'exec',
	'execSync',
	'execFile',
	'execFileSync',
	'spawn',
	'spawnSync',
	'fork',
]);

const isChildProcessModule = (node: TSESTree.Node | null): boolean => {
	const modulePath = getStaticStringValue(node);
	return modulePath !== null && CHILD_PROCESS_MODULES.has(modulePath);
};

/** `import('child_process')`, which yields the module once awaited. */
const isChildProcessImport = (node: TSESTree.Node): boolean =>
	node.type === AST_NODE_TYPES.ImportExpression && isChildProcessModule(node.source);

/**
 * Returns the name a key refers to when it is statically knowable, so that
 * `exec`, `'exec'`, `['exec']` and `` [`exec`] `` are all treated alike. Keys
 * that can only be resolved by running the code (`[name]`) return null.
 */
const getStaticKeyName = (key: TSESTree.Node, computed: boolean): string | null => {
	if (!computed && key.type === AST_NODE_TYPES.Identifier) {
		return key.name;
	}

	return getStaticStringValue(key);
};

const getStaticPropertyName = (node: TSESTree.MemberExpression): string | null =>
	getStaticKeyName(node.property, node.computed);

export const NoDangerousFunctionsRule = createRule({
	name: 'no-dangerous-functions',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow `eval`, the `Function` constructor, and `child_process` process-spawning functions (`exec`, `spawn`, etc.) in community nodes.',
		},
		messages: {
			noEval:
				'Use of `eval` is not allowed. It executes arbitrary code and is a common source of remote code execution vulnerabilities.',
			noFunctionConstructor:
				'Use of the `Function` constructor is not allowed. Like `eval`, it executes arbitrary code from strings.',
			noChildProcess:
				'Use of `{{ name }}` from `child_process` is not allowed. Spawning OS processes is not permitted in community nodes and can lead to command injection.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		// Local names bound to dangerous named imports, e.g. `import { exec as run }` -> `run`.
		const dangerousLocalNames = new Map<string, string>();
		// Local names bound to the whole module, e.g. `import * as cp` or `const cp = require(...)`.
		const namespaceNames = new Set<string>();

		/**
		 * Resolves whether an expression is the `child_process` module.
		 *
		 * `followBindings` decides whether a bare identifier may be matched
		 * against the recorded names. Reporting a call site does follow them —
		 * that is the point of recording. Deciding whether a *declaration*
		 * introduces a new name does not, because names are tracked in a flat,
		 * file-wide set: minting `alias` from `const alias = cp` would make
		 * every unrelated `alias` in the file look like `child_process`.
		 */
		const resolveModule = (
			node: TSESTree.Node | null | undefined,
			followBindings: boolean,
		): boolean => {
			if (!node) return false;

			switch (node.type) {
				case AST_NODE_TYPES.Identifier:
					return followBindings && namespaceNames.has(node.name);
				// `require('child_process')`. `require.resolve(...)` is deliberately
				// excluded: it returns a path string, not the module.
				case AST_NODE_TYPES.CallExpression:
					return isDirectRequireCall(node) && isChildProcessModule(node.arguments[0] ?? null);
				case AST_NODE_TYPES.AwaitExpression:
					return (
						isChildProcessImport(node.argument) || resolveModule(node.argument, followBindings)
					);
				// `mod.default` is the CommonJS module object under interop.
				case AST_NODE_TYPES.MemberExpression:
					return (
						getStaticPropertyName(node) === 'default' && resolveModule(node.object, followBindings)
					);
				// Wrappers that do not change the value being accessed:
				// `(0, require('child_process'))`, `require('child_process') as any`,
				// `... satisfies unknown`, `...!`, `<any>...`.
				case AST_NODE_TYPES.SequenceExpression:
					return resolveModule(node.expressions.at(-1), followBindings);
				case AST_NODE_TYPES.TSAsExpression:
				case AST_NODE_TYPES.TSSatisfiesExpression:
				case AST_NODE_TYPES.TSNonNullExpression:
				case AST_NODE_TYPES.TSTypeAssertion:
					return resolveModule(node.expression, followBindings);
				default:
					return false;
			}
		};

		/** The module, reached through a recorded binding or written out in place. */
		const resolvesToChildProcessModule = (node: TSESTree.Node | null | undefined): boolean =>
			resolveModule(node, true);

		/** The module written out in place, without consulting recorded names. */
		const isChildProcessModuleExpression = (node: TSESTree.Node | null | undefined): boolean =>
			resolveModule(node, false);

		const recordDestructuredModule = (pattern: TSESTree.ObjectPattern) => {
			for (const property of pattern.properties) {
				// `const { ...cp } = require('child_process')` copies the module.
				if (property.type === AST_NODE_TYPES.RestElement) {
					if (property.argument.type === AST_NODE_TYPES.Identifier) {
						namespaceNames.add(property.argument.name);
					}
					continue;
				}

				if (property.value.type !== AST_NODE_TYPES.Identifier) continue;

				const keyName = getStaticKeyName(property.key, property.computed);
				if (keyName === null) continue;

				if (DANGEROUS_CHILD_PROCESS_FUNCTIONS.has(keyName)) {
					dangerousLocalNames.set(property.value.name, keyName);
				} else if (keyName === 'default') {
					namespaceNames.add(property.value.name);
				}
			}
		};

		return {
			ImportDeclaration(node) {
				if (!CHILD_PROCESS_MODULES.has(node.source.value)) return;

				for (const specifier of node.specifiers) {
					if (
						specifier.type === AST_NODE_TYPES.ImportSpecifier &&
						specifier.imported.type === AST_NODE_TYPES.Identifier &&
						DANGEROUS_CHILD_PROCESS_FUNCTIONS.has(specifier.imported.name)
					) {
						dangerousLocalNames.set(specifier.local.name, specifier.imported.name);
					} else if (
						specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier ||
						specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier
					) {
						namespaceNames.add(specifier.local.name);
					}
				}
			},

			// `import cp = require('child_process')`, the TypeScript spelling.
			TSImportEqualsDeclaration(node) {
				if (
					node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference &&
					isChildProcessModule(node.moduleReference.expression)
				) {
					namespaceNames.add(node.id.name);
				}
			},

			VariableDeclarator(node) {
				if (isChildProcessModuleExpression(node.init)) {
					if (node.id.type === AST_NODE_TYPES.ObjectPattern) {
						recordDestructuredModule(node.id);
					} else if (node.id.type === AST_NODE_TYPES.Identifier) {
						namespaceNames.add(node.id.name);
					}
					return;
				}

				// `const run = cp.exec` — the member equivalent of destructuring a
				// spawner out of the module, which is already tracked above.
				if (
					node.id.type !== AST_NODE_TYPES.Identifier ||
					node.init?.type !== AST_NODE_TYPES.MemberExpression
				) {
					return;
				}

				const memberName = getStaticPropertyName(node.init);
				if (
					memberName !== null &&
					DANGEROUS_CHILD_PROCESS_FUNCTIONS.has(memberName) &&
					resolvesToChildProcessModule(node.init.object)
				) {
					dangerousLocalNames.set(node.id.name, memberName);
				}
			},

			NewExpression(node) {
				if (node.callee.type === AST_NODE_TYPES.Identifier && node.callee.name === 'Function') {
					context.report({ node, messageId: 'noFunctionConstructor' });
				}
			},

			CallExpression(node) {
				const { callee } = node;

				if (callee.type === AST_NODE_TYPES.Identifier) {
					if (callee.name === 'eval') {
						context.report({ node, messageId: 'noEval' });
						return;
					}

					if (callee.name === 'Function') {
						context.report({ node, messageId: 'noFunctionConstructor' });
						return;
					}

					const originalName = dangerousLocalNames.get(callee.name);
					if (originalName) {
						context.report({ node, messageId: 'noChildProcess', data: { name: originalName } });
					}

					return;
				}

				if (callee.type !== AST_NODE_TYPES.MemberExpression) return;

				const propertyName = getStaticPropertyName(callee);
				if (propertyName === null || !DANGEROUS_CHILD_PROCESS_FUNCTIONS.has(propertyName)) {
					return;
				}

				if (resolvesToChildProcessModule(callee.object)) {
					context.report({
						node,
						messageId: 'noChildProcess',
						data: { name: propertyName },
					});
				}
			},
		};
	},
});
