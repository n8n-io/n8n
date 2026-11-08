import type { AgentSkill } from '../../types';

export type DiffCount = { added: number; removed: number };

/** A reference file that only one of the two versions has. */
export type FileStatus = 'added' | 'removed';

/** The change to one file in the file list. */
export type FileChange = DiffCount & { status?: FileStatus };

/** A piece of a changed line. `changed` marks the words that differ from the other side. */
export type DiffSegment = { text: string; changed: boolean };

export type DiffLine =
	| { type: 'equal'; text: string }
	| { type: 'removed' | 'added'; text: string; segments: DiffSegment[] };

/** One field of SKILL.md, or one reference file, as two versions have it. */
export type DiffSection = DiffCount & {
	/** `name`, `description`, `instructions`, or the path of a reference file. */
	key: string;
	lines: DiffLine[];
	/** Set for a reference file that only one version has. */
	status?: FileStatus;
};

/** The SKILL.md file, as the editor names it in the file list. */
export const SKILL_FILE = 'SKILL.md';

/**
 * The largest table the diff fills (about 16 MB). Two long texts with nothing in common
 * would need far more, so above it the changed part shows as removed and then added.
 */
const MAX_TABLE_CELLS = 4_000_000;

function toLines(text: string): string[] {
	// Empty text has no lines, so a new file counts only the lines it has.
	return text === '' ? [] : text.split('\n');
}

/**
 * The longest common subsequence of two lists, as pairs of indexes. The common head and
 * tail are matched first, so a small edit in a long text stays cheap.
 */
function commonPairs<T>(a: T[], b: T[]): Array<[number, number]> {
	let start = 0;
	while (start < a.length && start < b.length && a[start] === b[start]) start++;
	let endA = a.length;
	let endB = b.length;
	while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
		endA--;
		endB--;
	}
	const rows = endA - start;
	const cols = endB - start;
	const pairs: Array<[number, number]> = [];
	for (let i = 0; i < start; i++) pairs.push([i, i]);
	const tail = () => {
		for (let k = 0; endA + k < a.length; k++) pairs.push([endA + k, endB + k]);
		return pairs;
	};
	if (rows * cols > MAX_TABLE_CELLS) return tail();
	const table = Array.from({ length: rows + 1 }, () => new Uint32Array(cols + 1));
	for (let i = rows - 1; i >= 0; i--) {
		for (let j = cols - 1; j >= 0; j--) {
			table[i][j] =
				a[start + i] === b[start + j]
					? table[i + 1][j + 1] + 1
					: Math.max(table[i + 1][j], table[i][j + 1]);
		}
	}
	let i = 0;
	let j = 0;
	while (i < rows && j < cols) {
		if (a[start + i] === b[start + j]) {
			pairs.push([start + i, start + j]);
			i++;
			j++;
		} else if (table[i + 1][j] >= table[i][j + 1]) {
			i++;
		} else {
			j++;
		}
	}
	return tail();
}

/** Marks the words of `from` and `to` that the other side does not have. */
export function diffWords(from: string, to: string): { from: DiffSegment[]; to: DiffSegment[] } {
	// Words and the spaces between them, so joining the segments gives the text back.
	const a = from.split(/(\s+)/).filter(Boolean);
	const b = to.split(/(\s+)/).filter(Boolean);
	const pairs = commonPairs(a, b);
	const keptA = new Set(pairs.map(([i]) => i));
	const keptB = new Set(pairs.map(([, j]) => j));
	const segments = (tokens: string[], kept: Set<number>) =>
		tokens.map((text, index) => ({ text, changed: !kept.has(index) && text.trim() !== '' }));
	return { from: segments(a, keptA), to: segments(b, keptB) };
}

/** The lines of two texts as equal, removed and added lines, in reading order. */
export function diffLines(from: string, to: string): DiffLine[] {
	return diffText(from, to).lines;
}

function diffText(from: string, to: string): DiffCount & { lines: DiffLine[] } {
	const a = toLines(from);
	const b = toLines(to);
	const lines: DiffLine[] = [];
	const count: DiffCount = { added: 0, removed: 0 };
	let i = 0;
	let j = 0;
	const flush = (untilA: number, untilB: number) => {
		const removed = a.slice(i, untilA);
		const added = b.slice(j, untilB);
		count.removed += removed.length;
		count.added += added.length;
		// A removed line and the added line in the same place are one edit: mark its words.
		const words = removed.map((line, index) =>
			index < added.length ? diffWords(line, added[index]) : undefined,
		);
		removed.forEach((text, index) =>
			lines.push({
				type: 'removed',
				text,
				segments: words[index]?.from ?? [{ text, changed: true }],
			}),
		);
		added.forEach((text, index) =>
			lines.push({
				type: 'added',
				text,
				segments: words[index]?.to ?? [{ text, changed: true }],
			}),
		);
	};
	for (const [pairA, pairB] of commonPairs(a, b)) {
		flush(pairA, pairB);
		lines.push({ type: 'equal', text: a[pairA] });
		i = pairA + 1;
		j = pairB + 1;
	}
	flush(a.length, b.length);
	return { lines, ...count };
}

function section(key: string, from: string, to: string): DiffSection {
	return { key, ...diffText(from, to) };
}

/** The fields of SKILL.md and every reference file that either version has. */
export function diffSkills(from: AgentSkill, to: AgentSkill): DiffSection[] {
	const fromFiles = new Map((from.references ?? []).map((file) => [file.path, file.content]));
	const toFiles = new Map((to.references ?? []).map((file) => [file.path, file.content]));
	const paths = [...new Set([...fromFiles.keys(), ...toFiles.keys()])].sort();
	return [
		section('name', from.name, to.name),
		section('description', from.description, to.description),
		section('instructions', from.instructions, to.instructions),
		...paths.map((path) => ({
			...section(path, fromFiles.get(path) ?? '', toFiles.get(path) ?? ''),
			...fileStatus(fromFiles.has(path), toFiles.has(path)),
		})),
	];
}

function fileStatus(inFrom: boolean, inTo: boolean): { status?: FileStatus } {
	if (!inFrom) return { status: 'added' };
	if (!inTo) return { status: 'removed' };
	return {};
}

/** Lines added and removed in each file, keyed by path, for the file list. */
export function countsByFile(sections: DiffSection[]): Record<string, FileChange> {
	const counts: Record<string, FileChange> = { [SKILL_FILE]: { added: 0, removed: 0 } };
	for (const { key, added, removed, status } of sections) {
		const path =
			key === 'name' || key === 'description' || key === 'instructions' ? SKILL_FILE : key;
		const count = counts[path] ?? { added: 0, removed: 0 };
		counts[path] = {
			added: count.added + added,
			removed: count.removed + removed,
			...(status ? { status } : {}),
		};
	}
	return counts;
}
