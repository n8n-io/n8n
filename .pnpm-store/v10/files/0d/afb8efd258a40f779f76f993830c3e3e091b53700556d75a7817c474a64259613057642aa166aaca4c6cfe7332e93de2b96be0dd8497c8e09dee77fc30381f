import {isBigIntLiteral, isCallExpression} from './ast/index.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID = 'prefer-math-min-max';
const messages = {
	[MESSAGE_ID]: 'Prefer `Math.{{method}}()` to simplify ternary expressions.',
};

const isNumberTypeAnnotation = typeAnnotation => {
	if (typeAnnotation.type === 'TSNumberKeyword') {
		return true;
	}

	if (typeAnnotation.type === 'TSTypeAnnotation' && typeAnnotation.typeAnnotation.type === 'TSNumberKeyword') {
		return true;
	}

	if (typeAnnotation.type === 'TSTypeReference' && typeAnnotation.typeName.name === 'Number') {
		return true;
	}

	return false;
};

const getExpressionText = (node, sourceCode) => {
	const expressionNode = node.type === 'TSAsExpression' ? node.expression : node;

	if (node.type === 'TSAsExpression') {
		return getExpressionText(expressionNode, sourceCode);
	}

	return sourceCode.getText(expressionNode);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').ConditionalExpression} conditionalExpression */
	ConditionalExpression(conditionalExpression) {
		const {test, consequent, alternate} = conditionalExpression;

		if (test.type !== 'BinaryExpression') {
			return;
		}

		const {operator, left, right} = test;

		const hasBigInt = [left, right].some(
			node =>
				isBigIntLiteral(node)
				|| isCallExpression(node, {
					name: 'BigInt',
					argumentsLength: 1,
					optional: false,
				}),
		);

		if (hasBigInt) {
			return;
		}

		const [leftText, rightText, alternateText, consequentText] = [left, right, alternate, consequent].map(node => getExpressionText(node, context.sourceCode));

		const isGreaterOrEqual = operator === '>' || operator === '>=';
		const isLessOrEqual = operator === '<' || operator === '<=';

		let method;

		// Prefer `Math.min()`
		if (
			// `height > 50 ? 50 : height`
			(isGreaterOrEqual && leftText === alternateText && rightText === consequentText)
			// `height < 50 ? height : 50`
			|| (isLessOrEqual && leftText === consequentText && rightText === alternateText)
		) {
			method = 'min';
		} else if (
			// `height > 50 ? height : 50`
			(isGreaterOrEqual && leftText === consequentText && rightText === alternateText)
			// `height < 50 ? 50 : height`
			|| (isLessOrEqual && leftText === alternateText && rightText === consequentText)
		) {
			method = 'max';
		}

		if (!method) {
			return;
		}

		for (const node of [left, right]) {
			let expressionNode = node;

			if (expressionNode.typeAnnotation && expressionNode.type === 'TSAsExpression') {
				// Ignore if the test is not a number comparison operator
				if (!isNumberTypeAnnotation(expressionNode.typeAnnotation)) {
					return;
				}

				expressionNode = expressionNode.expression;
			}

			// Find variable declaration
			if (expressionNode.type === 'Identifier') {
				const variable = context.sourceCode.getScope(expressionNode).variables.find(variable => variable.name === expressionNode.name);

				for (const definition of variable?.defs ?? []) {
					switch (definition.type) {
						case 'Parameter': {
							const identifier = definition.name;

							/**
							Capture the following statement

							```js
							function foo(a: number) {}
							```
							*/
							if (identifier.typeAnnotation?.type === 'TSTypeAnnotation' && !isNumberTypeAnnotation(identifier.typeAnnotation)) {
								return;
							}

							/**
							Capture the following statement

							```js
							function foo(a = 10) {}
							```
							*/
							if (identifier.parent.type === 'AssignmentPattern' && identifier.parent.right.type === 'Literal' && typeof identifier.parent.right.value !== 'number') {
								return;
							}

							break;
						}

						case 'Variable': {
							/** @type {import('estree').VariableDeclarator}  */
							const variableDeclarator = definition.node;

							/**
							Capture the following statement

							```js
							var foo: number
							```
							*/
							if (variableDeclarator.id.typeAnnotation?.type === 'TSTypeAnnotation' && !isNumberTypeAnnotation(variableDeclarator.id.typeAnnotation)) {
								return;
							}

							/**
							Capture the following statement

							```js
							var foo = 10
							```
							*/
							if (variableDeclarator.init?.type === 'Literal' && typeof variableDeclarator.init.value !== 'number') {
								return;
							}

							break;
						}

						default:
					}
				}
			}
		}

		return {
			node: conditionalExpression,
			messageId: MESSAGE_ID,
			data: {method},
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				const {sourceCode} = context;

				yield * fixSpaceAroundKeyword(fixer, conditionalExpression, sourceCode);

				const argumentsText = [left, right]
					.map(node => node.type === 'SequenceExpression' ? `(${sourceCode.getText(node)})` : sourceCode.getText(node))
					.join(', ');

				yield fixer.replaceText(conditionalExpression, `Math.${method}(${argumentsText})`);
			},
		};
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Prefer `Math.min()` and `Math.max()` over ternaries for simple comparisons.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
