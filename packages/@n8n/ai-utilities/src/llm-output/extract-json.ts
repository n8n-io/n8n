const FENCED_BLOCK = /```(?:json)?\s*\n?([\s\S]*?)```/i;

export function extractFencedJson(text: string): string | undefined {
	return FENCED_BLOCK.exec(text)?.[1].trim();
}

export function extractJsonCandidate(text: string): string {
	const fenced = extractFencedJson(text);
	if (fenced !== undefined) return fenced;

	const trimmed = text.trim();
	const start = trimmed.indexOf('{');
	const end = trimmed.lastIndexOf('}');
	return start !== -1 && end >= start ? trimmed.slice(start, end + 1) : trimmed;
}
