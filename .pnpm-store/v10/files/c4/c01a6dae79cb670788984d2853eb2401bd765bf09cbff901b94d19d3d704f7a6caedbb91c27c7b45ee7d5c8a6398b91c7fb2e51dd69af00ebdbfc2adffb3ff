import {addParenthesizesToReturnOrThrowExpression, removeSpacesAfter} from './fix/index.js';
import {isParenthesized} from './utils/parentheses.js';
import needsSemicolon from './utils/needs-semicolon.js';
import isOnSameLine from './utils/is-on-same-line.js';

const MESSAGE_ID = 'no-unnecessary-await';
const messages = {
	[MESSAGE_ID]: 'Do not `await` non-promise value.',
};

function notPromise(node) {
	switch (node.type) {
		case 'ArrayExpression':
		case 'ArrowFunctionExpression':
		case 'AwaitExpression':
		case 'BinaryExpression':
		case 'ClassExpression':
		case 'FunctionExpression':
		case 'JSXElement':
		case 'JSXFragment':
		case 'Literal':
		case 'TemplateLiteral':
		case 'UnaryExpression':
		case 'UpdateExpression': {
			return true;
		}

		case 'SequenceExpression': {
			return notPromise(node.expressions.at(-1));
		}

		// No default
	}

	return false;
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	AwaitExpression(node) {
		if (!notPromise(node.argument)) {
			return;
		}

		const {sourceCode} = context;
		const awaitToken = sourceCode.getFirstToken(node);
		const problem = {
			node,
			loc: sourceCode.getLoc(awaitToken),
			messageId: MESSAGE_ID,
		};

		const valueNode = node.argument;
		if (
			// Removing `await` may change them to a declaration, if there is no `id` will cause SyntaxError
			valueNode.type === 'FunctionExpression'
			|| valueNode.type === 'ClassExpression'
			// `+await +1` -> `++1`
			|| (
				node.parent.type === 'UnaryExpression'
				&& valueNode.type === 'UnaryExpression'
				&& node.parent.operator === valueNode.operator
			)
		) {
			return problem;
		}

		return Object.assign(problem, {
			/** @param {import('eslint').Rule.RuleFixer} fixer */
			* fix(fixer) {
				if (
					!isOnSameLine(awaitToken, valueNode)
					&& !isParenthesized(node, sourceCode)
				) {
					yield * addParenthesizesToReturnOrThrowExpression(fixer, node.parent, sourceCode);
				}

				yield fixer.remove(awaitToken);
				yield removeSpacesAfter(awaitToken, sourceCode, fixer);

				const nextToken = sourceCode.getTokenAfter(awaitToken);
				const tokenBefore = sourceCode.getTokenBefore(awaitToken);
				if (needsSemicolon(tokenBefore, sourceCode, nextToken.value)) {
					yield fixer.insertTextBefore(nextToken, ';');
				}
			},
		});
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow awaiting non-promise values.',
			recommended: true,
		},
		fixable: 'code',

		messages,
	},
};

export default config;
