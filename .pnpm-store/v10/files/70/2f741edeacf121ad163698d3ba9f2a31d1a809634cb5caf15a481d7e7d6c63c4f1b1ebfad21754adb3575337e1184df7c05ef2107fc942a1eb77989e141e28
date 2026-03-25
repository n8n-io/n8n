import {isMethodCall, isMemberExpression} from './ast/index.js';
import {getParenthesizedRange, isSameReference, isLogicalExpression} from './utils/index.js';

const messages = {
	'non-zero': 'The non-empty check is useless as `Array#some()` returns `false` for an empty array.',
	zero: 'The empty check is useless as `Array#every()` returns `true` for an empty array.',
};

// We assume the user already follows `unicorn/explicit-length-check`. These are allowed in that rule.
const isLengthCompareZero = node =>
	node.type === 'BinaryExpression'
	&& node.right.type === 'Literal'
	&& node.right.raw === '0'
	&& isMemberExpression(node.left, {property: 'length', optional: false})
	&& isLogicalExpression(node.parent);

function flatLogicalExpression(node) {
	return [node.left, node.right].flatMap(child =>
		child.type === 'LogicalExpression' && child.operator === node.operator
			? flatLogicalExpression(child)
			: [child],
	);
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const logicalExpressions = [];
	const zeroLengthChecks = new Set();
	const nonZeroLengthChecks = new Set();
	const arraySomeCalls = new Set();
	const arrayEveryCalls = new Set();

	function isUselessLengthCheckNode({node, operator, siblings}) {
		return (
			(
				operator === '||'
				&& zeroLengthChecks.has(node)
				&& siblings.some(condition =>
					arrayEveryCalls.has(condition)
					&& isSameReference(node.left.object, condition.callee.object),
				)
			)
			|| (
				operator === '&&'
				&& nonZeroLengthChecks.has(node)
				&& siblings.some(condition =>
					arraySomeCalls.has(condition)
					&& isSameReference(node.left.object, condition.callee.object),
				)
			)
		);
	}

	function getUselessLengthCheckNode(logicalExpression) {
		const {operator} = logicalExpression;
		return flatLogicalExpression(logicalExpression)
			.filter((node, index, conditions) => isUselessLengthCheckNode({
				node,
				operator,
				siblings: [
					conditions[index - 1],
					conditions[index + 1],
				].filter(Boolean),
			}));
	}

	return {
		BinaryExpression(node) {
			if (isLengthCompareZero(node)) {
				const {operator} = node;
				if (operator === '===') {
					zeroLengthChecks.add(node);
				} else if (operator === '>' || operator === '!==') {
					nonZeroLengthChecks.add(node);
				}
			}
		},
		CallExpression(node) {
			if (
				isMethodCall(node, {
					optionalCall: false,
					optionalMember: false,
					computed: false,
				})
				&& node.callee.property.type === 'Identifier'
			) {
				if (node.callee.property.name === 'some') {
					arraySomeCalls.add(node);
				} else if (node.callee.property.name === 'every') {
					arrayEveryCalls.add(node);
				}
			}
		},
		LogicalExpression(node) {
			if (isLogicalExpression(node)) {
				logicalExpressions.push(node);
			}
		},
		* 'Program:exit'() {
			const nodes = new Set(
				logicalExpressions.flatMap(logicalExpression =>
					getUselessLengthCheckNode(logicalExpression),
				),
			);
			const {sourceCode} = context;

			for (const node of nodes) {
				yield {
					loc: {
						start: sourceCode.getLoc(node.left.property).start,
						end: sourceCode.getLoc(node).end,
					},
					messageId: zeroLengthChecks.has(node) ? 'zero' : 'non-zero',
					/** @param {import('eslint').Rule.RuleFixer} fixer */
					fix(fixer) {
						const {left, right} = node.parent;
						const leftRange = getParenthesizedRange(left, sourceCode);
						const rightRange = getParenthesizedRange(right, sourceCode);
						const range = [];
						if (left === node) {
							range[0] = leftRange[0];
							range[1] = rightRange[0];
						} else {
							range[0] = leftRange[1];
							range[1] = rightRange[1];
						}

						return fixer.removeRange(range);
					},
				};
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow useless array length check.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
