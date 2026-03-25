import {removeParentheses, removeMemberExpressionProperty} from './fix/index.js';
import {isLiteral} from './ast/index.js';

const MESSAGE_ID = 'no-await-expression-member';
const messages = {
	[MESSAGE_ID]: 'Do not access a member directly from an await expression.',
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		MemberExpression(memberExpression) {
			if (memberExpression.object.type !== 'AwaitExpression') {
				return;
			}

			const {property} = memberExpression;
			const problem = {
				node: property,
				messageId: MESSAGE_ID,
			};

			// `const foo = (await bar)[0]`
			if (
				memberExpression.computed
				&& !memberExpression.optional
				&& (isLiteral(property, 0) || isLiteral(property, 1))
				&& memberExpression.parent.type === 'VariableDeclarator'
				&& memberExpression.parent.init === memberExpression
				&& memberExpression.parent.id.type === 'Identifier'
				&& !memberExpression.parent.id.typeAnnotation
			) {
				problem.fix = function * (fixer) {
					const variable = memberExpression.parent.id;
					yield fixer.insertTextBefore(variable, property.value === 0 ? '[' : '[, ');
					yield fixer.insertTextAfter(variable, ']');

					yield removeMemberExpressionProperty(fixer, memberExpression, sourceCode);
					yield * removeParentheses(memberExpression.object, fixer, sourceCode);
				};

				return problem;
			}

			// `const foo = (await bar).foo`
			if (
				!memberExpression.computed
				&& !memberExpression.optional
				&& property.type === 'Identifier'
				&& memberExpression.parent.type === 'VariableDeclarator'
				&& memberExpression.parent.init === memberExpression
				&& memberExpression.parent.id.type === 'Identifier'
				&& memberExpression.parent.id.name === property.name
				&& !memberExpression.parent.id.typeAnnotation
			) {
				problem.fix = function * (fixer) {
					const variable = memberExpression.parent.id;
					yield fixer.insertTextBefore(variable, '{');
					yield fixer.insertTextAfter(variable, '}');

					yield removeMemberExpressionProperty(fixer, memberExpression, sourceCode);
					yield * removeParentheses(memberExpression.object, fixer, sourceCode);
				};

				return problem;
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
			description: 'Disallow member access from await expression.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
