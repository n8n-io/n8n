import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * Methods that return an iterator, not an array. `Object.entries` and friends
 * return arrays, so the static receivers below are excluded.
 */
const ITERATOR_PRODUCERS = new Set(['entries', 'keys', 'values']);

const ARRAY_RETURNING_RECEIVERS = new Set(['Object', 'Reflect']);

/** ES2025 Iterator.prototype helpers. */
const ITERATOR_HELPERS = new Set([
	'map',
	'filter',
	'take',
	'drop',
	'flatMap',
	'reduce',
	'toArray',
	'forEach',
	'some',
	'every',
	'find',
]);

const unwrapChain = (node: TSESTree.Expression): TSESTree.Expression =>
	node.type === TSESTree.AST_NODE_TYPES.ChainExpression ? unwrapChain(node.expression) : node;

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
				if (!ITERATOR_HELPERS.has(helper)) return;

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

				context.report({
					node: receiver,
					messageId: 'noIteratorHelpers',
					data: { producer, helper },
					fix: (fixer) => [
						fixer.insertTextBefore(receiver, '[...'),
						fixer.insertTextAfter(receiver, ']'),
					],
				});
			},
		};
	},
});
