/**
 * Separators tried in order of decreasing semantic weight: a paragraph break
 * keeps more meaning together than a space, so a weaker one is only used when
 * a unit is still too large.
 *
 * `keep` is the part of the separator that belongs to the text rather than to
 * the layout — the sentence period stays on the unit it ends, while whitespace
 * separators only reappear when two units end up in the same chunk.
 */
const SEPARATORS = [
	{ split: '\n\n', keep: '' },
	{ split: '\n', keep: '' },
	{ split: '. ', keep: '.' },
	{ split: ' ', keep: '' },
] as const;

export interface ChunkTextOptions {
	/** Target maximum characters per chunk, before the overlap prefix is added. */
	chunkSize: number;
	/** Characters of the previous chunk repeated at the start of the next one. */
	chunkOverlap: number;
	/** Input longer than this is truncated before any splitting happens. */
	maxChars: number;
}

function isHighSurrogate(code: number): boolean {
	return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
	return code >= 0xdc00 && code <= 0xdfff;
}

/** Moves `index` back by one when it would land between the halves of a surrogate pair. */
function safeIndex(text: string, index: number): number {
	if (index <= 0 || index >= text.length) return index;

	return isHighSurrogate(text.charCodeAt(index - 1)) && isLowSurrogate(text.charCodeAt(index))
		? index - 1
		: index;
}

/** Last resort for a run of text with no usable separator (e.g. a base64 blob). */
function hardSlice(text: string, chunkSize: number): string[] {
	const slices: string[] = [];
	let start = 0;

	while (start < text.length) {
		// A `chunkSize` of 1 in front of a surrogate pair would make `safeIndex`
		// return `start`, so never let the window collapse.
		const end = Math.max(safeIndex(text, Math.min(start + chunkSize, text.length)), start + 1);
		slices.push(text.slice(start, end));
		start = end;
	}

	return slices;
}

/**
 * Packs text into chunks of at most `chunkSize`: split on the current
 * separator, greedily fill a chunk with whole units, and recurse into any unit
 * that is oversized on its own using the next weaker separator.
 */
function splitToSize(text: string, chunkSize: number, separatorIndex: number): string[] {
	if (text.length <= chunkSize) return text.length > 0 ? [text] : [];
	if (separatorIndex >= SEPARATORS.length) return hardSlice(text, chunkSize);

	const { split, keep } = SEPARATORS[separatorIndex];
	const parts = text.split(split);

	// The separator is absent: nothing gained here, move on to the next one.
	if (parts.length <= 1) return splitToSize(text, chunkSize, separatorIndex + 1);

	const units = parts.map((part, index) => (index < parts.length - 1 ? part + keep : part));
	// What is left of the separator once `keep` has been folded into the unit.
	const glue = split.slice(keep.length);

	const chunks: string[] = [];
	let buffer = '';
	const flush = () => {
		if (buffer !== '') chunks.push(buffer);
		buffer = '';
	};

	for (const unit of units) {
		// Runs of consecutive separators produce empty units.
		if (unit === '') continue;

		if (unit.length > chunkSize) {
			flush();
			chunks.push(...splitToSize(unit, chunkSize, separatorIndex + 1));
			continue;
		}

		const candidate = buffer === '' ? unit : buffer + glue + unit;

		if (candidate.length <= chunkSize) {
			buffer = candidate;
		} else {
			flush();
			buffer = unit;
		}
	}

	flush();

	return chunks;
}

/**
 * Tail of the previous chunk, cut back to a word boundary so an overlap never
 * starts mid-word. A window that contains no boundary at all is a single
 * partial word and is dropped rather than repeated as a fragment.
 */
function overlapPrefix(previous: string, chunkOverlap: number): string {
	if (chunkOverlap <= 0) return '';

	const start = safeIndex(previous, Math.max(previous.length - chunkOverlap, 0));
	let tail = previous.slice(start);

	// Only realign when the window opens inside a word — a window that already
	// starts right after whitespace is on a boundary.
	if (start > 0 && !/\s/.test(previous[start - 1])) {
		const firstBoundary = tail.search(/\s/);
		tail = firstBoundary === -1 ? '' : tail.slice(firstBoundary + 1);
	}

	return tail.trim();
}

/**
 * Splits `text` into overlapping chunks ready for embedding.
 *
 * Deterministic and dependency-free: the same input always yields the same
 * chunks, and no chunk is ever empty. Note that the overlap prefix is added
 * *after* packing, so a chunk can exceed `chunkSize` by up to `chunkOverlap`.
 */
export function chunkText(text: string, options: ChunkTextOptions): string[] {
	if (text.trim() === '') return [];

	const chunkSize = Math.max(1, Math.floor(options.chunkSize));
	// An overlap at or above the chunk size would repeat a whole chunk.
	const chunkOverlap = Math.min(Math.max(0, Math.floor(options.chunkOverlap)), chunkSize - 1);
	const maxChars = Math.max(0, Math.floor(options.maxChars));

	if (maxChars === 0) return [];

	const truncated =
		text.length > maxChars ? text.slice(0, Math.max(safeIndex(text, maxChars), 1)) : text;

	const chunks = splitToSize(truncated, chunkSize, 0)
		.map((chunk) => chunk.trim())
		.filter((chunk) => chunk !== '');

	return chunks.map((chunk, index) => {
		if (index === 0) return chunk;

		const prefix = overlapPrefix(chunks[index - 1], chunkOverlap);

		return prefix === '' ? chunk : `${prefix} ${chunk}`;
	});
}
