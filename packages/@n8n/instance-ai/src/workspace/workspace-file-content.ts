/** Ensure workspace text files end with a trailing newline. */
export function withTrailingNewline(content: string): string {
	return content.endsWith('\n') ? content : `${content}\n`;
}

/** Pretty-print JSON for workspace files (always ends with a newline). */
export function stringifyWorkspaceJson(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`;
}
