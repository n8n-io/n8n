import type { OperatorLogRecord } from '@n8n/api-types';

import type { OperatorConsoleEntry } from './operatorConsole.types';

/**
 * Per-host gutter colours, the way `stern` prefixes pods. Deliberately a fixed
 * palette of design-system tokens rather than a generated hue: a handful of
 * hosts is the common case, and tokens keep light/dark handled for us.
 */
export const HOST_COLOR_TOKENS = [
	'--color--blue-500',
	'--color--green-500',
	'--color--purple-500',
	'--color--orange-500',
	'--color--pink-500',
	'--color--gold-500',
] as const;

/**
 * Stable colour per host id. A hash (not insertion order) so a host keeps its
 * colour across reloads and across the moment it first appears in the stream.
 */
export function hostColorToken(hostId: string): string {
	let hash = 0;
	for (let i = 0; i < hostId.length; i++) {
		hash = (hash * 31 + hostId.charCodeAt(i)) | 0;
	}
	return HOST_COLOR_TOKENS[Math.abs(hash) % HOST_COLOR_TOKENS.length];
}

/** `2024-05-04T09:12:33.482Z` -> `09:12:33.482`, falling back to the raw value. */
export function formatLogTime(ts: string): string {
	const parsed = new Date(ts);
	if (Number.isNaN(parsed.getTime())) return ts;

	const time = parsed.toTimeString().slice(0, 8);
	return `${time}.${String(parsed.getMilliseconds()).padStart(3, '0')}`;
}

/** Short host label for the gutter — full id stays available in the row tooltip. */
export function shortHostId(hostId: string): string {
	const trimmed = hostId.trim();
	return trimmed.length <= 12 ? trimmed : `${trimmed.slice(0, 11)}…`;
}

export function recordsFromEntries(entries: OperatorConsoleEntry[]): OperatorLogRecord[] {
	return entries.filter((entry) => entry.kind === 'record').map((entry) => entry.record);
}

export function toJsonl(records: OperatorLogRecord[]): string {
	return records.map((record) => JSON.stringify(record)).join('\n');
}

export function downloadTextFile(content: string, filename: string, mimeType: string): void {
	const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = 'none';
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}
