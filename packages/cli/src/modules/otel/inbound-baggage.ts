import type { Logger } from '@n8n/backend-common';

const RESERVED_KEY_PREFIX = 'n8n.';

// The total the receiving parser accepts, counted the way it counts it. Past this point the
// parser stops reading, so n8n stops here instead: one webhook call feeds every request the
// execution sends, and the header is saved on the execution row.
// https://www.w3.org/TR/baggage/#limits
const MAX_TOTAL_BYTES = 8192;

/**
 * Returns the caller's `baggage` header without `n8n.` entries, entries that reach no receiver
 * and entries past the W3C total size.
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

		const key = keyOf(entry);
		if (key === undefined) {
			dropped.invalid++;
			continue;
		}

		if (key.toLowerCase().startsWith(RESERVED_KEY_PREFIX)) {
			dropped.reservedPrefix++;
			continue;
		}

		const entryBytes = Buffer.byteLength(entry) + (kept.length > 0 ? 1 : 0);
		if (totalBytes + entryBytes > MAX_TOTAL_BYTES) {
			dropped.overLimit++;
			continue;
		}

		kept.push(entry);
		totalBytes += entryBytes;
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
 * part before the first `;`, then before the first `=`, percent-decoded. Undefined when the
 * entry has no key, because the receiver then ignores the entry.
 *
 * The key is decoded before the caller compares it, so `n8n%2Efoo` cannot hide the reserved
 * prefix that the receiver sees.
 */
function keyOf(entry: string): string | undefined {
	const [member] = entry.split(';', 1);
	const separator = member.indexOf('=');
	if (separator <= 0) return undefined;

	try {
		return decodeURIComponent(member.slice(0, separator).trim());
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
