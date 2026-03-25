export default function getIndentString(node, sourceCode) {
	const {start: {line, column}} = sourceCode.getLoc(node);
	const lines = sourceCode.getLines();
	const before = lines[line - 1].slice(0, column);

	return before.match(/\s*$/)[0];
}
