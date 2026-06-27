/** Maps a JSON dot-path to a 1-based line number in pretty-printed JSON. */
export function findLineInNodeJson(content: string, jsonPath?: string): number | null {
	if (!jsonPath?.trim()) return null;

	const lines = content.split('\n');
	const lastKey = jsonPath.split('.').filter(Boolean).at(-1);
	if (!lastKey) return null;

	const keyPattern = new RegExp(`"${escapeRegExp(lastKey)}"\\s*:`);
	for (let i = 0; i < lines.length; i++) {
		if (keyPattern.test(lines[i])) return i + 1;
	}

	return null;
}

/** Infers a dot-path for a 1-based line in pretty-printed JSON (`JSON.stringify(_, null, 2)`). */
export function inferJsonPathAtLine(content: string, lineNumber: number): string | undefined {
	const lines = content.split('\n');
	const targetIndex = lineNumber - 1;
	if (targetIndex < 0 || targetIndex >= lines.length) return undefined;

	const stack: Array<{ indent: number; key: string }> = [];

	for (let i = 0; i <= targetIndex; i++) {
		const line = lines[i];
		const indent = line.match(/^\s*/)?.[0].length ?? 0;
		const keyMatch = line.match(/^\s*"([^"]+)"\s*:/);

		while (stack.length > 0 && stack.at(-1)!.indent >= indent) {
			stack.pop();
		}

		if (keyMatch) {
			stack.push({ indent, key: keyMatch[1] });
		}
	}

	if (stack.length === 0) return undefined;
	return stack.map((entry) => entry.key).join('.');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
