// Replace `StringLiteral` or `TemplateLiteral` node with raw text
const replaceStringRaw = (fixer, node, raw) =>
	fixer.replaceTextRange(
		// Ignore quotes and backticks
		[
			// eslint-disable-next-line internal/no-restricted-property-access
			node.range[0] + 1,
			// eslint-disable-next-line internal/no-restricted-property-access
			node.range[1] - 1,
		],
		raw,
	);

export default replaceStringRaw;
