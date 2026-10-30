import type { Logger } from '@n8n/backend-common';

const RESERVED_KEY_PREFIX = 'n8n.';
const MAX_ENTRIES = 180;
const MAX_ENTRY_BYTES = 4096;
const MAX_TOTAL_BYTES = 8192;

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
