/** Above this length, a tool data block shows a cut-off copy so the highlighter does not freeze the browser. */
export const MAX_TOOL_DATA_DISPLAY_LENGTH = 100_000;

export interface FormattedToolData {
	/** The full text, for copy and download. */
	text: string;
	/** `json` when the text is JSON, otherwise `plaintext`. */
	language: 'json' | 'plaintext';
}

/**
 * Formats a tool input or output for display. Values and JSON strings become
 * pretty-printed JSON. Other strings, such as shell output, stay as they are.
 */
export function formatToolData(value: unknown): FormattedToolData {
	if (typeof value === 'string') {
		try {
			const parsed: unknown = JSON.parse(value);
			if (parsed !== null && typeof parsed === 'object') {
				return { text: JSON.stringify(parsed, null, 2), language: 'json' };
			}
		} catch {
			// Not JSON: show the string as it is.
		}
		return { text: value, language: 'plaintext' };
	}

	const json = JSON.stringify(value, null, 2);
	if (json === undefined) return { text: String(value), language: 'plaintext' };
	return { text: json, language: 'json' };
}
