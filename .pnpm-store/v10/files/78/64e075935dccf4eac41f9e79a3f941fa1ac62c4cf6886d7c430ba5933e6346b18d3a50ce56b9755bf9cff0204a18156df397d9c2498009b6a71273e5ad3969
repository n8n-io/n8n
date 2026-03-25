import {isColonToken} from '@eslint-community/eslint-utils';

/**
@typedef {line: number, column: number} Position

Get the location of the given `SwitchCase` node for reporting.

@param {Node} node - The `SwitchCase` node to get.
@param {SourceCode} sourceCode - The source code object to get tokens from.
@returns {{start: Position, end: Position}} The location of the class node for reporting.
*/
export default function getSwitchCaseHeadLocation(node, sourceCode) {
	const startToken = node.test || sourceCode.getFirstToken(node);
	const colonToken = sourceCode.getTokenAfter(startToken, isColonToken);
	return {start: sourceCode.getLoc(node).start, end: sourceCode.getLoc(colonToken).end};
}
