/** First sentence of streamed markdown-like text, for thinking status lines. */
export function firstSentence(content: string): string {
	const plain = content.replace(/[*_`#]/g, '').trim();
	const match = plain.match(/^.*?[.!?](?=\s|$)/s);
	return (match ? match[0] : plain).trim();
}

/** Shorter sentences ("Okay.", "Hmm.") say nothing in a status line. */
const MIN_SENTENCE_LENGTH = 12;
const MAX_SENTENCE_LENGTH = 140;
// A sentence ends at punctuation followed by white space, so `n8n-nodes-base.gmail` stays whole.
const SENTENCE_PATTERN = /.*?[.!?]+(?=\s)/g;

/** The sentences of one line. A finished line also ends its last sentence. */
function sentencesOfLine(line: string, finished: boolean): string[] {
	const sentences = [...`${line}${finished ? '\n' : ''}`.matchAll(SENTENCE_PATTERN)].map(
		(match) => match[0],
	);
	if (finished) {
		const rest = line.slice(sentences.join('').length);
		if (rest.trim()) sentences.push(rest);
	}
	return sentences;
}

function shorten(text: string): string {
	return text.length <= MAX_SENTENCE_LENGTH
		? text
		: `${text.slice(0, MAX_SENTENCE_LENGTH - 1).trimEnd()}…`;
}

/**
 * The newest complete sentence of streamed markdown-like text, for status lines
 * that follow the reasoning as it streams. Undefined until a sentence ends.
 */
export function latestSentence(content: string): string | undefined {
	const lines = content.replace(/[*_`#]/g, '').split('\n');
	const streaming = lines.pop() ?? '';
	const sentences = [
		...lines.flatMap((line) => sentencesOfLine(line, true)),
		...sentencesOfLine(streaming, false),
	]
		.map((sentence) => sentence.trim())
		.filter((sentence) => sentence.length >= MIN_SENTENCE_LENGTH);
	const latest = sentences.at(-1);
	return latest ? shorten(latest) : undefined;
}
