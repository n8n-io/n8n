const UNITS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const TENS = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const NUMBER_WORDS = new Set([
	'zero',
	...UNITS,
	'ten',
	'eleven',
	'twelve',
	'thirteen',
	'fourteen',
	'fifteen',
	'sixteen',
	'seventeen',
	'eighteen',
	'nineteen',
	...TENS,
	'hundred',
	'thousand',
]);
const ACRONYMS: Record<string, string> = {
	ai: 'AI',
	api: 'API',
	crm: 'CRM',
	csv: 'CSV',
	ftp: 'FTP',
	html: 'HTML',
	http: 'HTTP',
	id: 'ID',
	ids: 'IDs',
	json: 'JSON',
	llm: 'LLM',
	pdf: 'PDF',
	smtp: 'SMTP',
	sql: 'SQL',
	url: 'URL',
	xml: 'XML',
};

const isNumberWord = (word: string) => NUMBER_WORDS.has(word) || /^\d+$/.test(word);

/**
 * Turns a scenario slug into a sentence: "three-orders-three-runs" becomes
 * "Three orders, three runs". A count that follows a noun starts a new clause.
 */
export function slugToSentence(slug: string): string {
	const words = slug
		.toLowerCase()
		.split(/[-_\s]+/)
		.filter((word) => word.length > 0);
	const text = words.reduce((out, word, i) => {
		const previous = words[i - 1];
		const shown = ACRONYMS[word] ?? word;
		if (previous === undefined) return shown;
		if (TENS.includes(previous) && UNITS.includes(word)) return `${out}-${shown}`;
		if (isNumberWord(word) && !isNumberWord(previous)) return `${out}, ${shown}`;
		return `${out} ${shown}`;
	}, '');
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The human-readable scenario title: its description, else its slug as a sentence. */
export function scenarioTitle(slug: string, description: string | null | undefined): string {
	const trimmed = description?.trim();
	return trimmed ? trimmed : slugToSentence(slug);
}
