import {checkVueTemplate} from './utils/rule.js';
import isMethodNamed from './utils/is-method-named.js';
import simpleArraySearchRule from './shared/simple-array-search-rule.js';
import {isLiteral, isNegativeOne} from './ast/index.js';

const MESSAGE_ID = 'prefer-includes';
const messages = {
	[MESSAGE_ID]: 'Use `.includes()`, rather than `.{{method}}()`, when checking for existence.',
};
// Ignore `{_,lodash,underscore}.{indexOf,lastIndexOf}`
const ignoredVariables = new Set(['_', 'lodash', 'underscore']);
const isIgnoredTarget = node => node.type === 'Identifier' && ignoredVariables.has(node.name);
const isLiteralZero = node => isLiteral(node, 0);
const isNegativeResult = node => ['===', '==', '<'].includes(node.operator);

const getProblem = (context, node, target, argumentsNodes) => {
	const {sourceCode} = context;
	const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore?.() ?? sourceCode;

	const memberExpressionNode = target.parent;
	const dotToken = tokenStore.getTokenBefore(memberExpressionNode.property);
	const targetSource = sourceCode.getText().slice(
		sourceCode.getRange(memberExpressionNode)[0],
		sourceCode.getRange(dotToken)[0],
	);

	// Strip default `fromIndex`
	if (isLiteralZero(argumentsNodes[1])) {
		argumentsNodes = argumentsNodes.slice(0, 1);
	}

	const argumentsSource = argumentsNodes.map(argument => sourceCode.getText(argument));

	return {
		node: memberExpressionNode.property,
		messageId: MESSAGE_ID,
		data: {
			method: node.left.callee.property.name,
		},
		fix(fixer) {
			const replacement = `${isNegativeResult(node) ? '!' : ''}${targetSource}.includes(${argumentsSource.join(', ')})`;
			return fixer.replaceText(node, replacement);
		},
	};
};

const includesOverSomeRule = simpleArraySearchRule({
	method: 'some',
	replacement: 'includes',
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	includesOverSomeRule.listen(context);

	context.on('BinaryExpression', node => {
		const {left, right, operator} = node;

		if (!isMethodNamed(left, 'indexOf') && !isMethodNamed(left, 'lastIndexOf')) {
			return;
		}

		const target = left.callee.object;

		if (isIgnoredTarget(target)) {
			return;
		}

		const {arguments: argumentsNodes} = left;

		// Ignore something.indexOf(foo, 0, another)
		if (argumentsNodes.length > 2) {
			return;
		}

		if (
			(['!==', '!=', '>', '===', '=='].includes(operator) && isNegativeOne(right))
			|| (['>=', '<'].includes(operator) && isLiteralZero(right))
		) {
			return getProblem(
				context,
				node,
				target,
				argumentsNodes,
			);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: checkVueTemplate(create),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.includes()` over `.indexOf()`, `.lastIndexOf()`, and `Array#some()` when checking for existence or non-existence.',
			recommended: true,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages: {
			...messages,
			...includesOverSomeRule.messages,
		},
	},
};

export default config;
