import type { NodeToolTrustedMetadata } from '@n8n/api-types';

export type TrustedMetadataRowMode = 'fixed' | 'expression';

export type TrustedMetadataRow = {
	name: string;
	mode: TrustedMetadataRowMode;
	/** Text as typed: the display value for fixed mode, the `=…` expression for expression mode. */
	value: string;
};

/** Charset mirrors the backend `TrustedMetadataKeySchema` and the `$fromAI` key rules. */
const NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const RESERVED_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
const NAME_MAX_LENGTH = 64;

/** A name is valid when the backend schema accepts it as a metadata key. */
export function isValidTrustedMetadataName(name: string): boolean {
	if (name.length === 0 || name.length > NAME_MAX_LENGTH) return false;
	if (!NAME_PATTERN.test(name)) return false;
	return !RESERVED_NAMES.has(name);
}

/** Error code for one metadata row's name, or undefined when acceptable. */
export function trustedMetadataNameError(row: TrustedMetadataRow): string | undefined {
	const name = row.name.trim();
	if (name === '') return 'required';
	if (name.length > NAME_MAX_LENGTH || !NAME_PATTERN.test(name)) return 'invalid';
	if (RESERVED_NAMES.has(name)) return 'reserved';
	return undefined;
}

/** Format a stored fixed binding for the text input. */
export function formatTrustedMetadataFixedValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/**
 * Convert typed text into a fixed metadata value. Raw text stays a string when
 * it is not JSON, so common pinned values (an ID, a domain) need no quoting.
 * Incomplete JSON stays as the raw string so the user can keep typing.
 */
export function parseTrustedMetadataFixedValue(raw: string): unknown {
	const trimmed = raw.trim();
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		return raw;
	}
}

/**
 * Mirror of the backend expression check: `=` followed by a non-empty
 * expression. An empty expression fails schema validation at save.
 */
export function trustedMetadataValueError(row: TrustedMetadataRow): string | undefined {
	if (row.mode === 'expression') {
		return row.value.slice(1).trim() ? undefined : 'empty';
	}
	const trimmed = row.value.trim();
	const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
	if (!looksLikeJson) return undefined;
	try {
		JSON.parse(trimmed);
		return undefined;
	} catch {
		return 'invalid-json';
	}
}

/** Convert row state to the wire format the backend schema validates. */
export function trustedMetadataRowsToRecord(
	rows: TrustedMetadataRow[],
): NodeToolTrustedMetadata | undefined {
	const record: NodeToolTrustedMetadata = {};
	for (const row of rows) {
		const name = row.name.trim();
		if (name === '') continue;
		record[name] =
			row.mode === 'expression'
				? { mode: 'expression', value: row.value }
				: { mode: 'fixed', value: parseTrustedMetadataFixedValue(row.value) };
	}
	return Object.keys(record).length ? record : undefined;
}
