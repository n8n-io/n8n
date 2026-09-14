/** First sentence of streamed markdown-like text, for thinking status lines. */
export function firstSentence(content: string): string {
	const plain = content.replace(/[*_`#]/g, '').trim();
	const match = plain.match(/^.*?[.!?](?=\s|$)/s);
	return (match ? match[0] : plain).trim();
}
