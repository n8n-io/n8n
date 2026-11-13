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

/** The sentences of one line. The rest of the line counts, also while it streams. */
function sentencesOfLine(line: string): string[] {
	const sentences = [...line.matchAll(SENTENCE_PATTERN)].map((match) => match[0]);
	const rest = line.slice(sentences.join('').length);
	return rest.trim() ? [...sentences, rest] : sentences;
}

/** Keeps the end of a long sentence, where the newest words are. */
function shorten(text: string): string {
	return text.length <= MAX_SENTENCE_LENGTH
		? text
		: `…${text.slice(-(MAX_SENTENCE_LENGTH - 1)).trimStart()}`;
}

/**
 * The sentence that streamed markdown-like text is writing, for status lines
 * that follow the reasoning as it streams. A sentence shows once it is long
 * enough to read. Until then, the sentence before it stays.
 */
export function currentSentence(content: string): string | undefined {
	const sentences = content
		.replace(/[*_`#]/g, '')
		.split('\n')
		.flatMap(sentencesOfLine)
		.map((sentence) => sentence.trim())
		.filter((sentence) => sentence.length >= MIN_SENTENCE_LENGTH);
	const current = sentences.at(-1);
	return current ? shorten(current) : undefined;
}
