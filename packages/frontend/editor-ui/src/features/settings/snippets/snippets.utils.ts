export interface SnippetSignature {
	isFunction: boolean;
	args: Array<{ name: string }>;
}

/**
 * Best-effort signature extraction from a snippet source for autocomplete.
 * Snippets are single expressions, so a leading arrow/function pattern is
 * reliable enough; anything else is treated as a constant.
 */
export function parseSnippetSignature(source: string): SnippetSignature {
	const trimmed = source.trim().replace(/^async\s+/, '');

	const parenArrow = /^\(([^)]*)\)\s*=>/.exec(trimmed);
	const singleArgArrow = /^([A-Za-z_$][\w$]*)\s*=>/.exec(trimmed);
	const functionExpr = /^function\s*[\w$]*\s*\(([^)]*)\)/.exec(trimmed);

	const params = parenArrow?.[1] ?? functionExpr?.[1] ?? singleArgArrow?.[1];
	if (params === undefined) return { isFunction: false, args: [] };

	const args = params
		.split(',')
		.map((param) => param.replace(/=.*$/, '').trim())
		.filter(Boolean)
		.map((name) => ({ name }));

	return { isFunction: true, args };
}
