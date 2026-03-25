export default function removeSpacesAfter(indexOrNodeOrToken, sourceCode, fixer) {
	let index = indexOrNodeOrToken;
	if (typeof indexOrNodeOrToken === 'object') {
		index = sourceCode.getRange(indexOrNodeOrToken)[1];
	}

	const textAfter = sourceCode.text.slice(index);
	const [leadingSpaces] = textAfter.match(/^\s*/);
	return fixer.removeRange([index, index + leadingSpaces.length]);
}
