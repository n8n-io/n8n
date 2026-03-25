import {getParenthesizedRange} from '../utils/parentheses.js';
import removeMemberExpressionProperty from './remove-member-expression-property.js';

export default function * removeMethodCall(fixer, callExpression, sourceCode) {
	const memberExpression = callExpression.callee;

	// `(( (( foo )).bar ))()`
	//              ^^^^
	yield removeMemberExpressionProperty(fixer, memberExpression, sourceCode);

	// `(( (( foo )).bar ))()`
	//                     ^^
	const [, start] = getParenthesizedRange(memberExpression, sourceCode);
	const [, end] = sourceCode.getRange(callExpression);

	yield fixer.removeRange([start, end]);
}
