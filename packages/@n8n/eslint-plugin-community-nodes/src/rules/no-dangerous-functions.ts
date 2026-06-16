import { TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	getModulePath,
	isDirectRequireCall,
	isRequireMemberCall,
} from '../utils/index.js';

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
	const modulePath = getModulePath(node);
	return modulePath !== null && CHILD_PROCESS_MODULES.has(modulePath);
};

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

		const recordDestructuredModule = (pattern: TSESTree.ObjectPattern) => {
			for (const property of pattern.properties) {
				if (
					property.type !== AST_NODE_TYPES.Property ||
					property.key.type !== AST_NODE_TYPES.Identifier ||
					!DANGEROUS_CHILD_PROCESS_FUNCTIONS.has(property.key.name)
				) {
					continue;
				}

				if (property.value.type === AST_NODE_TYPES.Identifier) {
					dangerousLocalNames.set(property.value.name, property.key.name);
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

			VariableDeclarator(node) {
				if (
					node.init?.type !== AST_NODE_TYPES.CallExpression ||
					!(isDirectRequireCall(node.init) || isRequireMemberCall(node.init)) ||
					!isChildProcessModule(node.init.arguments[0] ?? null)
				) {
					return;
				}

				if (node.id.type === AST_NODE_TYPES.ObjectPattern) {
					recordDestructuredModule(node.id);
				} else if (node.id.type === AST_NODE_TYPES.Identifier) {
					namespaceNames.add(node.id.name);
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

				if (
					callee.type === AST_NODE_TYPES.MemberExpression &&
					!callee.computed &&
					callee.object.type === AST_NODE_TYPES.Identifier &&
					namespaceNames.has(callee.object.name) &&
					callee.property.type === AST_NODE_TYPES.Identifier &&
					DANGEROUS_CHILD_PROCESS_FUNCTIONS.has(callee.property.name)
				) {
					context.report({
						node,
						messageId: 'noChildProcess',
						data: { name: callee.property.name },
					});
				}
			},
		};
	},
});
