/**
 * Plain text of a Tiptap document. Text nodes join as they are, so marks inside a word do not
 * split it. Each block ends with a space.
 */
export function extractText(doc: unknown): string {
	const walk = (node: unknown): string => {
		if (Array.isArray(node)) return node.map(walk).join('');
		if (typeof node !== 'object' || node === null) return '';
		if ('text' in node && typeof node.text === 'string') return node.text;
		if ('content' in node) return `${walk(node.content)} `;
		return ' ';
	};
	return walk(doc).replace(/\s+/g, ' ').trim();
}
