// Letters that NFD does not split into a base letter and a diacritic.
const FOLDED_LETTERS: Record<string, string> = {
	æ: 'ae',
	đ: 'd',
	ð: 'd',
	ħ: 'h',
	ı: 'i',
	ł: 'l',
	ø: 'o',
	œ: 'oe',
	ß: 'ss',
	þ: 'th',
};

const normalize = (value: string) =>
	value
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[æđðħıłøœßþ]/g, (letter) => FOLDED_LETTERS[letter] ?? letter);

/** Splits a search query into terms on whitespace. */
export function splitSearchTerms(query: string): string[] {
	return query.split(/\s+/).filter(Boolean);
}

/**
 * Returns true when each term of `query` occurs in at least one of `fields`.
 * Case and diacritics are ignored, so "jose doe" matches "José" + "Doe".
 */
export function matchesAllTerms(query: string, fields: Array<string | null | undefined>): boolean {
	const terms = splitSearchTerms(normalize(query));
	if (terms.length === 0) return true;

	const haystacks = fields.filter((field): field is string => !!field).map(normalize);
	return terms.every((term) => haystacks.some((haystack) => haystack.includes(term)));
}
