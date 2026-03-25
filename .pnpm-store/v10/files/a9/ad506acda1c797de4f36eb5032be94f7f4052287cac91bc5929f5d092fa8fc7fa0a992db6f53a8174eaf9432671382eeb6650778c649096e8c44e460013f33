import {isParenthesized, isOpeningParenToken, isClosingParenToken} from '@eslint-community/eslint-utils';

/*
Get how many times the node is parenthesized.

@param {Node} node - The node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {number}
*/
export function getParenthesizedTimes(node, sourceCode) {
	let times = 0;

	while (isParenthesized(times + 1, node, sourceCode)) {
		times++;
	}

	return times;
}

/*
Get all parentheses tokens around the node.

@param {Node} node - The node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {Token[]}
*/
export function getParentheses(node, sourceCode) {
	const count = getParenthesizedTimes(node, sourceCode);

	if (count === 0) {
		return [];
	}

	return [
		...sourceCode.getTokensBefore(node, {count, filter: isOpeningParenToken}),
		...sourceCode.getTokensAfter(node, {count, filter: isClosingParenToken}),
	];
}

/*
Get the parenthesized range of the node.

@param {Node} node - The node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {number[]}
*/
export function getParenthesizedRange(node, sourceCode) {
	const parentheses = getParentheses(node, sourceCode);
	const [start] = sourceCode.getRange(parentheses[0] ?? node);
	const [, end] = sourceCode.getRange(parentheses.at(-1) ?? node);
	return [start, end];
}

/*
Get the parenthesized text of the node.

@param {Node} node - The node to be checked.
@param {SourceCode} sourceCode - The source code object.
@returns {string}
*/
export function getParenthesizedText(node, sourceCode) {
	const [start, end] = getParenthesizedRange(node, sourceCode);
	return sourceCode.text.slice(start, end);
}

export {isParenthesized} from '@eslint-community/eslint-utils';
