/**
 * Escapes curly braces in user-provided text to prevent LangChain's template
 * parser from interpreting them as template variables.
 *
 * LangChain's `fromTemplate()` uses f-string syntax where `{variable}` denotes
 * a template variable. When user text contains JSON-like structures
 * (e.g. `{"name": "John"}`), the parser misinterprets the braces as variable
 * references, causing runtime errors.
 *
 * This function doubles all curly braces (`{` → `{{`, `}` → `}}`), which is
 * LangChain's escape syntax for literal braces. It optionally preserves
 * specific template variable names that should remain interpolatable.
 *
 * @param text - The user-provided text that may contain curly braces
 * @param preserveVariables - Template variable names to keep unescaped (e.g. `['categories']`)
 * @returns The text with curly braces escaped, except for preserved variables
 */
export function escapeLangChainTemplateVars(
	text: string,
	preserveVariables: string[] = [],
): string {
	// Escape all curly braces by doubling them
	let escaped = text.replace(/\{/g, '{{').replace(/\}/g, '}}');

	// Restore any preserved template variables
	for (const varName of preserveVariables) {
		escaped = escaped.replaceAll(`{{${varName}}}`, `{${varName}}`);
	}

	return escaped;
}
