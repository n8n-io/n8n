export function containsExpression(testString: string): boolean {
	if (!testString.startsWith('=')) return false;
	const firstLine = testString.split(/[\r\n\u2028\u2029]/, 1)[0];
	const opening = firstLine.indexOf('{{', 1);
	return opening !== -1 && firstLine.lastIndexOf('}}') > opening + 2;
}
