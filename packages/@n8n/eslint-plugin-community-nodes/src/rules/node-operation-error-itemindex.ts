/**
 * Flags `new NodeOperationError(...)` or `new NodeApiError(...)` inside item
 * loops in `execute()` methods that omit `{ itemIndex }` from the options
 * argument. Without it, n8n cannot associate the error with the specific item
 * that caused it, breaking per-item error reporting and `continueOnFail`.
 *
 * "Item loop" means a `for` or `for...of` that iterates over the result of
 * `this.getInputData()` (or a variable initialised from it). Errors outside
 * such loops — e.g. in webhook handlers or trigger setup — are not flagged.
 */

import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule, findObjectProperty, isFileType, isNodeTypeClass } from '../utils/index.js';

const ITEM_ERROR_CLASSES = new Set(['NodeOperationError', 'NodeApiError']);

/** Returns true when `node` is a bare `this.getInputData(...)` call. */
function isGetInputDataCall(node: TSESTree.CallExpression): boolean {
	return (
		node.callee.type === AST_NODE_TYPES.MemberExpression &&
		node.callee.object.type === AST_NODE_TYPES.ThisExpression &&
		node.callee.property.type === AST_NODE_TYPES.Identifier &&
		node.callee.property.name === 'getInputData'
	);
}

/** Returns true when `node` is `<varName>.length` for any name in `varNames`. */
function isLengthAccessOnVariable(node: TSESTree.Node, varNames: Set<string>): boolean {
	return (
		node.type === AST_NODE_TYPES.MemberExpression &&
		!node.computed &&
		node.property.type === AST_NODE_TYPES.Identifier &&
		node.property.name === 'length' &&
		node.object.type === AST_NODE_TYPES.Identifier &&
		varNames.has(node.object.name)
	);
}

/**
 * Returns true when the `for` test condition references `<itemVar>.length`,
 * indicating that the loop iterates over an items array.
 */
function isItemForLoop(node: TSESTree.ForStatement, itemVarNames: Set<string>): boolean {
	if (!node.test || node.test.type !== AST_NODE_TYPES.BinaryExpression) return false;

	const { left, right } = node.test;
	return (
		isLengthAccessOnVariable(left, itemVarNames) || isLengthAccessOnVariable(right, itemVarNames)
	);
}

/**
 * Returns true when the `for...of` iterable is an items variable or a direct
 * `this.getInputData()` call.
 */
function isItemForOfLoop(node: TSESTree.ForOfStatement, itemVarNames: Set<string>): boolean {
	const { right } = node;

	if (right.type === AST_NODE_TYPES.Identifier && itemVarNames.has(right.name)) {
		return true;
	}

	return right.type === AST_NODE_TYPES.CallExpression && isGetInputDataCall(right);
}

/**
 * Returns true when the `NodeOperationError` / `NodeApiError` constructor call
 * already has an `{ itemIndex }` property in its options argument, or when the
 * options argument cannot be statically inspected (variable / spread) — in
 * which case we give the benefit of the doubt.
 */
function hasItemIndexOption(node: TSESTree.NewExpression): boolean {
	const { arguments: args } = node;

	if (args.length < 3) return false;

	const optionsArg = args[2];

	// Non-object-literal (bare variable reference) — can't statically check, assume OK.
	if (!optionsArg || optionsArg.type !== AST_NODE_TYPES.ObjectExpression) {
		return true;
	}

	// itemIndex must be an explicit own property of the options object.
	// Spread elements (e.g. { ...opts }) are not sufficient — they may not
	// include itemIndex and would silently bypass this requirement.
	return findObjectProperty(optionsArg, 'itemIndex') !== null;
}

export const NodeOperationErrorItemIndexRule = createRule({
	name: 'node-operation-error-itemindex',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require { itemIndex } in NodeOperationError / NodeApiError options inside item loops',
		},
		messages: {
			missingItemIndex:
				'`new {{ errorClass }}(...)` inside an item loop must include `{ itemIndex }` as the ' +
				'third argument so n8n can associate the error with the failing item.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		let inNodeTypeClass = false;
		let inExecuteMethod = false;

		/** Names of variables initialised from `this.getInputData()` in the current execute() scope. */
		const itemVariableNames = new Set<string>();

		/** AST nodes for loops that are confirmed item loops. */
		const itemLoopNodes = new Set<TSESTree.ForStatement | TSESTree.ForOfStatement>();

		/** Number of currently open item loops (supports nested loops). */
		let itemLoopDepth = 0;

		function resetExecuteState() {
			inExecuteMethod = false;
			itemVariableNames.clear();
			itemLoopNodes.clear();
			itemLoopDepth = 0;
		}

		return {
			ClassDeclaration(node) {
				if (isNodeTypeClass(node)) {
					inNodeTypeClass = true;
				}
			},

			'ClassDeclaration:exit'() {
				inNodeTypeClass = false;
				resetExecuteState();
			},

			MethodDefinition(node: TSESTree.MethodDefinition) {
				if (
					inNodeTypeClass &&
					node.key.type === AST_NODE_TYPES.Identifier &&
					node.key.name === 'execute'
				) {
					inExecuteMethod = true;
				}
			},

			'MethodDefinition:exit'(node: TSESTree.MethodDefinition) {
				if (
					inExecuteMethod &&
					node.key.type === AST_NODE_TYPES.Identifier &&
					node.key.name === 'execute'
				) {
					resetExecuteState();
				}
			},

			VariableDeclarator(node: TSESTree.VariableDeclarator) {
				if (!inExecuteMethod) return;
				if (!node.init) return;
				if (node.id.type !== AST_NODE_TYPES.Identifier) return;

				if (node.init.type === AST_NODE_TYPES.CallExpression && isGetInputDataCall(node.init)) {
					itemVariableNames.add(node.id.name);
				}
			},

			ForStatement(node: TSESTree.ForStatement) {
				if (!inExecuteMethod) return;
				if (isItemForLoop(node, itemVariableNames)) {
					itemLoopNodes.add(node);
					itemLoopDepth++;
				}
			},

			'ForStatement:exit'(node: TSESTree.ForStatement) {
				if (itemLoopNodes.has(node)) {
					itemLoopNodes.delete(node);
					itemLoopDepth--;
				}
			},

			ForOfStatement(node: TSESTree.ForOfStatement) {
				if (!inExecuteMethod) return;
				if (isItemForOfLoop(node, itemVariableNames)) {
					itemLoopNodes.add(node);
					itemLoopDepth++;
				}
			},

			'ForOfStatement:exit'(node: TSESTree.ForOfStatement) {
				if (itemLoopNodes.has(node)) {
					itemLoopNodes.delete(node);
					itemLoopDepth--;
				}
			},

			NewExpression(node: TSESTree.NewExpression) {
				if (itemLoopDepth === 0) return;

				if (
					node.callee.type !== AST_NODE_TYPES.Identifier ||
					!ITEM_ERROR_CLASSES.has(node.callee.name)
				) {
					return;
				}

				if (!hasItemIndexOption(node)) {
					context.report({
						node,
						messageId: 'missingItemIndex',
						data: { errorClass: node.callee.name },
					});
				}
			},
		};
	},
});
