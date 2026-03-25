/**
Get location info for the given node or range.

@param {import('estree').Node | number[]} nodeOrRange - The AST node or range to get the location for.
@param {import('eslint').SourceCode} sourceCode - The source code object.
@param {int} [startOffset] - Start position offset.
@param {int} [endOffset] - End position offset.
@returns {import('estree').SourceLocation}
*/
function toLocation(nodeOrRange, sourceCode, startOffset = 0, endOffset = 0) {
	const [start, end] = Array.isArray(nodeOrRange) ? nodeOrRange : sourceCode.getRange(nodeOrRange);

	return {
		start: sourceCode.getLocFromIndex(start + startOffset),
		end: sourceCode.getLocFromIndex(end + endOffset),
	};
}

export default toLocation;
