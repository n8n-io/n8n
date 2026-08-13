import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * `execute` runs once for the whole input, so a helper that reads node parameters
 * needs the current item's index. When its `itemIndex` parameter carries a default
 * (or is optional), a call site that forgets to pass one still compiles and every
 * item silently resolves at item 0. That shipped in four Microsoft nodes and was
 * fixed four times (#34109, #34110, #34111, #34112).
 *
 * Only a defaulted `itemIndex` that is actually handed to `getNodeParameter` is
 * reported: elsewhere the index is carried for error attribution, where a default
 * changes nothing. Load-options and list-search call sites pass a literal `0`,
 * since there `getNodeParameter`'s second argument is the fallback value.
 */
const ITEM_INDEX = 'itemIndex';

type FunctionNode =
	| TSESTree.FunctionDeclaration
	| TSESTree.FunctionExpression
	| TSESTree.ArrowFunctionExpression;

const isFunctionNode = (node: TSESTree.Node): node is FunctionNode =>
	node.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration ||
	node.type === TSESTree.AST_NODE_TYPES.FunctionExpression ||
	node.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression;

/** The `itemIndex` parameter of `fn`, if it is defaulted or optional. */
const weakItemIndexParam = (fn: FunctionNode) =>
	fn.params.find(
		(param) =>
			(param.type === TSESTree.AST_NODE_TYPES.AssignmentPattern &&
				param.left.type === TSESTree.AST_NODE_TYPES.Identifier &&
				param.left.name === ITEM_INDEX) ||
			(param.type === TSESTree.AST_NODE_TYPES.Identifier &&
				param.name === ITEM_INDEX &&
				param.optional === true),
	);

const isGetNodeParameterCall = (node: TSESTree.CallExpression) =>
	node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
	node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
	node.callee.property.name === 'getNodeParameter';

/** `getNodeParameter(name, itemIndex, …)`, including `itemIndex ?? 0` forms. */
const readsWithItemIndex = (node: TSESTree.CallExpression) => {
	const arg = node.arguments[1];
	if (!arg) return false;
	if (arg.type === TSESTree.AST_NODE_TYPES.Identifier) return arg.name === ITEM_INDEX;
	return (
		arg.type === TSESTree.AST_NODE_TYPES.LogicalExpression &&
		arg.left.type === TSESTree.AST_NODE_TYPES.Identifier &&
		arg.left.name === ITEM_INDEX
	);
};

export const NoDefaultedItemIndexRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'A function that reads node parameters must take a required `itemIndex`. A default or optional one lets a call site omit it, which resolves every item at item 0.',
		},
		messages: {
			requireItemIndex:
				'Make `itemIndex` required: it is passed to getNodeParameter, so a default resolves every item at item 0. Put it before any defaulted parameters, and pass a literal 0 from load-options call sites.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const reported = new Set<TSESTree.Node>();

		return {
			CallExpression(node) {
				if (!isGetNodeParameterCall(node) || !readsWithItemIndex(node)) return;

				for (const ancestor of context.sourceCode.getAncestors(node).reverse()) {
					if (!isFunctionNode(ancestor)) continue;

					const param = weakItemIndexParam(ancestor);
					// A nested function without its own `itemIndex` closes over an outer
					// one, so keep walking up to the declaration that owns it.
					if (!param) {
						if (ancestor.params.some((p) => context.sourceCode.getText(p).includes(ITEM_INDEX))) {
							return;
						}
						continue;
					}

					if (reported.has(param)) return;
					reported.add(param);
					context.report({ messageId: 'requireItemIndex', node: param });
					return;
				}
			},
		};
	},
});
