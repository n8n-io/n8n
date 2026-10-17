import type { NodeToolTrustedMetadata } from '@n8n/api-types';

/** The JSON value a fixed default can hold on the wire. */
export type FixedDefaultValue = Extract<
	NodeToolTrustedMetadata[string],
	{ mode: 'fixed' }
>['value'];

export type TrustedMetadataRowMode = 'fixed' | 'expression';

type Binding = NodeToolTrustedMetadata[string];

export type TrustedMetadataRow = {
	name: string;
	mode: TrustedMetadataRowMode;
	/** Text as typed: the display value for fixed mode, the `=…` expression for expression mode. */
	value: string;
	/** Stored binding of a row the user has not edited. It is kept as is on save. */
	original?: Binding;
};

/** Text that starts like a JSON object, array or string is parsed as JSON. */
function startsLikeJson(trimmed: string): boolean {
	return trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"');
}

/** Format a stored fixed binding for the text input. */
export function formatTrustedMetadataFixedValue(value: unknown): string {
	if (value === undefined) return '';
	if (value === null) return 'null';
	if (typeof value === 'string') {
		// A plain string that looks like JSON is quoted so it parses back to itself.
		return startsLikeJson(value.trim()) ? JSON.stringify(value) : value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

/**
 * Convert typed text into a fixed metadata value. Only text that starts with
 * `{`, `[` or `"` is parsed as JSON. Everything else (12345, null, true, large
 * integers) stays the exact string. Incomplete JSON stays raw while the user types.
 */
export function parseTrustedMetadataFixedValue(raw: string): FixedDefaultValue {
	const trimmed = raw.trim();
	if (!startsLikeJson(trimmed)) return raw;
	try {
		return JSON.parse(trimmed) as FixedDefaultValue;
	} catch {
		return raw;
	}
}

/** Error code for a default value that cannot be saved, or undefined. */
export function trustedMetadataValueError(row: TrustedMetadataRow): string | undefined {
	if (row.mode === 'expression') return undefined;
	const trimmed = row.value.trim();
	if (!startsLikeJson(trimmed)) return undefined;
	try {
		JSON.parse(trimmed);
		return undefined;
	} catch {
		return 'invalid-json';
	}
}

/** True when the row holds no default. */
export function isTrustedMetadataRowEmpty(row: TrustedMetadataRow): boolean {
	if (row.original) return false;
	return row.mode === 'expression' ? row.value.slice(1).trim() === '' : row.value.trim() === '';
}

/** Display row for a variable, from its stored default if any. */
export function trustedMetadataRowFromBinding(
	name: string,
	binding: Binding | undefined,
): TrustedMetadataRow {
	if (!binding) return { name, mode: 'fixed', value: '' };
	return binding.mode === 'fixed'
		? {
				name,
				mode: 'fixed',
				value: formatTrustedMetadataFixedValue(binding.value),
				original: binding,
			}
		: { name, mode: 'expression', value: binding.value, original: binding };
}

/** One row per detected variable. Stored defaults for other names are dropped. */
export function deriveTrustedMetadataRows(
	names: readonly string[],
	stored: NodeToolTrustedMetadata | undefined,
): TrustedMetadataRow[] {
	return names.map((name) => trustedMetadataRowFromBinding(name, stored?.[name]));
}

/** Convert rows to the wire format. Rows without a default are left out. */
export function trustedMetadataRowsToRecord(
	rows: TrustedMetadataRow[],
): NodeToolTrustedMetadata | undefined {
	const record: NodeToolTrustedMetadata = {};
	for (const row of rows) {
		if (isTrustedMetadataRowEmpty(row)) continue;
		record[row.name] =
			row.original ??
			(row.mode === 'expression'
				? { mode: 'expression', value: row.value }
				: { mode: 'fixed', value: parseTrustedMetadataFixedValue(row.value) });
	}
	return Object.keys(record).length ? record : undefined;
}
