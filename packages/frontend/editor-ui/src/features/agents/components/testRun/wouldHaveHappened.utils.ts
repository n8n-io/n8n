/** Returns the trimmed text, or `undefined` when it is missing or blank. */
export function presentText(value: string | undefined | null): string | undefined {
	if (typeof value !== 'string') return undefined;
	return value.trim().length > 0 ? value : undefined;
}

/** Drops missing and blank entries. */
export function presentList(values: Array<string | undefined | null> | undefined): string[] {
	if (!Array.isArray(values)) return [];
	return values
		.map((value) => (typeof value === 'string' ? value.trim() : ''))
		.filter((value) => value.length > 0);
}

/**
 * Formats any input value as plain text. Returns `undefined` for missing or
 * blank values, so the caller can omit them.
 */
/** JSON for display. Values JSON can't hold, such as bigints, show as strings. */
function safeJson(value: unknown, indent?: number): string | undefined {
	try {
		return JSON.stringify(
			value,
			(_key, item: unknown) => (typeof item === 'bigint' ? item.toString() : item),
			indent,
		);
	} catch {
		return undefined;
	}
}

export function formatPreviewValue(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string') return presentText(value);
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
		return String(value);
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
	}
	if (Array.isArray(value) && value.every((item) => typeof item !== 'object' || item === null)) {
		// An array holding nulls or blank strings shows as one-line JSON, so no position is lost.
		if (value.some((item) => item === null || (typeof item === 'string' && item.trim() === ''))) {
			return safeJson(value);
		}
		const items = value
			.map((item) => formatPreviewValue(item))
			.filter((item): item is string => item !== undefined);
		return items.length > 0 ? items.join(', ') : undefined;
	}
	if (typeof value === 'object' && Object.keys(value).length === 0) return undefined;
	return safeJson(value, 2);
}

export interface PreviewEntry {
	key: string;
	value: string;
}

/**
 * Input values that are set but empty, such as `null` or `''`. They can clear real data
 * (unassign an issue, blank a field), so they are shown rather than dropped.
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false;
	const proto: unknown = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

function formatExplicitEmpty(value: unknown): string | undefined {
	if (value === null) return 'null';
	if (typeof value === 'string' && value.trim().length === 0) return JSON.stringify(value);
	if (Array.isArray(value) && value.length === 0) return '[]';
	if (isPlainRecord(value) && Object.keys(value).length === 0) return '{}';
	return undefined;
}

/** Key/value pairs in input order. Only keys whose value is `undefined` are left out. */
export function previewEntries(record: Record<string, unknown> | undefined): PreviewEntry[] {
	if (!record || typeof record !== 'object') return [];
	return Object.entries(record).flatMap(([key, value]) => {
		if (value === undefined) return [];
		const formatted = formatExplicitEmpty(value) ?? formatPreviewValue(value);
		return formatted === undefined ? [] : [{ key, value: formatted }];
	});
}

const ISO_DATE_PATTERN =
	/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Formats an ISO 8601 date or date-time for the reader's locale. Shows any
 * other text unchanged.
 */
export function formatPreviewDate(value: string | undefined, locale?: string): string | undefined {
	const text = presentText(value)?.trim();
	if (!text || !ISO_DATE_PATTERN.test(text)) return text;

	// `new Date` rolls invalid days over (2026-02-30 becomes March 2), so check the parts first.
	const [year, month, day] = text.slice(0, 10).split('-').map(Number);
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
	if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return text;

	const date = new Date(text);
	if (Number.isNaN(date.getTime())) return text;

	const hasTime = text.length > 10;
	return new Intl.DateTimeFormat(
		locale,
		hasTime
			? // The zone name keeps times in a repeated daylight-saving hour apart.
				{
					year: 'numeric',
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit',
					timeZoneName: 'short',
				}
			: { dateStyle: 'medium', timeZone: 'UTC' },
	).format(date);
}

export interface ClampedText {
	text: string;
	clamped: boolean;
}

/** Shortens text to a number of lines and characters. */
export function clampText(text: string, maxChars: number, maxLines: number): ClampedText {
	const lines = text.split('\n');
	let result = lines.length > maxLines ? lines.slice(0, maxLines).join('\n') : text;
	if (result.length > maxChars) result = result.slice(0, maxChars);
	if (result.length === text.length) return { text, clamped: false };
	return { text: `${result.trimEnd()}…`, clamped: true };
}
