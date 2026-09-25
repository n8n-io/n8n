import type { BodyMediaType } from '@n8n/decorators';

import { UnsupportedMediaTypeError } from '@/errors/response-errors/unsupported-media-type.error';

/**
 * The media type, plus the string the legacy validator reports: lower-cased, parameters sorted by
 * name, `boundary` left out.
 */
function readMediaType(header: string): { mediaType: string; reported: string } {
	const [rawMediaType, ...parameterParts] = header.split(';');
	const mediaType = rawMediaType.trim().toLowerCase();
	const parameters = new Map<string, string>();

	for (const part of parameterParts) {
		const separator = part.indexOf('=');
		if (separator === -1) continue;

		const name = part.slice(0, separator).trim().toLowerCase();
		if (name === 'boundary') continue;

		const value = part.slice(separator + 1);
		parameters.set(name, name === 'charset' ? value.toLowerCase() : value);
	}

	const reported = [...parameters.entries()]
		.sort(([a], [b]) => (a < b ? -1 : 1))
		.reduce((out, [name, value]) => `${out}; ${name}=${value}`, mediaType);

	return { mediaType, reported };
}

/**
 * The legacy validator accepted only one media type per route (JSON, or multipart for an upload
 * route). It reported a header that names no media type — absent, empty, or whitespace — as the
 * literal `undefined`, and rejected it only when the body was required. Migrated routes keep both
 * behaviours and the messages that came with them, for either expected media type.
 */
export function assertRequestContentType(
	header: string | undefined,
	expectedMediaType: BodyMediaType,
	bodyRequired: boolean,
): void {
	const { mediaType, reported } = readMediaType(header ?? '');

	if (mediaType === '') {
		if (bodyRequired) throw new UnsupportedMediaTypeError('unsupported media type undefined');
		return;
	}

	if (mediaType !== expectedMediaType) {
		throw new UnsupportedMediaTypeError(`unsupported media type ${reported}`);
	}
}
