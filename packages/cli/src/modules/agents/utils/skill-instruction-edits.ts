export interface SkillInstructionEdit {
	oldText: string;
	newText: string;
}

export type SkillInstructionEditsResult =
	| { ok: true; instructions: string }
	| { ok: false; message: string };

interface Span {
	start: number;
	end: number;
}

const MIN_HINT_SIMILARITY = 0.5;
const MAX_HINT_LENGTH = 1500;

function findExactSpans(text: string, search: string): Span[] {
	const spans: Span[] = [];
	let index = text.indexOf(search);
	while (index !== -1) {
		spans.push({ start: index, end: index + search.length });
		index = text.indexOf(search, index + search.length);
	}
	return spans;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findWhitespaceInsensitiveSpans(text: string, search: string): Span[] {
	const chars = Array.from(search.replace(/\s+/g, ''));
	if (chars.length === 0) return [];
	const pattern = new RegExp(chars.map(escapeRegExp).join('\\s*'), 'g');
	return Array.from(text.matchAll(pattern), (match) => ({
		start: match.index,
		end: match.index + match[0].length,
	}));
}

function normalizeForSimilarity(value: string): string {
	return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function bigramCounts(value: string): Map<string, number> {
	const counts = new Map<string, number>();
	for (let i = 0; i < value.length - 1; i++) {
		const bigram = value.slice(i, i + 2);
		counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
	}
	return counts;
}

/** Sørensen–Dice coefficient over character bigrams: 1 for equal strings, 0 for no overlap. */
function similarity(target: Map<string, number>, targetSize: number, candidate: string): number {
	const counts = bigramCounts(candidate);
	const candidateSize = Math.max(candidate.length - 1, 0);
	if (targetSize + candidateSize === 0) return 0;
	let shared = 0;
	for (const [bigram, count] of counts) {
		shared += Math.min(count, target.get(bigram) ?? 0);
	}
	return (2 * shared) / (targetSize + candidateSize);
}

function findClosestSpan(text: string, search: string): Span | undefined {
	const target = normalizeForSimilarity(search);
	if (target.length < 2) return undefined;
	const targetCounts = bigramCounts(target);
	const targetSize = target.length - 1;

	const words = Array.from(text.matchAll(/\S+/g), (match) => ({
		start: match.index,
		end: match.index + match[0].length,
	}));
	if (words.length === 0) return undefined;

	const searchWordCount = Math.max(target.split(' ').length, 1);
	const delta = Math.max(1, Math.round(searchWordCount * 0.2));
	const sizes = [searchWordCount - delta, searchWordCount, searchWordCount + delta].filter(
		(size) => size >= 1 && size <= words.length,
	);
	if (sizes.length === 0) sizes.push(words.length);

	const scoreWindow = (startWord: number, size: number) => {
		const endWord = startWord + size - 1;
		if (startWord < 0 || endWord >= words.length) return undefined;
		const span = { start: words[startWord].start, end: words[endWord].end };
		const score = similarity(
			targetCounts,
			targetSize,
			normalizeForSimilarity(text.slice(span.start, span.end)),
		);
		return { span, score, startWord };
	};

	type Scored = NonNullable<ReturnType<typeof scoreWindow>>;
	const pickBetter = (current: Scored | undefined, candidate: Scored | undefined) =>
		candidate && (!current || candidate.score > current.score) ? candidate : current;

	const stride = Math.max(1, Math.floor(searchWordCount / 8));
	let best: Scored | undefined;
	for (const size of sizes) {
		for (let startWord = 0; startWord + size <= words.length; startWord += stride) {
			best = pickBetter(best, scoreWindow(startWord, size));
		}
	}
	if (stride > 1 && best) {
		const coarseStart = best.startWord;
		for (const size of sizes) {
			for (let offset = -stride; offset <= stride; offset++) {
				best = pickBetter(best, scoreWindow(coarseStart + offset, size));
			}
		}
	}

	return best && best.score >= MIN_HINT_SIMILARITY ? best.span : undefined;
}

function describeClosestText(text: string, search: string): string {
	const span = findClosestSpan(text, search);
	if (!span) {
		return ' No similar text was found. Read the skill with agent-context and copy oldText from it.';
	}
	let closest = text.slice(span.start, span.end);
	if (closest.length > MAX_HINT_LENGTH) closest = `${closest.slice(0, MAX_HINT_LENGTH)}…`;
	// JSON quoting shows whitespace and line breaks exactly as the model must send them.
	return ` The closest text is ${JSON.stringify(closest)}. Use that exact text as oldText if it is the intended target.`;
}

export function applySkillInstructionEdits(
	instructions: string,
	edits: SkillInstructionEdit[],
): SkillInstructionEditsResult {
	let result = instructions;
	for (const [index, { oldText, newText }] of edits.entries()) {
		const label = `instructionEdits[${index}]`;
		const textScope =
			index === 0 ? 'the current instructions' : 'the instructions after the earlier edits';

		const exact = findExactSpans(result, oldText);
		const spans = exact.length > 0 ? exact : findWhitespaceInsensitiveSpans(result, oldText);

		if (spans.length === 0) {
			return {
				ok: false,
				message:
					`${label}: oldText was not found in ${textScope}, even with whitespace ignored. ` +
					`No edits were saved.${describeClosestText(result, oldText)}`,
			};
		}
		if (spans.length > 1) {
			return {
				ok: false,
				message:
					`${label}: oldText matches ${spans.length} places in ${textScope}. ` +
					'Add surrounding text so it matches exactly one place. No edits were saved.',
			};
		}

		const [{ start, end }] = spans;
		result = result.slice(0, start) + newText + result.slice(end);
	}
	return { ok: true, instructions: result };
}
