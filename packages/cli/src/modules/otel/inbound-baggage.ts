import type { Logger } from '@n8n/backend-common';

const RESERVED_KEY_PREFIX = 'n8n.';

// The limits the OpenTelemetry SDK applies, on the way in and on the way out, so n8n keeps
// to them as well: one webhook call feeds every request the execution sends, and the header
// is saved on the execution row. W3C sets only a minimum, 64 entries and 8192 bytes in
// total, and no limit for one entry. https://www.w3.org/TR/baggage/#limits
const MAX_ENTRIES = 180;
const MAX_ENTRY_BYTES = 4096;
const MAX_TOTAL_BYTES = 8192;

/**
 * Returns the caller's `baggage` header without `n8n.` entries, entries that reach no receiver
 * and entries past the W3C size limits.
 */
export function sanitizeInboundBaggage(header: unknown, logger: Logger): string | undefined {
	const raw = toHeaderString(header);
	if (!raw) return undefined;

	const kept: string[] = [];
	const dropped = { reservedPrefix: 0, invalid: 0, overLimit: 0 };
	let totalBytes = 0;

	for (const part of raw.split(',')) {
		const entry = part.trim();
		if (!entry) continue;

		const entryBytes = Buffer.byteLength(entry);
		if (entryBytes > MAX_ENTRY_BYTES) {
			dropped.overLimit++;
			continue;
		}

		const key = keyOf(entry);
		if (key === undefined) {
			dropped.invalid++;
			continue;
		}

		if (key.toLowerCase().startsWith(RESERVED_KEY_PREFIX)) {
			dropped.reservedPrefix++;
			continue;
		}

		const entryTotalBytes = entryBytes + (kept.length > 0 ? 1 : 0);
		if (kept.length >= MAX_ENTRIES || totalBytes + entryTotalBytes > MAX_TOTAL_BYTES) {
			dropped.overLimit++;
			continue;
		}

		kept.push(entry);
		totalBytes += entryTotalBytes;
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
 * Returns the key of a `key=value;property` entry, read as the receiving parser reads it: the
 * part before the first `;`, then the trimmed key and value around the first `=`, both
 * percent-decoded. Undefined when the receiver ignores the entry: the key or the value is empty,
 * or one of them does not decode.
 *
 * The key is decoded before the caller compares it, so `n8n%2Efoo` cannot hide the reserved
 * prefix that the receiver sees.
 */
function keyOf(entry: string): string | undefined {
	const [member] = entry.split(';', 1);
	const separator = member.indexOf('=');
	if (separator <= 0) return undefined;

	const rawKey = member.slice(0, separator).trim();
	const rawValue = member.slice(separator + 1).trim();
	if (!rawKey || !rawValue) return undefined;

	try {
		decodeURIComponent(rawValue);
		return decodeURIComponent(rawKey);
	} catch {
		return undefined;
	}
}

function toHeaderString(header: unknown): string | undefined {
	if (typeof header === 'string') return header;
	if (Array.isArray(header) && header.every((value) => typeof value === 'string')) {
		return header.join(',');
	}
	return undefined;
}
