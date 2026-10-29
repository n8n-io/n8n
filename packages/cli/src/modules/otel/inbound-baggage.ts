import type { Logger } from '@n8n/backend-common';

const RESERVED_KEY_PREFIX = 'n8n.';

// W3C Baggage limits: https://www.w3.org/TR/baggage/#limits
const MAX_ENTRIES = 180;
const MAX_ENTRY_BYTES = 4096;
const MAX_TOTAL_BYTES = 8192;

// W3C Baggage grammar: `key` is an RFC 7230 token, `value` is `*baggage-octet`.
const KEY = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const VALUE = /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]*$/;

/**
 * Returns the caller's `baggage` header without `n8n.` entries, invalid entries and
 * entries over the W3C limits. Kept entries keep their bytes, so a valid header does not grow.
 */
export function sanitizeInboundBaggage(header: unknown, logger: Logger): string | undefined {
	const raw = toHeaderString(header);
	if (!raw) return undefined;

	const kept: string[] = [];
	const dropped = { reservedPrefix: 0, invalid: 0, overLimit: 0 };
	let totalBytes = 0;

	for (const part of raw.split(',')) {
		const trimmed = part.trim();
		if (!trimmed) continue;

		const parsed = parseEntry(trimmed);
		if (parsed === undefined) {
			dropped.invalid++;
			continue;
		}

		const { key, entry } = parsed;
		if (key.toLowerCase().startsWith(RESERVED_KEY_PREFIX)) {
			dropped.reservedPrefix++;
			continue;
		}

		const entryBytes = Buffer.byteLength(entry);
		const addedBytes = entryBytes + (kept.length > 0 ? 1 : 0);
		if (
			kept.length >= MAX_ENTRIES ||
			entryBytes > MAX_ENTRY_BYTES ||
			totalBytes + addedBytes > MAX_TOTAL_BYTES
		) {
			dropped.overLimit++;
			continue;
		}

		kept.push(entry);
		totalBytes += addedBytes;
	}

	if (dropped.reservedPrefix + dropped.invalid + dropped.overLimit > 0) {
		logger.warn('Dropped entries from the inbound baggage header', {
			kept: kept.length,
			...dropped,
		});
	}

	return kept.length > 0 ? kept.join(',') : undefined;
}

/**
 * Returns the key of a `key=value;property` entry, with the entry to forward. Undefined when
 * the entry is not valid.
 */
function parseEntry(entry: string): { key: string; entry: string } | undefined {
	const [member, ...properties] = entry.split(';');
	const separator = member.indexOf('=');
	if (separator === -1) return undefined;

	const key = member.slice(0, separator).trim();
	const value = member.slice(separator + 1).trim();
	if (!KEY.test(key) || !VALUE.test(value)) return undefined;

	// A trailing or doubled `;` leaves an empty segment. W3C forbids it, but the OTel parser
	// keeps the entry, so n8n drops the segment instead of a good entry. Rebuilding is safe
	// here: it only ever removes the empty segments.
	const named = properties.filter((property) => property.trim() !== '');
	if (!named.every(isValidProperty)) return undefined;

	return {
		key,
		entry: named.length === properties.length ? entry : [member, ...named].join(';'),
	};
}

/** A `property` is a bare `key`, or `key=value` with a baggage value. */
function isValidProperty(property: string): boolean {
	const separator = property.indexOf('=');
	if (separator === -1) return KEY.test(property.trim());

	return (
		KEY.test(property.slice(0, separator).trim()) &&
		VALUE.test(property.slice(separator + 1).trim())
	);
}

function toHeaderString(header: unknown): string | undefined {
	if (typeof header === 'string') return header;
	if (Array.isArray(header) && header.every((value) => typeof value === 'string')) {
		return header.join(',');
	}
	return undefined;
}
