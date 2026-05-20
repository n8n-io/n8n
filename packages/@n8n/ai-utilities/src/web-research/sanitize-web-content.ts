/** Strip HTML comments: <!-- ... --> */
function stripHtmlComments(text: string): string {
	return text.replace(/<!--[\s\S]*?-->/g, '');
}

const INVISIBLE_UNICODE_PATTERN =
	// eslint-disable-next-line no-misleading-character-class
	/[\u200B-\u200F\u2028-\u202F\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB\u00AD\u034F\u061C\u180E\u{E0001}\u{E0020}-\u{E007F}]/gu;

function stripInvisibleUnicode(text: string): string {
	return text.replace(INVISIBLE_UNICODE_PATTERN, '');
}

export function sanitizeWebContent(content: string): string {
	return stripInvisibleUnicode(stripHtmlComments(content));
}

export function wrapUntrustedData(content: string, source: string, label?: string): string {
	const safeSource = source
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	const safeLabel = label
		? ` label="${label.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"`
		: '';
	const safeContent = content.replace(/<\/untrusted_data/gi, '&lt;/untrusted_data');
	return `<untrusted_data source="${safeSource}"${safeLabel}>\n${safeContent}\n</untrusted_data>`;
}
