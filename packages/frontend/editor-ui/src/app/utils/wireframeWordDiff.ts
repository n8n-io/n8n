export type DiffPart = { kind: 'same' | 'added' | 'removed'; text: string };

/**
 * Wireframe: word-level diff (LCS). Good enough for short messages; a real
 * implementation would use a proper diff library.
 */
export function wordDiff(before: string, after: string): DiffPart[] {
	const a = before.split(/(\s+)/).filter((t) => t.length > 0);
	const b = after.split(/(\s+)/).filter((t) => t.length > 0);
	const n = a.length;
	const m = b.length;
	const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			table[i][j] =
				a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
		}
	}
	const parts: DiffPart[] = [];
	const push = (kind: DiffPart['kind'], text: string) => {
		const last = parts[parts.length - 1];
		if (last && last.kind === kind) last.text += text;
		else parts.push({ kind, text });
	};
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) {
			push('same', a[i]);
			i++;
			j++;
		} else if (table[i + 1][j] >= table[i][j + 1]) {
			push('removed', a[i]);
			i++;
		} else {
			push('added', b[j]);
			j++;
		}
	}
	while (i < n) push('removed', a[i++]);
	while (j < m) push('added', b[j++]);
	return parts;
}

/** Split text into plain and "made up" runs, given the literal strings to mark. */
export function markLiterals(
	text: string,
	literals: string[],
): Array<{ madeUp: boolean; text: string }> {
	if (literals.length === 0) return [{ madeUp: false, text }];
	const escaped = literals.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	const re = new RegExp(`(${escaped.join('|')})`, 'g');
	return text
		.split(re)
		.filter((t) => t.length > 0)
		.map((t) => ({ madeUp: literals.includes(t), text: t }));
}
