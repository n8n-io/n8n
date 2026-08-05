import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	isNodeTypeClass,
	WEBHOOK_LIFECYCLE_METHODS,
} from '../utils/index.js';

const LIFECYCLE_METHODS: readonly string[] = WEBHOOK_LIFECYCLE_METHODS;

/** Returns the static name of a non-computed object property key, or null. */
function getPropertyName(property: TSESTree.Property): string | null {
	if (property.computed) return null;
	if (property.key.type === AST_NODE_TYPES.Identifier) return property.key.name;
	if (property.key.type === AST_NODE_TYPES.Literal) return String(property.key.value);
	return null;
}

function isFunctionNode(node: TSESTree.Node): boolean {
	return (
		node.type === AST_NODE_TYPES.FunctionDeclaration ||
		node.type === AST_NODE_TYPES.FunctionExpression ||
		node.type === AST_NODE_TYPES.ArrowFunctionExpression
	);
}

/** Walks up to the function that lexically encloses `node`, or null at module scope. */
function getEnclosingFunction(node: TSESTree.Node): TSESTree.Node | null {
	let current = node.parent;
	while (current) {
		if (isFunctionNode(current)) return current;
		current = current.parent;
	}
	return null;
}

/** A bare `return;` or `return true/false;` with no other work in the block. */
function isSilentReturn(statement: TSESTree.Statement): boolean {
	if (statement.type !== AST_NODE_TYPES.ReturnStatement) return false;
	const argument = statement.argument;
	if (argument === null) return true;
	return argument.type === AST_NODE_TYPES.Literal && typeof argument.value === 'boolean';
}

export const NoSilentErrorSwallowingRule = createRule({
	name: 'no-silent-error-swallowing',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow webhook lifecycle methods (checkExists, create, delete) from silently swallowing errors in catch blocks',
		},
		messages: {
			emptyCatch:
				'Empty catch block in webhook lifecycle method `{{method}}` silently swallows the error. Log the error or rethrow it so failures surface instead of being hidden.',
			silentReturn:
				'Catch block in webhook lifecycle method `{{method}}` swallows the error and only returns without logging. Log the error (or rethrow) so failures surface instead of being hidden.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		// Maps each lifecycle method's function node to its method name. Populated
		// when the enclosing class is visited (before its `catch` clauses), so a
		// `catch` is only flagged when its *nearest* enclosing function is a
		// lifecycle method — catches inside nested callbacks are left alone.
		const lifecycleMethodByFn = new WeakMap<TSESTree.Node, string>();

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const webhookMethodsProperty = findClassProperty(node, 'webhookMethods');
				if (webhookMethodsProperty?.value?.type !== AST_NODE_TYPES.ObjectExpression) return;

				for (const groupProperty of webhookMethodsProperty.value.properties) {
					if (groupProperty.type !== AST_NODE_TYPES.Property) continue;
					if (groupProperty.value.type !== AST_NODE_TYPES.ObjectExpression) continue;

					for (const methodProperty of groupProperty.value.properties) {
						if (methodProperty.type !== AST_NODE_TYPES.Property) continue;

						const methodName = getPropertyName(methodProperty);
						if (methodName === null || !LIFECYCLE_METHODS.includes(methodName)) continue;

						const fn = methodProperty.value;
						if (
							fn.type === AST_NODE_TYPES.FunctionExpression ||
							fn.type === AST_NODE_TYPES.ArrowFunctionExpression
						) {
							lifecycleMethodByFn.set(fn, methodName);
						}
					}
				}
			},

			CatchClause(node) {
				const enclosingFn = getEnclosingFunction(node);
				if (enclosingFn === null) return;

				const methodName = lifecycleMethodByFn.get(enclosingFn);
				if (methodName === undefined) return;

				const statements = node.body.body;

				if (statements.length === 0) {
					context.report({
						node: node.body,
						messageId: 'emptyCatch',
						data: { method: methodName },
					});
					return;
				}

				const onlyStatement = statements.length === 1 ? statements[0] : undefined;
				if (onlyStatement && isSilentReturn(onlyStatement)) {
					context.report({
						node: onlyStatement,
						messageId: 'silentReturn',
						data: { method: methodName },
					});
				}
			},
		};
	},
});
