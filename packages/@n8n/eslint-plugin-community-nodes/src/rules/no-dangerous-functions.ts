import { TSESTree } from '@typescript-eslint/utils';
import type { TSESLint } from '@typescript-eslint/utils';

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
		const { sourceCode } = context;

		// Bindings are tracked by the variable they declare, not by name, so a
		// binding in one scope cannot be confused with an unrelated binding of
		// the same name in another.

		/** Variables bound to a dangerous function, e.g. `import { exec as run }`. */
		const dangerousVariables = new Map<TSESLint.Scope.Variable, string>();
		/** Variables bound to the module itself, e.g. `import * as cp`. */
		const namespaceVariables = new Set<TSESLint.Scope.Variable>();

		/** The variable an identifier refers to, or null when it is unresolved. */
		const resolveVariable = (identifier: TSESTree.Identifier): TSESLint.Scope.Variable | null => {
			for (
				let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
				scope;
				scope = scope.upper
			) {
				const variable = scope.set.get(identifier.name);
				if (variable) return variable;
			}

			return null;
		};

		/** The variable a declaration introduces for `identifier`. */
		const resolveDeclaredVariable = (
			declaration: TSESTree.Node,
			identifier: TSESTree.Identifier,
		): TSESLint.Scope.Variable | null =>
			sourceCode
				.getDeclaredVariables(declaration)
				.find((variable) => variable.defs.some((def) => def.name === identifier)) ?? null;

		/**
		 * True for the `require` of the CommonJS loader. A `require` declared in
		 * the file — a parameter, a local helper — shadows it and loads nothing.
		 */
		const isModuleLoaderRequire = (node: TSESTree.CallExpression): boolean => {
			if (!isDirectRequireCall(node) || node.callee.type !== AST_NODE_TYPES.Identifier) {
				return false;
			}

			// A global has no definition site; anything with one is a local binding.
			const variable = resolveVariable(node.callee);
			return variable === null || variable.defs.length === 0;
		};

		/** Whether an expression is the `child_process` module. */
		const resolvesToChildProcessModule = (node: TSESTree.Node | null | undefined): boolean => {
			if (!node) return false;

			switch (node.type) {
				case AST_NODE_TYPES.Identifier: {
					const variable = resolveVariable(node);
					return variable !== null && namespaceVariables.has(variable);
				}
				// `require('child_process')`. `require.resolve(...)` is deliberately
				// excluded: it returns a path string, not the module.
				case AST_NODE_TYPES.CallExpression:
					return isModuleLoaderRequire(node) && isChildProcessModule(node.arguments[0] ?? null);
				case AST_NODE_TYPES.AwaitExpression:
					return isChildProcessImport(node.argument) || resolvesToChildProcessModule(node.argument);
				// `mod.default` is the CommonJS module object under interop.
				case AST_NODE_TYPES.MemberExpression:
					return (
						getStaticPropertyName(node) === 'default' && resolvesToChildProcessModule(node.object)
					);
				// Wrappers that do not change the value being accessed:
				// `(0, require('child_process'))`, `require('child_process') as any`,
				// `... satisfies unknown`, `...!`, `<any>...`.
				case AST_NODE_TYPES.SequenceExpression:
					return resolvesToChildProcessModule(node.expressions.at(-1));
				case AST_NODE_TYPES.TSAsExpression:
				case AST_NODE_TYPES.TSSatisfiesExpression:
				case AST_NODE_TYPES.TSNonNullExpression:
				case AST_NODE_TYPES.TSTypeAssertion:
					return resolvesToChildProcessModule(node.expression);
				default:
					return false;
			}
		};

		const recordNamespace = (declaration: TSESTree.Node, identifier: TSESTree.Identifier) => {
			const variable = resolveDeclaredVariable(declaration, identifier);
			if (variable) namespaceVariables.add(variable);
		};

		const recordDangerous = (
			declaration: TSESTree.Node,
			identifier: TSESTree.Identifier,
			functionName: string,
		) => {
			const variable = resolveDeclaredVariable(declaration, identifier);
			if (variable) dangerousVariables.set(variable, functionName);
		};

		const recordDestructuredModule = (
			declaration: TSESTree.Node,
			pattern: TSESTree.ObjectPattern,
		) => {
			for (const property of pattern.properties) {
				// `const { ...cp } = require('child_process')` copies the module.
				if (property.type === AST_NODE_TYPES.RestElement) {
					if (property.argument.type === AST_NODE_TYPES.Identifier) {
						recordNamespace(declaration, property.argument);
					}
					continue;
				}

				if (property.value.type !== AST_NODE_TYPES.Identifier) continue;

				const keyName = getStaticKeyName(property.key, property.computed);
				if (keyName === null) continue;

				if (DANGEROUS_CHILD_PROCESS_FUNCTIONS.has(keyName)) {
					recordDangerous(declaration, property.value, keyName);
				} else if (keyName === 'default') {
					recordNamespace(declaration, property.value);
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
						recordDangerous(node, specifier.local, specifier.imported.name);
					} else if (
						specifier.type === AST_NODE_TYPES.ImportNamespaceSpecifier ||
						specifier.type === AST_NODE_TYPES.ImportDefaultSpecifier
					) {
						recordNamespace(node, specifier.local);
					}
				}
			},

			// `import cp = require('child_process')`, the TypeScript spelling.
			TSImportEqualsDeclaration(node) {
				if (
					node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference &&
					isChildProcessModule(node.moduleReference.expression)
				) {
					recordNamespace(node, node.id);
				}
			},

			VariableDeclarator(node) {
				if (resolvesToChildProcessModule(node.init)) {
					if (node.id.type === AST_NODE_TYPES.ObjectPattern) {
						recordDestructuredModule(node, node.id);
					} else if (node.id.type === AST_NODE_TYPES.Identifier) {
						recordNamespace(node, node.id);
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
					recordDangerous(node, node.id, memberName);
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

					const variable = resolveVariable(callee);
					const originalName = variable && dangerousVariables.get(variable);
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
