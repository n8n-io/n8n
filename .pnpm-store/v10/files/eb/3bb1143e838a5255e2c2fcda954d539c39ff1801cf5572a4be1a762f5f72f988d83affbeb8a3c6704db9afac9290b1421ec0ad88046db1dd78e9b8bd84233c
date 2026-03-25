/**
Check if parentheses should to be added to a `node` when it's used as an `expression` of `ExpressionStatement`.

@param {Node} node - The AST node to check.
@param {SourceCode} sourceCode - The source code object.
@returns {boolean}
*/
export default function shouldAddParenthesesToExpressionStatementExpression(node) {
	switch (node.type) {
		case 'ObjectExpression': {
			return true;
		}

		case 'AssignmentExpression': {
			return node.left.type === 'ObjectPattern' || node.left.type === 'ArrayPattern';
		}

		default: {
			return false;
		}
	}
}
