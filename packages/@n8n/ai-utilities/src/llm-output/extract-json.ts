const FENCED_BLOCK = /```(?:json)?\s*\n?([\s\S]*?)```/i;

export function extractFencedJson(text: string): string | undefined {
	return FENCED_BLOCK.exec(text)?.[1].trim();
}

export function extractJsonCandidate(text: string): string {
	// Trust a fenced block only when it is JSON-shaped: backtick pairs inside a
	// JSON payload's string values would otherwise shadow the payload itself.
	const fenced = extractFencedJson(text);
	if (fenced !== undefined && (fenced.startsWith('{') || fenced.startsWith('['))) return fenced;

	const trimmed = text.trim();
	const start = trimmed.indexOf('{');
	const end = trimmed.lastIndexOf('}');
	return start !== -1 && end >= start ? trimmed.slice(start, end + 1) : trimmed;
}
