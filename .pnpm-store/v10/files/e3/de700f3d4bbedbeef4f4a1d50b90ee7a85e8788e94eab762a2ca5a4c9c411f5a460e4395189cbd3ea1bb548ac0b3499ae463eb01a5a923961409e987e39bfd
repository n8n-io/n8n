import {getParenthesizedText, getParenthesizedRange, isSameReference} from './utils/index.js';
import {isLiteral, isMethodCall} from './ast/index.js';
import {replaceNodeOrTokenAndSpacesBefore, removeParentheses} from './fix/index.js';

const MESSAGE_ID = 'prefer-modern-math-apis';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacement}}` over `{{description}}`.',
};

const isMathProperty = (node, property) =>
	node.type === 'MemberExpression'
	&& !node.optional
	&& !node.computed
	&& node.object.type === 'Identifier'
	&& node.object.name === 'Math'
	&& node.property.type === 'Identifier'
	&& node.property.name === property;

const isMathMethodCall = (node, method) =>
	node.type === 'CallExpression'
	&& !node.optional
	&& isMathProperty(node.callee, method)
	&& node.arguments.length === 1
	&& node.arguments[0].type !== 'SpreadElement';

// `Math.log(x) * Math.LOG10E` -> `Math.log10(x)`
// `Math.LOG10E * Math.log(x)` -> `Math.log10(x)`
// `Math.log(x) * Math.LOG2E` -> `Math.log2(x)`
// `Math.LOG2E * Math.log(x)` -> `Math.log2(x)`
function createLogCallTimesConstantCheck({constantName, replacementMethod}) {
	const replacement = `Math.${replacementMethod}(…)`;

	return function (node, context) {
		if (!(node.type === 'BinaryExpression' && node.operator === '*')) {
			return;
		}

		let mathLogCall;
		let description;
		if (isMathMethodCall(node.left, 'log') && isMathProperty(node.right, constantName)) {
			mathLogCall = node.left;
			description = `Math.log(…) * Math.${constantName}`;
		} else if (isMathMethodCall(node.right, 'log') && isMathProperty(node.left, constantName)) {
			mathLogCall = node.right;
			description = `Math.${constantName} * Math.log(…)`;
		}

		if (!mathLogCall) {
			return;
		}

		const [valueNode] = mathLogCall.arguments;

		return {
			node,
			messageId: MESSAGE_ID,
			data: {
				replacement,
				description,
			},
			fix: fixer => fixer.replaceText(node, `Math.${replacementMethod}(${getParenthesizedText(valueNode, context.sourceCode)})`),
		};
	};
}

// `Math.log(x) / Math.LN10` -> `Math.log10(x)`
// `Math.log(x) / Math.LN2` -> `Math.log2(x)`
function createLogCallDivideConstantCheck({constantName, replacementMethod}) {
	const message = {
		messageId: MESSAGE_ID,
		data: {
			replacement: `Math.${replacementMethod}(…)`,
			description: `Math.log(…) / Math.${constantName}`,
		},
	};

	return function (node, context) {
		if (
			!(
				node.type === 'BinaryExpression'
				&& node.operator === '/'
				&& isMathMethodCall(node.left, 'log')
				&& isMathProperty(node.right, constantName)
			)
		) {
			return;
		}

		const [valueNode] = node.left.arguments;

		return {
			...message,
			node,
			fix: fixer => fixer.replaceText(node, `Math.${replacementMethod}(${getParenthesizedText(valueNode, context.sourceCode)})`),
		};
	};
}

const checkFunctions = [
	createLogCallTimesConstantCheck({constantName: 'LOG10E', replacementMethod: 'log10'}),
	createLogCallTimesConstantCheck({constantName: 'LOG2E', replacementMethod: 'log2'}),
	createLogCallDivideConstantCheck({constantName: 'LN10', replacementMethod: 'log10'}),
	createLogCallDivideConstantCheck({constantName: 'LN2', replacementMethod: 'log2'}),
];

const isPlusExpression = node => node.type === 'BinaryExpression' && node.operator === '+';

const isPow2Expression = node =>
	node.type === 'BinaryExpression'
	&& (
		// `x * x`
		(node.operator === '*' && isSameReference(node.left, node.right))
		// `x ** 2`
		|| (node.operator === '**' && isLiteral(node.right, 2))
	);

const flatPlusExpression = node =>
	isPlusExpression(node)
		? [node.left, node.right].flatMap(child => flatPlusExpression(child))
		: [node];

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const nodes = [];

	return {
		CallExpression(callExpression) {
			if (!isMethodCall(callExpression, {
				object: 'Math',
				method: 'sqrt',
				argumentsLength: 1,
				optionalCall: false,
				optionalMember: false,
			})) {
				return;
			}

			const expressions = flatPlusExpression(callExpression.arguments[0]);
			if (expressions.some(expression => !isPow2Expression(expression))) {
				return;
			}

			const replacementMethod = expressions.length === 1 ? 'abs' : 'hypot';
			const plusExpressions = new Set(expressions.length === 1 ? [] : expressions.map(expression => expression.parent));

			return {
				node: callExpression.callee.property,
				messageId: MESSAGE_ID,
				data: {
					replacement: `Math.${replacementMethod}(…)`,
					description: 'Math.sqrt(…)',
				},
				* fix(fixer) {
					const {sourceCode} = context;

					// `Math.sqrt` -> `Math.{hypot,abs}`
					yield fixer.replaceText(callExpression.callee.property, replacementMethod);

					// `a ** 2 + b ** 2` -> `a, b`
					for (const expression of plusExpressions) {
						const plusToken = sourceCode.getTokenAfter(expression.left, token => token.type === 'Punctuator' && token.value === '+');

						yield * replaceNodeOrTokenAndSpacesBefore(plusToken, ',', fixer, sourceCode);
						yield * removeParentheses(expression, fixer, sourceCode);
					}

					// `x ** 2` => `x`
					// `x * a` => `x`
					for (const expression of expressions) {
						yield fixer.removeRange([
							getParenthesizedRange(expression.left, sourceCode)[1],
							sourceCode.getRange(expression)[1],
						]);
					}
				},
			};
		},

		BinaryExpression(node) {
			nodes.push(node);
		},
		* 'Program:exit'() {
			for (const node of nodes) {
				for (const getProblem of checkFunctions) {
					const problem = getProblem(node, context);

					if (problem) {
						yield problem;
					}
				}
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
			description: 'Prefer modern `Math` APIs over legacy patterns.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
