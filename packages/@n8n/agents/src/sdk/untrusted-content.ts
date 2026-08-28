/**
 * Remove invisible Unicode characters that can hide content inside otherwise
 * innocuous text. Normal whitespace and common formatting are preserved.
 */
const INVISIBLE_UNICODE_PATTERN =
	// eslint-disable-next-line no-misleading-character-class
	/[\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB\u00AD\u034F\u061C\u180E\u{E0001}\u{E0020}-\u{E007F}]/gu;

export function stripInvisibleUnicode(text: string): string {
	return text.replace(INVISIBLE_UNICODE_PATTERN, '');
}

function escapeAttribute(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/** Mark externally sourced text as reference data for the model. */
export function wrapUntrustedData(content: string, source: string, label?: string): string {
	const safeSource = escapeAttribute(source);
	const safeLabel = label ? ` label="${escapeAttribute(label)}"` : '';
	const safeContent = content.replace(/<\/untrusted_data/gi, '&lt;/untrusted_data');
	return `<untrusted_data source="${safeSource}"${safeLabel}>\n${safeContent}\n</untrusted_data>`;
}
