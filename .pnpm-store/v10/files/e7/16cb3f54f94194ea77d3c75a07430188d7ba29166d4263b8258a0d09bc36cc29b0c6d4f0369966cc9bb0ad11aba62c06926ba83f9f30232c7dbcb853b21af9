import isNewExpressionWithParentheses from './is-new-expression-with-parentheses.js';
import {isDecimalIntegerNode} from './numeric.js';

/**
Check if parentheses should to be added to a `node` when it's used as an `object` of `MemberExpression`.

@param {Node} node - The AST node to check.
@param {SourceCode} sourceCode - The source code object.
@returns {boolean}
*/
export default function shouldAddParenthesesToMemberExpressionObject(node, sourceCode) {
	switch (node.type) {
		// This is not a full list. Some other nodes like `FunctionDeclaration` don't need parentheses,
		// but it's not possible to be in the place we are checking at this point.
		case 'Identifier':
		case 'MemberExpression':
		case 'CallExpression':
		case 'ChainExpression':
		case 'TemplateLiteral':
		case 'ThisExpression':
		case 'ArrayExpression':
		case 'FunctionExpression': {
			return false;
		}

		case 'NewExpression': {
			return !isNewExpressionWithParentheses(node, sourceCode);
		}

		case 'Literal': {
			/* c8 ignore next */
			if (isDecimalIntegerNode(node)) {
				return true;
			}

			return false;
		}

		default: {
			return true;
		}
	}
}
