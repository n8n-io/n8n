import type { IncomingMessage } from 'http';

function parseHeaderParameters(parameters: string[]): Record<string, string> {
	return parameters.reduce(
		(acc, param) => {
			const eqIdx = param.indexOf('=');
			if (eqIdx === -1) return acc;
			const key = param.slice(0, eqIdx);
			let processedValue = param.slice(eqIdx + 1).trim();

			if (processedValue.startsWith('"') && processedValue.endsWith('"')) {
				// Quoted string: strip quotes first, then try to percent-decode.
				// Some non-standard servers percent-encode inside quoted strings
				// (e.g. filename="my%20file.pdf"). Per RFC 6266, quoted filename
				// values are plain strings but we decode as a best-effort fallback.
				// A bare % that isn't a valid percent-encoded sequence is kept as-is.
				processedValue = processedValue.slice(1, -1);
				try {
					processedValue = decodeURIComponent(processedValue);
				} catch {
					// Keep raw value — contains an invalid percent sequence (e.g. 75%.pdf)
				}
			} else {
				// Unquoted value: may be entirely percent-encoded, including the quotes
				// themselves (e.g. filename=%22test%20file.txt%22 → "test file.txt")
				try {
					processedValue = decodeURIComponent(processedValue);
					if (processedValue.startsWith('"') && processedValue.endsWith('"')) {
						processedValue = processedValue.slice(1, -1);
					}
				} catch {
					// Keep raw value
				}
			}

			acc[key.toLowerCase().trim()] = processedValue;
			return acc;
		},
		{} as Record<string, string>,
	);
}

interface IContentType {
	type: string;
	parameters: {
		charset: string;
		[key: string]: string;
	};
}

/**
 * Parses the Content-Type header string into a structured object
 * @returns {IContentType | null} Parsed content type details or null if no content type is detected
 */
export const parseContentType = (contentType?: string): IContentType | null => {
	if (!contentType) {
		return null;
	}

	const [type, ...parameters] = contentType.split(';');

	return {
		type: type.toLowerCase(),
		parameters: { charset: 'utf-8', ...parseHeaderParameters(parameters) },
	};
};

interface IContentDisposition {
	type: string;
	filename?: string;
}

/**
 * Parses the Content-Disposition header string into a structured object
 * @returns {IContentDisposition | null} Parsed content disposition details or null if no content disposition is detected
 */
export const parseContentDisposition = (
	contentDisposition?: string,
): IContentDisposition | null => {
	if (!contentDisposition) {
		return null;
	}

	// This is invalid syntax, but common
	// Example 'filename="example.png"' (instead of 'attachment; filename="example.png"')
	if (!contentDisposition.startsWith('attachment') && !contentDisposition.startsWith('inline')) {
		contentDisposition = `attachment; ${contentDisposition}`;
	}

	const [type, ...parameters] = contentDisposition.split(';');

	const parsedParameters = parseHeaderParameters(parameters);

	let { filename } = parsedParameters;
	const wildcard = parsedParameters['filename*'];
	if (wildcard) {
		// https://datatracker.ietf.org/doc/html/rfc5987
		const [_encoding, _locale, content] = wildcard?.split("'") ?? [];
		filename = content;
	}

	return { type, filename };
};

/**
 * Augments an IncomingMessage with parsed content type and disposition information
 */
export function parseIncomingMessage(message: IncomingMessage) {
	const contentType = parseContentType(message.headers['content-type']);
	if (contentType) {
		const { type, parameters } = contentType;
		message.contentType = type;
		message.encoding = parameters.charset.toLowerCase() as BufferEncoding;
	}

	const contentDisposition = parseContentDisposition(message.headers['content-disposition']);
	if (contentDisposition) {
		message.contentDisposition = contentDisposition;
	}
}
