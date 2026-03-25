import {getParenthesizedRange} from '../utils/parentheses.js';

export default function removeMemberExpressionProperty(fixer, memberExpression, sourceCode) {
	const [, start] = getParenthesizedRange(memberExpression.object, sourceCode);
	const [, end] = sourceCode.getRange(memberExpression);
	return fixer.removeRange([start, end]);
}
