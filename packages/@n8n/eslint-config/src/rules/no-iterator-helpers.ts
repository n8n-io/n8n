import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * Methods that return an iterator, not an array. `Object.entries` and friends
 * return arrays, so the static receivers below are excluded.
 */
const ITERATOR_PRODUCERS = new Set(['entries', 'keys', 'values']);

const ARRAY_RETURNING_RECEIVERS = new Set(['Object', 'Reflect']);

/**
 * ES2025 Iterator.prototype helpers. The rule reports only: the correct rewrite
 * depends on the call, because a spread gives an array `map` and `filter` but no
 * `take`, `drop` or `toArray`, and it turns an optional producer chain from
 * `undefined` into a throw.
 */
const ITERATOR_HELPERS = new Set([
	'map',
	'filter',
	'flatMap',
	'reduce',
	'forEach',
	'some',
	'every',
	'find',
	'take',
	'drop',
	'toArray',
]);

const unwrapChain = (node: TSESTree.Expression): TSESTree.Expression =>
	node.type === TSESTree.AST_NODE_TYPES.ChainExpression ? unwrapChain(node.expression) : node;

const memberName = (node: TSESTree.Expression): string | undefined => {
	const expression = unwrapChain(node);
	if (expression.type !== TSESTree.AST_NODE_TYPES.MemberExpression) return undefined;
	if (expression.computed) return undefined;
	if (expression.property.type !== TSESTree.AST_NODE_TYPES.Identifier) return undefined;
	return expression.property.name;
};

export const NoIteratorHelpersRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow ES2025 iterator helpers called on an iterator. Spread the iterator into an array first.',
		},
		messages: {
			noIteratorHelpers:
				'`{{producer}}()` returns an iterator, and `Iterator.prototype.{{helper}}` is missing in browsers we support. Spread it into an array first, for example `[...x.{{producer}}()]`, then use an Array method.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				const helper = memberName(node.callee as TSESTree.Expression);
				if (helper === undefined || !ITERATOR_HELPERS.has(helper)) return;

				const callee = unwrapChain(node.callee as TSESTree.Expression);
				if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) return;

				const receiver = unwrapChain(callee.object as TSESTree.Expression);
				if (receiver.type !== TSESTree.AST_NODE_TYPES.CallExpression) return;

				const producer = memberName(receiver.callee as TSESTree.Expression);
				if (producer === undefined || !ITERATOR_PRODUCERS.has(producer)) return;

				// `Object.entries(x).map(...)` maps over an array and is allowed.
				const producerCallee = unwrapChain(receiver.callee as TSESTree.Expression);
				if (producerCallee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) return;
				const producerReceiver = producerCallee.object;
				if (
					producerReceiver.type === TSESTree.AST_NODE_TYPES.Identifier &&
					ARRAY_RETURNING_RECEIVERS.has(producerReceiver.name)
				) {
					return;
				}

				context.report({
					node: receiver,
					messageId: 'noIteratorHelpers',
					data: { producer, helper },
				});
			},
		};
	},
});
