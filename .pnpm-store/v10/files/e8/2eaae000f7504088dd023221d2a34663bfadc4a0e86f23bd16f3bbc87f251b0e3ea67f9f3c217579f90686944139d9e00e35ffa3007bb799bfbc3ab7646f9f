import {isParenthesized, getStaticValue} from '@eslint-community/eslint-utils';
import {checkVueTemplate} from './utils/rule.js';
import isLogicalExpression from './utils/is-logical-expression.js';
import {isBooleanNode, getBooleanAncestor} from './utils/boolean.js';
import {fixSpaceAroundKeyword} from './fix/index.js';
import {isLiteral, isMemberExpression, isNumberLiteral} from './ast/index.js';

const TYPE_NON_ZERO = 'non-zero';
const TYPE_ZERO = 'zero';
const MESSAGE_ID_SUGGESTION = 'suggestion';
const messages = {
	[TYPE_NON_ZERO]: 'Use `.{{property}} {{code}}` when checking {{property}} is not zero.',
	[TYPE_ZERO]: 'Use `.{{property}} {{code}}` when checking {{property}} is zero.',
	[MESSAGE_ID_SUGGESTION]: 'Replace `.{{property}}` with `.{{property}} {{code}}`.',
};

const isCompareRight = (node, operator, value) =>
	node.type === 'BinaryExpression'
	&& node.operator === operator
	&& isLiteral(node.right, value);
const isCompareLeft = (node, operator, value) =>
	node.type === 'BinaryExpression'
	&& node.operator === operator
	&& isLiteral(node.left, value);
const nonZeroStyles = new Map([
	[
		'greater-than',
		{
			code: '> 0',
			test: node => isCompareRight(node, '>', 0),
		},
	],
	[
		'not-equal',
		{
			code: '!== 0',
			test: node => isCompareRight(node, '!==', 0),
		},
	],
]);
const zeroStyle = {
	code: '=== 0',
	test: node => isCompareRight(node, '===', 0),
};

function getLengthCheckNode(node) {
	node = node.parent;

	// Zero length check
	if (
		// `foo.length === 0`
		isCompareRight(node, '===', 0)
		// `foo.length == 0`
		|| isCompareRight(node, '==', 0)
		// `foo.length < 1`
		|| isCompareRight(node, '<', 1)
		// `0 === foo.length`
		|| isCompareLeft(node, '===', 0)
		// `0 == foo.length`
		|| isCompareLeft(node, '==', 0)
		// `1 > foo.length`
		|| isCompareLeft(node, '>', 1)
	) {
		return {isZeroLengthCheck: true, node};
	}

	// Non-Zero length check
	if (
		// `foo.length !== 0`
		isCompareRight(node, '!==', 0)
		// `foo.length != 0`
		|| isCompareRight(node, '!=', 0)
		// `foo.length > 0`
		|| isCompareRight(node, '>', 0)
		// `foo.length >= 1`
		|| isCompareRight(node, '>=', 1)
		// `0 !== foo.length`
		|| isCompareLeft(node, '!==', 0)
		// `0 !== foo.length`
		|| isCompareLeft(node, '!=', 0)
		// `0 < foo.length`
		|| isCompareLeft(node, '<', 0)
		// `1 <= foo.length`
		|| isCompareLeft(node, '<=', 1)
	) {
		return {isZeroLengthCheck: false, node};
	}

	return {};
}

function isNodeValueNumber(node, context) {
	if (isNumberLiteral(node)) {
		return true;
	}

	const staticValue = getStaticValue(node, context.sourceCode.getScope(node));
	return staticValue && typeof staticValue.value === 'number';
}

function create(context) {
	const options = {
		'non-zero': 'greater-than',
		...context.options[0],
	};
	const nonZeroStyle = nonZeroStyles.get(options['non-zero']);
	const {sourceCode} = context;

	function getProblem({node, isZeroLengthCheck, lengthNode, autoFix}) {
		const {code, test} = isZeroLengthCheck ? zeroStyle : nonZeroStyle;
		if (test(node)) {
			return;
		}

		let fixed = `${sourceCode.getText(lengthNode)} ${code}`;
		if (
			!isParenthesized(node, sourceCode)
			&& node.type === 'UnaryExpression'
			&& (node.parent.type === 'UnaryExpression' || node.parent.type === 'AwaitExpression')
		) {
			fixed = `(${fixed})`;
		}

		const fix = function * (fixer) {
			yield fixer.replaceText(node, fixed);
			yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
		};

		const problem = {
			node,
			messageId: isZeroLengthCheck ? TYPE_ZERO : TYPE_NON_ZERO,
			data: {code, property: lengthNode.property.name},
		};

		if (autoFix) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: MESSAGE_ID_SUGGESTION,
					fix,
				},
			];
		}

		return problem;
	}

	return {
		MemberExpression(memberExpression) {
			if (
				!isMemberExpression(memberExpression, {
					properties: ['length', 'size'],
					optional: false,
				})
				|| memberExpression.object.type === 'ThisExpression'
			) {
				return;
			}

			const lengthNode = memberExpression;
			const staticValue = getStaticValue(lengthNode, sourceCode.getScope(lengthNode));
			if (staticValue && (!Number.isInteger(staticValue.value) || staticValue.value < 0)) {
				// Ignore known, non-positive-integer length properties.
				return;
			}

			let node;
			let autoFix = true;
			let {isZeroLengthCheck, node: lengthCheckNode} = getLengthCheckNode(lengthNode);
			if (lengthCheckNode) {
				const {isNegative, node: ancestor} = getBooleanAncestor(lengthCheckNode);
				node = ancestor;
				if (isNegative) {
					isZeroLengthCheck = !isZeroLengthCheck;
				}
			} else {
				const {isNegative, node: ancestor} = getBooleanAncestor(lengthNode);
				if (isBooleanNode(ancestor)) {
					isZeroLengthCheck = isNegative;
					node = ancestor;
				} else if (
					isLogicalExpression(lengthNode.parent)
					&& !(
						lengthNode.parent.operator === '||'
						&& isNodeValueNumber(lengthNode.parent.right, context)
					)
				) {
					isZeroLengthCheck = isNegative;
					node = lengthNode;
					autoFix = false;
				}
			}

			if (node) {
				return getProblem({
					node,
					isZeroLengthCheck,
					lengthNode,
					autoFix,
				});
			}
		},
	};
}

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			'non-zero': {
				enum: [...nonZeroStyles.keys()],
				default: 'greater-than',
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce explicitly comparing the `length` or `size` property of a value.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		messages,
		hasSuggestions: true,
	},
};

export default config;
