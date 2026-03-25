import {isParenthesized} from '@eslint-community/eslint-utils';
import shouldAddParenthesesToMemberExpressionObject from './utils/should-add-parentheses-to-member-expression-object.js';
import {fixSpaceAroundKeyword} from './fix/index.js';

const MESSAGE_ID = 'no-unreadable-array-destructuring';
const messages = {
	[MESSAGE_ID]: 'Array destructuring may not contain consecutive ignored values.',
};

const isCommaFollowedWithComma = (element, index, array) =>
	element === null && array[index + 1] === null;

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		ArrayPattern(node) {
			const {elements, parent} = node;

			if (
				elements.length < 3
				|| !elements.some((element, index, elements) => isCommaFollowedWithComma(element, index, elements))) {
				return;
			}

			const problem = {
				node,
				messageId: MESSAGE_ID,
			};

			const nonNullElements = elements.filter(node => node !== null);
			if (
				parent.type === 'VariableDeclarator'
				&& parent.id === node
				&& parent.init !== null
				&& nonNullElements.length === 1
			) {
				const [element] = nonNullElements;

				if (element.type !== 'AssignmentPattern') {
					problem.fix = function * (fixer) {
						const index = elements.indexOf(element);
						const isSlice = element.type === 'RestElement';
						const variable = isSlice ? element.argument : element;

						yield fixer.replaceText(node, sourceCode.getText(variable));

						const code = isSlice ? `.slice(${index})` : `[${index}]`;
						const array = parent.init;
						if (
							!isParenthesized(array, sourceCode)
							&& shouldAddParenthesesToMemberExpressionObject(array, sourceCode)
						) {
							yield fixer.insertTextBefore(array, '(');
							yield fixer.insertTextAfter(parent, `)${code}`);
						} else {
							yield fixer.insertTextAfter(parent, code);
						}

						yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
					};
				}
			}

			return problem;
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow unreadable array destructuring.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
