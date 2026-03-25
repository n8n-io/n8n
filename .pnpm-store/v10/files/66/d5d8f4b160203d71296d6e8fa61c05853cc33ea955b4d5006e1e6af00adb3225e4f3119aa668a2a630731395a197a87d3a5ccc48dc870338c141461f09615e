import {getParenthesizedRange} from '../utils/parentheses.js';

const isProblematicToken = ({type, value}) => (
	(type === 'Keyword' && /^[a-z]*$/.test(value))
	// ForOfStatement
	|| (type === 'Identifier' && value === 'of')
	// AwaitExpression
	|| (type === 'Identifier' && value === 'await')
);

export default function * fixSpaceAroundKeyword(fixer, node, sourceCode) {
	const range = getParenthesizedRange(node, sourceCode);
	const tokenBefore = sourceCode.getTokenBefore({range}, {includeComments: true});

	if (
		tokenBefore
		&& range[0] === sourceCode.getRange(tokenBefore)[1]
		&& isProblematicToken(tokenBefore)
	) {
		yield fixer.insertTextAfter(tokenBefore, ' ');
	}

	const tokenAfter = sourceCode.getTokenAfter({range}, {includeComments: true});

	if (
		tokenAfter
		&& range[1] === sourceCode.getRange(tokenAfter)[0]
		&& isProblematicToken(tokenAfter)
	) {
		yield fixer.insertTextBefore(tokenAfter, ' ');
	}
}
