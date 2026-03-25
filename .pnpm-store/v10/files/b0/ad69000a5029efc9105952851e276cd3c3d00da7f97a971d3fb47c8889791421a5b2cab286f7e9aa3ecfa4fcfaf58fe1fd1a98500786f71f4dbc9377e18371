import {getStaticValue} from '@eslint-community/eslint-utils';
import {getParenthesizedText, getParenthesizedRange} from './utils/parentheses.js';
import {replaceArgument} from './fix/index.js';
import {isNumberLiteral, isMethodCall} from './ast/index.js';

const MESSAGE_ID_SUBSTR = 'substr';
const MESSAGE_ID_SUBSTRING = 'substring';
const messages = {
	[MESSAGE_ID_SUBSTR]: 'Prefer `String#slice()` over `String#substr()`.',
	[MESSAGE_ID_SUBSTRING]: 'Prefer `String#slice()` over `String#substring()`.',
};

const getNumericValue = node => {
	if (isNumberLiteral(node)) {
		return node.value;
	}

	if (node.type === 'UnaryExpression' && node.operator === '-') {
		return -getNumericValue(node.argument);
	}
};

// This handles cases where the argument is very likely to be a number, such as `.substring('foo'.length)`.
const isLengthProperty = node => (
	node?.type === 'MemberExpression'
	&& node.computed === false
	&& node.property.type === 'Identifier'
	&& node.property.name === 'length'
);

function * fixSubstrArguments({node, fixer, context, abort}) {
	const argumentNodes = node.arguments;
	const [firstArgument, secondArgument] = argumentNodes;

	if (!secondArgument) {
		return;
	}

	const {sourceCode} = context;
	const scope = sourceCode.getScope(node);
	const firstArgumentStaticResult = getStaticValue(firstArgument, scope);
	const secondArgumentRange = getParenthesizedRange(secondArgument, sourceCode);
	const replaceSecondArgument = text => replaceArgument(fixer, secondArgument, text, sourceCode);

	if (firstArgumentStaticResult?.value === 0) {
		if (isNumberLiteral(secondArgument) || isLengthProperty(secondArgument)) {
			return;
		}

		if (typeof getNumericValue(secondArgument) === 'number') {
			yield replaceSecondArgument(Math.max(0, getNumericValue(secondArgument)));
			return;
		}

		yield fixer.insertTextBeforeRange(secondArgumentRange, 'Math.max(0, ');
		yield fixer.insertTextAfterRange(secondArgumentRange, ')');
		return;
	}

	if (argumentNodes.every(node => isNumberLiteral(node))) {
		yield replaceSecondArgument(firstArgument.value + secondArgument.value);
		return;
	}

	return abort();
}

function * fixSubstringArguments({node, fixer, context, abort}) {
	const {sourceCode} = context;
	const [firstArgument, secondArgument] = node.arguments;

	const firstNumber = firstArgument ? getNumericValue(firstArgument) : undefined;
	const firstArgumentText = getParenthesizedText(firstArgument, sourceCode);
	const replaceFirstArgument = text => replaceArgument(fixer, firstArgument, text, sourceCode);

	if (!secondArgument) {
		if (isLengthProperty(firstArgument)) {
			return;
		}

		if (firstNumber !== undefined) {
			yield replaceFirstArgument(Math.max(0, firstNumber));
			return;
		}

		const firstArgumentRange = getParenthesizedRange(firstArgument, sourceCode);
		yield fixer.insertTextBeforeRange(firstArgumentRange, 'Math.max(0, ');
		yield fixer.insertTextAfterRange(firstArgumentRange, ')');
		return;
	}

	const secondNumber = getNumericValue(secondArgument);
	const secondArgumentText = getParenthesizedText(secondArgument, sourceCode);
	const replaceSecondArgument = text => replaceArgument(fixer, secondArgument, text, sourceCode);

	if (firstNumber !== undefined && secondNumber !== undefined) {
		const argumentsValue = [Math.max(0, firstNumber), Math.max(0, secondNumber)];
		if (firstNumber > secondNumber) {
			argumentsValue.reverse();
		}

		if (argumentsValue[0] !== firstNumber) {
			yield replaceFirstArgument(argumentsValue[0]);
		}

		if (argumentsValue[1] !== secondNumber) {
			yield replaceSecondArgument(argumentsValue[1]);
		}

		return;
	}

	if (firstNumber === 0 || secondNumber === 0) {
		yield replaceFirstArgument(0);
		yield replaceSecondArgument(`Math.max(0, ${firstNumber === 0 ? secondArgumentText : firstArgumentText})`);
		return;
	}

	// As values aren't Literal, we can not know whether secondArgument will become smaller than the first or not, causing an issue:
	//   .substring(0, 2) and .substring(2, 0) returns the same result
	//   .slice(0, 2) and .slice(2, 0) doesn't return the same result
	// There's also an issue with us now knowing whether the value will be negative or not, due to:
	//   .substring() treats a negative number the same as it treats a zero.
	// The latter issue could be solved by wrapping all dynamic numbers in Math.max(0, <value>), but the resulting code would not be nice

	return abort();
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	CallExpression(node) {
		if (!isMethodCall(node, {methods: ['substr', 'substring']})) {
			return;
		}

		const method = node.callee.property.name;

		return {
			node,
			messageId: method,
			* fix(fixer, {abort}) {
				yield fixer.replaceText(node.callee.property, 'slice');

				if (node.arguments.length === 0) {
					return;
				}

				if (
					node.arguments.length > 2
					|| node.arguments.some(node => node.type === 'SpreadElement')
				) {
					return abort();
				}

				const fixArguments = method === 'substr' ? fixSubstrArguments : fixSubstringArguments;
				yield * fixArguments({
					node,
					fixer,
					context,
					abort,
				});
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `String#slice()` over `String#substr()` and `String#substring()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
