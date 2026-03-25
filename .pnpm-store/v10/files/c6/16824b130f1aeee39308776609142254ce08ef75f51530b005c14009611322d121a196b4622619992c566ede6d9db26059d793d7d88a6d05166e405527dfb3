import toLocation from './utils/to-location.js';
import {isMethodCall, isNegativeOne, isNumberLiteral} from './ast/index.js';

const MESSAGE_ID = 'consistent-existence-index-check';
const messages = {
	[MESSAGE_ID]: 'Prefer `{{replacementOperator}} {{replacementValue}}` over `{{originalOperator}} {{originalValue}}` to check {{existenceOrNonExistence}}.',
};

const isZero = node => isNumberLiteral(node) && node.value === 0;

/**
@param {parent: import('estree').BinaryExpression} binaryExpression
@returns {{
	replacementOperator: string,
	replacementValue: string,
	originalOperator: string,
	originalValue: string,
} | undefined}
*/
function getReplacement(binaryExpression) {
	const {operator, right} = binaryExpression;

	if (operator === '<' && isZero(right)) {
		return {
			replacementOperator: '===',
			replacementValue: '-1',
			originalOperator: operator,
			originalValue: '0',
		};
	}

	if (operator === '>' && isNegativeOne(right)) {
		return {
			replacementOperator: '!==',
			replacementValue: '-1',
			originalOperator: operator,
			originalValue: '-1',
		};
	}

	if (operator === '>=' && isZero(right)) {
		return {
			replacementOperator: '!==',
			replacementValue: '-1',
			originalOperator: operator,
			originalValue: '0',
		};
	}
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	/** @param {import('estree').VariableDeclarator} variableDeclarator */
	* VariableDeclarator(variableDeclarator) {
		if (!(
			variableDeclarator.parent.type === 'VariableDeclaration'
			&& variableDeclarator.parent.kind === 'const'
			&& variableDeclarator.id.type === 'Identifier'
			&& isMethodCall(variableDeclarator.init, {methods: ['indexOf', 'lastIndexOf', 'findIndex', 'findLastIndex']})
		)) {
			return;
		}

		const variableIdentifier = variableDeclarator.id;
		const variables = context.sourceCode.getDeclaredVariables(variableDeclarator);
		const [variable] = variables;

		// Just for safety
		if (
			variables.length !== 1
			|| variable.identifiers.length !== 1
			|| variable.identifiers[0] !== variableIdentifier
		) {
			return;
		}

		for (const {identifier} of variable.references) {
			/** @type {{parent: import('estree').BinaryExpression}} */
			const binaryExpression = identifier.parent;

			if (binaryExpression.type !== 'BinaryExpression' || binaryExpression.left !== identifier) {
				continue;
			}

			const replacement = getReplacement(binaryExpression);

			if (!replacement) {
				return;
			}

			const {left, operator, right} = binaryExpression;
			const {sourceCode} = context;

			const operatorToken = sourceCode.getTokenAfter(
				left,
				token => token.type === 'Punctuator' && token.value === operator,
			);

			const [start] = sourceCode.getRange(operatorToken);
			const [, end] = sourceCode.getRange(right);

			yield {
				node: binaryExpression,
				loc: toLocation([start, end], sourceCode),
				messageId: MESSAGE_ID,
				data: {
					...replacement,
					existenceOrNonExistence: `${replacement.replacementOperator === '===' ? 'non-' : ''}existence`,
				},
				* fix(fixer) {
					yield fixer.replaceText(operatorToken, replacement.replacementOperator);

					if (replacement.replacementValue !== replacement.originalValue) {
						yield fixer.replaceText(right, replacement.replacementValue);
					}
				},
			};
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce consistent style for element existence checks with `indexOf()`, `lastIndexOf()`, `findIndex()`, and `findLastIndex()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
