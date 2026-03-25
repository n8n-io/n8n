import {isParenthesized} from '../utils/parentheses.js';
import shouldAddParenthesesToNewExpressionCallee from '../utils/should-add-parentheses-to-new-expression-callee.js';
import fixSpaceAroundKeyword from './fix-space-around-keywords.js';

export default function * switchCallExpressionToNewExpression(node, sourceCode, fixer) {
	yield * fixSpaceAroundKeyword(fixer, node, sourceCode);
	yield fixer.insertTextBefore(node, 'new ');

	const {callee} = node;
	if (
		!isParenthesized(callee, sourceCode)
		&& shouldAddParenthesesToNewExpressionCallee(callee)
	) {
		yield fixer.insertTextBefore(callee, '(');
		yield fixer.insertTextAfter(callee, ')');
	}
}
