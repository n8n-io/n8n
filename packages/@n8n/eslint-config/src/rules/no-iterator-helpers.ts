import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * Methods that return an iterator, not an array. `Object.entries` and friends
 * return arrays, so the static receivers below are excluded.
 */
const ITERATOR_PRODUCERS = new Set(['entries', 'keys', 'values']);

const ARRAY_RETURNING_RECEIVERS = new Set(['Object', 'Reflect']);

/**
 * Iterator helpers that `Array.prototype` also has. A spread is enough to fix
 * these. The value is the number of arguments the iterator form passes to the
 * callback; the array form passes one more (the array itself), so a callback
 * that declares that extra parameter changes behaviour and blocks the fix.
 */
const ARRAY_HELPER_CALLBACK_ARITY = new Map([
	['map', 2],
	['filter', 2],
	['flatMap', 2],
	['forEach', 2],
	['some', 2],
	['every', 2],
	['find', 2],
	['reduce', 3],
]);

/** Iterator helpers with no `Array.prototype` counterpart, so a spread alone still throws. */
const ITERATOR_ONLY_REPLACEMENTS = new Map([
	['take', '.slice(0, n)'],
	['drop', '.slice(n)'],
	['toArray', 'the spread itself'],
]);

const unwrapChain = (node: TSESTree.Expression): TSESTree.Expression =>
	node.type === TSESTree.AST_NODE_TYPES.ChainExpression ? unwrapChain(node.expression) : node;

/**
 * `a?.entries()` short-circuits to `undefined`, but `[...undefined]` throws, so
 * an optional link anywhere in the receiver rules the fix out.
 */
function hasOptionalLink(node: TSESTree.Node): boolean {
	if (
		(node.type === TSESTree.AST_NODE_TYPES.MemberExpression ||
			node.type === TSESTree.AST_NODE_TYPES.CallExpression) &&
		node.optional
	) {
		return true;
	}

	switch (node.type) {
		case TSESTree.AST_NODE_TYPES.MemberExpression:
			return hasOptionalLink(node.object);
		case TSESTree.AST_NODE_TYPES.CallExpression:
			return hasOptionalLink(node.callee);
		case TSESTree.AST_NODE_TYPES.ChainExpression:
			return hasOptionalLink(node.expression);
		default:
			return false;
	}
}

/** A callback that reads the extra array argument, or every argument, sees a different call. */
function readsExtraCallbackArgument(
	args: TSESTree.CallExpressionArgument[],
	iteratorArity: number,
): boolean {
	return args.some((arg) => {
		if (
			arg.type !== TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
			arg.type !== TSESTree.AST_NODE_TYPES.FunctionExpression
		) {
			return false;
		}
		if (arg.params.some((param) => param.type === TSESTree.AST_NODE_TYPES.RestElement)) {
			return true;
		}
		return arg.params.length > iteratorArity;
	});
}

export const NoIteratorHelpersRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow ES2025 iterator helpers called on an iterator. Spread the iterator into an array first.',
		},
		messages: {
			noIteratorHelpers:
				'`{{producer}}()` returns an iterator, and `Iterator.prototype.{{helper}}` is missing in browsers we support. Spread it first: `[...x.{{producer}}()].{{helper}}(...)`.',
			noIteratorOnlyHelper:
				'`{{producer}}()` returns an iterator, and `Iterator.prototype.{{helper}}` is missing in browsers we support. `Array.prototype` has no `{{helper}}`, so spread it and use {{replacement}} instead.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				const callee = unwrapChain(node.callee as TSESTree.Expression);
				if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) return;
				if (callee.computed || callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier) return;

				const helper = callee.property.name;
				const iteratorArity = ARRAY_HELPER_CALLBACK_ARITY.get(helper);
				const replacement = ITERATOR_ONLY_REPLACEMENTS.get(helper);
				if (iteratorArity === undefined && replacement === undefined) return;

				const receiver = unwrapChain(callee.object as TSESTree.Expression);
				if (receiver.type !== TSESTree.AST_NODE_TYPES.CallExpression) return;

				const producerCallee = unwrapChain(receiver.callee as TSESTree.Expression);
				if (producerCallee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) return;
				if (
					producerCallee.computed ||
					producerCallee.property.type !== TSESTree.AST_NODE_TYPES.Identifier
				) {
					return;
				}

				const producer = producerCallee.property.name;
				if (!ITERATOR_PRODUCERS.has(producer)) return;

				// `Object.entries(x).map(...)` maps over an array and is allowed.
				const producerReceiver = producerCallee.object;
				if (
					producerReceiver.type === TSESTree.AST_NODE_TYPES.Identifier &&
					ARRAY_RETURNING_RECEIVERS.has(producerReceiver.name)
				) {
					return;
				}

				if (replacement !== undefined) {
					context.report({
						node: receiver,
						messageId: 'noIteratorOnlyHelper',
						data: { producer, helper, replacement },
					});
					return;
				}

				// A spread is only equivalent when the chain cannot short-circuit and no
				// callback reads the array argument that `Array.prototype` adds.
				const fixable =
					!hasOptionalLink(receiver) &&
					!readsExtraCallbackArgument(node.arguments, iteratorArity as number);

				context.report({
					node: receiver,
					messageId: 'noIteratorHelpers',
					data: { producer, helper },
					fix: fixable
						? (fixer) => [
								fixer.insertTextBefore(receiver, '[...'),
								fixer.insertTextAfter(receiver, ']'),
							]
						: undefined,
				});
			},
		};
	},
});
