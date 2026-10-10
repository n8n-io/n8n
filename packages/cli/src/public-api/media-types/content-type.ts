import type { RequestBodyMediaType } from '@n8n/decorators';
import { UnsupportedMediaTypeError } from '@n8n/errors';

/**
 * The media type, plus the string the legacy validator reports: lower-cased, parameters sorted by
 * name, `boundary` left out.
 */
function readMediaType(header: string): { mediaType: string; reported: string } {
	const [rawMediaType, ...parameterParts] = header.split(';');
	const mediaType = rawMediaType.trim().toLowerCase();
	const parameters = new Map<string, string>();

	// Parameter sorting and returning of the reported string is kept only for parity with the
	// EOV handler — we may be able to remove and simplify this method in future.
	for (const part of parameterParts) {
		const separator = part.indexOf('=');
		if (separator === -1) {
			continue;
		}

		const name = part.slice(0, separator).trim().toLowerCase();
		if (name === 'boundary') {
			continue;
		}

		const value = part.slice(separator + 1);
		parameters.set(name, name === 'charset' ? value.toLowerCase() : value);
	}

	const reported = [...parameters.entries()]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.reduce((out, [name, value]) => `${out}; ${name}=${value}`, mediaType);

	return { mediaType, reported };
}

/**
 * Check a request's `Content-Type` against the media type `@Body` declares.
 */
export function assertContentType({
	header,
	expected,
	bodyRequired,
}: {
	header: string | undefined;
	expected: RequestBodyMediaType;
	bodyRequired: boolean;
}): boolean {
	const { mediaType, reported } = readMediaType(header ?? '');

	if (mediaType === '') {
		if (bodyRequired) {
			throw new UnsupportedMediaTypeError('unsupported media type undefined');
		}
		return false;
	}

	if (mediaType !== expected) {
		throw new UnsupportedMediaTypeError(`unsupported media type ${reported}`);
	}

	return true;
}
