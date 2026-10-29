function parseObject(text: string): Record<string, unknown> | null {
	try {
		const value: unknown = JSON.parse(text);
		return typeof value === 'object' && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

/**
 * Read the first JSON object in a model reply. Models wrap JSON in a code fence,
 * add a sentence before it, or add a note after it that has braces of its own,
 * so try each closing brace from the last one back.
 */
export function readJsonObject(text: string): Record<string, unknown> | null {
	const start = text.indexOf('{');
	if (start === -1) return null;
	for (let end = text.lastIndexOf('}'); end > start; end = text.lastIndexOf('}', end - 1)) {
		const value = parseObject(text.slice(start, end + 1));
		if (value) return value;
	}
	return null;
}

export function asString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
