import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { isNodeTypeClass } from '../utils/index.js';
import { createRule } from '../utils/rule-creator.js';

/** Keys that are not child AST nodes (back-references, metadata). */
const NON_CHILD_KEYS = new Set(['parent', 'loc', 'range', 'start', 'end', 'tokens', 'comments']);

/**
 * Recursively checks whether any descendant of the given AST node is a
 * `this.continueOnFail()` call expression.
 */
function containsContinueOnFailCall(node: TSESTree.Node): boolean {
	if (
		node.type === AST_NODE_TYPES.CallExpression &&
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.ThisExpression &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		node.callee.property.name === 'continueOnFail'
	) {
		return true;
	}

	for (const key of Object.keys(node)) {
		if (NON_CHILD_KEYS.has(key)) continue;

		const value = (node as unknown as Record<string, unknown>)[key];

		if (Array.isArray(value)) {
			for (const child of value) {
				if (child && typeof child === 'object' && 'type' in child) {
					if (containsContinueOnFailCall(child as TSESTree.Node)) {
						return true;
					}
				}
			}
		} else if (value && typeof value === 'object' && 'type' in value) {
			if (containsContinueOnFailCall(value as TSESTree.Node)) {
				return true;
			}
		}
	}

	return false;
}

export const RequireContinueOnFailRule = createRule({
	name: 'require-continue-on-fail',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require continueOnFail() handling in execute() methods of node classes',
		},
		messages: {
			missingContinueOnFail:
				'execute() method must handle this.continueOnFail() for proper error handling. ' +
				'Wrap item processing in a try/catch and check this.continueOnFail() in the catch block.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				for (const member of node.body.body) {
					if (
						member.type !== AST_NODE_TYPES.MethodDefinition ||
						member.key.type !== AST_NODE_TYPES.Identifier ||
						member.key.name !== 'execute'
					) {
						continue;
					}

					if (member.value.body && !containsContinueOnFailCall(member.value.body)) {
						context.report({
							node: member.key,
							messageId: 'missingContinueOnFail',
						});
					}
				}
			},
		};
	},
});
