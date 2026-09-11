import { ASTUtils, ESLintUtils, TSESTree } from '@typescript-eslint/utils';

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

const isGetNodeParameterCall = (node: TSESTree.CallExpression) =>
	node.callee.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
	node.callee.property.type === TSESTree.AST_NODE_TYPES.Identifier &&
	node.callee.property.name === 'getNodeParameter';

/** `itemIndex ?? 0` / `itemIndex || 0` in the index position, not `itemIndex && …`. */
const isItemIndexFallback = (argument: TSESTree.Node) =>
	argument.type === TSESTree.AST_NODE_TYPES.LogicalExpression &&
	(argument.operator === '??' || argument.operator === '||') &&
	argument.left.type === TSESTree.AST_NODE_TYPES.Identifier &&
	argument.left.name === ITEM_INDEX;

/**
 * Whether a call site can leave this parameter out, following the binding up
 * through any destructuring: `itemIndex = 0`, `itemIndex?: number` and
 * `{ itemIndex = 0 }` are all omissible, a plain `itemIndex: number` is not.
 */
const isOmissible = (name: TSESTree.Identifier) => {
	if (name.optional === true) return true;

	let node: TSESTree.Node | undefined = name;
	while (node?.parent) {
		if (node.parent.type === TSESTree.AST_NODE_TYPES.AssignmentPattern) return true;
		if (
			node.parent.type === TSESTree.AST_NODE_TYPES.Property ||
			node.parent.type === TSESTree.AST_NODE_TYPES.ObjectPattern ||
			node.parent.type === TSESTree.AST_NODE_TYPES.ArrayPattern
		) {
			node = node.parent;
			continue;
		}
		return false;
	}
	return false;
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
			noItemIndexFallback:
				'Pass the item index itself: a fallback here means the index can be missing, and then every item resolves at item 0. Make `itemIndex` required instead, and drop the fallback.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const reported = new Set<TSESTree.Node>();

		return {
			CallExpression(node) {
				if (!isGetNodeParameterCall(node)) return;

				const argument = node.arguments[1];
				if (!argument) return;

				// A fallback covers for an index that may not have been passed, whatever
				// the binding looks like. That also catches the shapes scope analysis
				// cannot judge on its own, such as an optional `itemIndex` property of a
				// named parameter type.
				if (isItemIndexFallback(argument)) {
					context.report({ messageId: 'noItemIndexFallback', node: argument });
					return;
				}

				if (argument.type !== TSESTree.AST_NODE_TYPES.Identifier || argument.name !== ITEM_INDEX) {
					return;
				}

				// Resolve the identifier through scope, so a local `for (let itemIndex …)`
				// is recognised as its own binding instead of the outer parameter it
				// shadows.
				const variable = ASTUtils.findVariable(context.sourceCode.getScope(node), ITEM_INDEX);
				const definition = variable?.defs.at(0);
				if (definition?.type !== 'Parameter') return;

				const { name } = definition;
				if (name.type !== TSESTree.AST_NODE_TYPES.Identifier) return;
				if (!isOmissible(name) || reported.has(name)) return;

				reported.add(name);
				context.report({ messageId: 'requireItemIndex', node: name.parent ?? name });
			},
		};
	},
});
