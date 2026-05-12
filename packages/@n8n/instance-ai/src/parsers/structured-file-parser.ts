/**
 * Structured file parser for CSV, TSV, and JSON attachments.
 *
 * Security invariants:
 * - Decoded attachment size capped at MAX_DECODED_SIZE_BYTES
 * - Max columns capped at MAX_COLUMNS
 * - Max returned rows capped at MAX_ROWS_PER_CALL
 * - Output cells capped at MAX_CELLS_PER_CALL
 * - Serialized result chars capped at MAX_RESULT_CHARS
 * - Individual cell strings capped at MAX_CELL_STRING_LENGTH
 * - Dangerous keys (__proto__, constructor, prototype) are rejected
 */

import { parse as csvParse } from 'csv-parse/sync';

// ── Limits ──────────────────────────────────────────────────────────────────

export const MAX_DECODED_SIZE_BYTES = 512 * 1024; // 512 KB
export const MAX_COLUMNS = 50;
export const MAX_ROWS_PER_CALL = 100;
export const DEFAULT_MAX_ROWS = 20;
export const MAX_CELLS_PER_CALL = 2_000;
export const MAX_RESULT_CHARS = 40_000;
export const MAX_CELL_STRING_LENGTH = 5_000;
export const MAX_MANIFEST_ATTACHMENTS = 10;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RESERVED_COLUMN_NAMES = new Set(['id', 'created_at', 'updated_at']);

// ── Types ───────────────────────────────────────────────────────────────────

export type ParseableFormat = 'csv' | 'tsv' | 'json';

export interface ColumnMeta {
	originalName: string;
	name: string;
	inferredType: 'string' | 'number' | 'boolean' | 'date';
	index: number;
}

export type CellValue = string | number | boolean | null;

export interface ParseFileInput {
	attachmentIndex?: number;
	format?: ParseableFormat;
	hasHeader?: boolean;
	delimiter?: string;
	startRow?: number;
	maxRows?: number;
}

export interface ParseFileOutput {
	attachmentIndex: number;
	fileName: string;
	mimeType: string;
	format: ParseableFormat;
	columns: ColumnMeta[];
	rows: Array<Record<string, CellValue>>;
	totalRows: number;
	returnedRows: number;
	truncated: boolean;
	nextStartRow?: number;
	warnings?: string[];
}

export interface AttachmentInfo {
	data: string; // base64
	mimeType: string;
	fileName: string;
}

export interface ClassifiedAttachment {
	original: AttachmentInfo;
	index: number;
	parseable: boolean;
	format?: ParseableFormat;
	unavailableReason?: string;
}

// ── Format detection ────────────────────────────────────────────────────────

const EXTENSION_TO_FORMAT: Record<string, ParseableFormat> = {
	'.csv': 'csv',
	'.tsv': 'tsv',
	'.json': 'json',
};

const MIME_TO_FORMAT: Record<string, ParseableFormat> = {
	'text/csv': 'csv',
	'text/tab-separated-values': 'tsv',
	'application/json': 'json',
};

function getExtension(fileName: string): string {
	const lastDot = fileName.lastIndexOf('.');
	return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
}

export function detectFormat(
	fileName: string,
	mimeType: string,
	override?: ParseableFormat,
): ParseableFormat | undefined {
	if (override) return override;
	const ext = getExtension(fileName);
	if (ext in EXTENSION_TO_FORMAT) return EXTENSION_TO_FORMAT[ext];
	if (mimeType in MIME_TO_FORMAT) return MIME_TO_FORMAT[mimeType];
	return undefined;
}

// ── Column normalization ────────────────────────────────────────────────────

/**
 * Normalize a raw column name for data-table compatibility:
 * - trim, lowercase, convert to snake_case
 * - keep only letters/numbers/underscores
 * - prefix names that don't start with a letter
 * - deduplicate with numeric suffixes
 * - prefix reserved system names (id, createdAt, updatedAt)
 */
export function normalizeColumnNames(rawNames: string[]): string[] {
	const seen = new Map<string, number>();
	return rawNames.map((raw) => {
		let name = raw
			.trim()
			.replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase → snake
			.toLowerCase()
			.replace(/[^a-z0-9_]/g, '_') // non-alnum → underscore
			.replace(/_+/g, '_') // collapse consecutive underscores
			.replace(/^_|_$/g, ''); // trim leading/trailing underscores

		if (!name) name = 'column';
		if (!/^[a-z]/i.test(name)) name = `col_${name}`;
		if (RESERVED_COLUMN_NAMES.has(name)) name = `data_${name}`;

		const count = seen.get(name) ?? 0;
		seen.set(name, count + 1);
		if (count > 0) {
			let deduped = `${name}_${count}`;
			while (seen.has(deduped)) {
				deduped = `${deduped}_${seen.get(deduped)! + 1}`;
				seen.set(name, seen.get(name)! + 1);
			}
			name = deduped;
		}
		seen.set(name, 1);

		return name;
	});
}

// ── Type inference ──────────────────────────────────────────────────────────

const DATE_PATTERNS = [
	/^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, // ISO 8601 prefix
	/^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
];

function looksLikeDate(value: string): boolean {
	return DATE_PATTERNS.some((p) => p.test(value));
}

export function inferColumnType(values: CellValue[]): 'string' | 'number' | 'boolean' | 'date' {
	const nonNull = values.filter((v): v is string | number | boolean => v !== null && v !== '');
	if (nonNull.length === 0) return 'string';

	const allBoolean = nonNull.every(
		(v) => typeof v === 'boolean' || (typeof v === 'string' && /^(true|false)$/i.test(v)),
	);
	if (allBoolean) return 'boolean';

	const allNumeric = nonNull.every((v) => typeof v === 'number' || !isNaN(Number(v)));
	if (allNumeric) return 'number';

	const allDate = nonNull.every((v) => typeof v === 'string' && looksLikeDate(v));
	if (allDate) return 'date';

	return 'string';
}

// ── Parsing core ────────────────────────────────────────────────────────────

function validateCellValue(value: unknown, colIndex: number, rowIndex: number): CellValue {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') {
		if (!isFinite(value)) return null;
		return value;
	}
	if (typeof value === 'string') {
		if (value.length > MAX_CELL_STRING_LENGTH) {
			throw new Error(
				`Cell at row ${rowIndex}, column ${colIndex} exceeds max string length of ${MAX_CELL_STRING_LENGTH} characters`,
			);
		}
		return value;
	}
	// Arrays and objects are not allowed in flat rows
	throw new Error(
		`Unsupported value type "${typeof value}" at row ${rowIndex}, column ${colIndex}`,
	);
}

function hasDangerousKey(obj: Record<string, unknown>): string | undefined {
	for (const key of Object.keys(obj)) {
		if (DANGEROUS_KEYS.has(key)) return key;
	}
	return undefined;
}

function parseCsvTsv(
	content: string,
	format: 'csv' | 'tsv',
	options: { hasHeader: boolean; delimiter?: string },
): { rawHeaders: string[]; allRows: string[][] } {
	const delimiter = options.delimiter ?? (format === 'tsv' ? '\t' : ',');

	if (delimiter.length !== 1) {
		throw new Error('Delimiter must be a single character');
	}

	const records = csvParse(content, {
		delimiter,
		columns: false,
		skip_empty_lines: true,
		relax_column_count: true,
		trim: true,
	}) as string[][];

	if (records.length === 0) {
		return { rawHeaders: [], allRows: [] };
	}

	let rawHeaders: string[];
	let dataRows: string[][];

	if (options.hasHeader) {
		rawHeaders = records[0];
		dataRows = records.slice(1);
	} else {
		const colCount = records[0].length;
		rawHeaders = Array.from({ length: colCount }, (_, i) => `column_${i}`);
		dataRows = records;
	}

	// Check for dangerous keys in CSV/TSV headers (consistent with JSON validation)
	for (const header of rawHeaders) {
		if (DANGEROUS_KEYS.has(header.trim())) {
			throw new Error(`Dangerous column header "${header.trim()}" found in ${format} data`);
		}
	}

	return { rawHeaders, allRows: dataRows };
}

function parseJson(content: string): {
	rawHeaders: string[];
	allRows: Array<Record<string, unknown>>;
} {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error('Invalid JSON: failed to parse');
	}

	if (!Array.isArray(parsed)) {
		throw new Error('Expected a JSON array of objects, got a single value or object');
	}

	if (parsed.length === 0) {
		return { rawHeaders: [], allRows: [] };
	}

	// Collect all keys across all objects (preserving order of first appearance)
	const keySet = new Set<string>();
	for (const item of parsed) {
		if (typeof item !== 'object' || item === null || Array.isArray(item)) {
			throw new Error('JSON array items must be flat objects (not arrays, nulls, or primitives)');
		}
		const dangerousKey = hasDangerousKey(item as Record<string, unknown>);
		if (dangerousKey) {
			throw new Error(`Dangerous key "${dangerousKey}" found in JSON data`);
		}
		for (const key of Object.keys(item as Record<string, unknown>)) {
			keySet.add(key);
		}
	}

	const rawHeaders = [...keySet];

	// Validate all values are flat
	for (const item of parsed) {
		const obj = item as Record<string, unknown>;
		for (const [key, value] of Object.entries(obj)) {
			if (value !== null && typeof value === 'object') {
				throw new Error(
					`Nested ${Array.isArray(value) ? 'array' : 'object'} found at key "${key}". Only flat objects are supported.`,
				);
			}
		}
	}

	return { rawHeaders, allRows: parsed as Array<Record<string, unknown>> };
}

// ── Main parse function ─────────────────────────────────────────────────────

export function parseStructuredFile(
	attachment: AttachmentInfo,
	attachmentIndex: number,
	input: ParseFileInput,
): ParseFileOutput {
	// Decode base64
	let decoded: Buffer;
	try {
		decoded = Buffer.from(attachment.data, 'base64');
	} catch {
		throw new Error('Failed to decode base64 attachment data');
	}

	if (decoded.length > MAX_DECODED_SIZE_BYTES) {
		throw new Error(
			`Attachment exceeds maximum size of ${MAX_DECODED_SIZE_BYTES / 1024} KB (got ${Math.round(decoded.length / 1024)} KB)`,
		);
	}

	const content = decoded.toString('utf-8');
	const format = detectFormat(attachment.fileName, attachment.mimeType, input.format);
	if (!format) {
		throw new Error(
			`Unsupported format for "${attachment.fileName}" (${attachment.mimeType}). Supported: csv, tsv, json`,
		);
	}

	const hasHeader = input.hasHeader ?? true;
	const startRow = input.startRow ?? 0;
	const maxRows = Math.min(input.maxRows ?? DEFAULT_MAX_ROWS, MAX_ROWS_PER_CALL);
	const warnings: string[] = [];

	let columns: ColumnMeta[];
	let paginatedRows: Array<Record<string, CellValue>>;
	let totalRows: number;

	if (format === 'json') {
		const { rawHeaders, allRows } = parseJson(content);

		if (rawHeaders.length > MAX_COLUMNS) {
			throw new Error(`Too many columns: ${rawHeaders.length} (max ${MAX_COLUMNS})`);
		}

		const normalizedNames = normalizeColumnNames(rawHeaders);
		totalRows = allRows.length;
		const sliced = allRows.slice(startRow, startRow + maxRows);

		// Build columns with type inference from sliced sample
		columns = rawHeaders.map((raw, i) => ({
			originalName: raw,
			name: normalizedNames[i],
			inferredType: inferColumnType(
				sliced.map((row) => {
					const val = row[raw];
					return val === undefined ? null : (val as CellValue);
				}),
			),
			index: i,
		}));

		// Build output rows using normalized names
		paginatedRows = sliced.map((row, rowIdx) => {
			const out: Record<string, CellValue> = {};
			for (let i = 0; i < rawHeaders.length; i++) {
				const val = row[rawHeaders[i]];
				out[normalizedNames[i]] = validateCellValue(
					val === undefined ? null : val,
					i,
					startRow + rowIdx,
				);
			}
			return out;
		});
	} else {
		const { rawHeaders, allRows } = parseCsvTsv(content, format, {
			hasHeader,
			delimiter: input.delimiter,
		});

		if (rawHeaders.length > MAX_COLUMNS) {
			throw new Error(`Too many columns: ${rawHeaders.length} (max ${MAX_COLUMNS})`);
		}

		const normalizedNames = normalizeColumnNames(rawHeaders);
		totalRows = allRows.length;
		const sliced = allRows.slice(startRow, startRow + maxRows);

		// Build columns with type inference from sliced sample
		columns = rawHeaders.map((raw, i) => ({
			originalName: raw,
			name: normalizedNames[i],
			inferredType: inferColumnType(sliced.map((row) => row[i] ?? null)),
			index: i,
		}));

		// Build output rows using normalized names
		paginatedRows = sliced.map((row, rowIdx) => {
			const out: Record<string, CellValue> = {};
			for (let i = 0; i < rawHeaders.length; i++) {
				out[normalizedNames[i]] = validateCellValue(row[i] ?? null, i, startRow + rowIdx);
			}
			return out;
		});
	}

	// Enforce output budgets
	let truncated = false;
	let returnedRows = paginatedRows.length;
	const colCount = columns.length;

	// Cell budget
	if (returnedRows * colCount > MAX_CELLS_PER_CALL) {
		returnedRows = Math.floor(MAX_CELLS_PER_CALL / colCount);
		paginatedRows = paginatedRows.slice(0, returnedRows);
		truncated = true;
		warnings.push(
			`Output truncated to ${returnedRows} rows to stay within cell budget (${MAX_CELLS_PER_CALL} cells)`,
		);
	}

	// Char budget — check serialized size
	let serialized = JSON.stringify({ columns, rows: paginatedRows });
	if (serialized.length > MAX_RESULT_CHARS) {
		// Binary search for the right row count
		let lo = 1;
		let hi = returnedRows;
		while (lo < hi) {
			const mid = Math.floor((lo + hi + 1) / 2);
			const testSerialized = JSON.stringify({ columns, rows: paginatedRows.slice(0, mid) });
			if (testSerialized.length <= MAX_RESULT_CHARS) {
				lo = mid;
			} else {
				hi = mid - 1;
			}
		}
		returnedRows = lo;
		paginatedRows = paginatedRows.slice(0, returnedRows);
		truncated = true;
		serialized = JSON.stringify({ columns, rows: paginatedRows });
		warnings.push(
			`Output truncated to ${returnedRows} rows to stay within char budget (${MAX_RESULT_CHARS} chars)`,
		);
	}

	const hasMore = startRow + returnedRows < totalRows;

	return {
		attachmentIndex,
		fileName: attachment.fileName,
		mimeType: attachment.mimeType,
		format,
		columns,
		rows: paginatedRows,
		totalRows,
		returnedRows,
		truncated: truncated || hasMore,
		...(hasMore || truncated ? { nextStartRow: startRow + returnedRows } : {}),
		...(warnings.length > 0 ? { warnings } : {}),
	};
}

// ── Attachment classification ───────────────────────────────────────────────

export function classifyAttachments(attachments: AttachmentInfo[]): ClassifiedAttachment[] {
	return attachments.map((att, index) => {
		const format = detectFormat(att.fileName, att.mimeType);
		if (!format) {
			return { original: att, index, parseable: false };
		}

		// Estimate decoded size from base64 length to avoid decoding the full payload here.
		// The exact decode + size check happens later in parseStructuredFile.
		const estimatedDecodedSize = Math.ceil((att.data.length * 3) / 4);
		if (estimatedDecodedSize > MAX_DECODED_SIZE_BYTES) {
			return {
				original: att,
				index,
				parseable: false,
				format,
				unavailableReason: `File exceeds ${MAX_DECODED_SIZE_BYTES / 1024} KB limit (${Math.round(estimatedDecodedSize / 1024)} KB)`,
			};
		}

		return { original: att, index, parseable: true, format };
	});
}

// ── Manifest builder ────────────────────────────────────────────────────────

export function buildAttachmentManifest(classified: ClassifiedAttachment[]): string {
	const lines: string[] = ['[ATTACHMENTS]'];
	const shown = classified.slice(0, MAX_MANIFEST_ATTACHMENTS);

	for (const att of shown) {
		const status = att.parseable
			? `parseable via parse-file (format: ${att.format})`
			: att.unavailableReason
				? `not parseable: ${att.unavailableReason}`
				: 'not a supported structured format';
		// Escape user-controlled values to prevent prompt injection via crafted filenames/MIME types
		const safeFileName = att.original.fileName.replace(/[\n\r]/g, ' ').slice(0, 200);
		const safeMimeType = att.original.mimeType.replace(/[\n\r]/g, ' ').slice(0, 100);
		lines.push(`- [${att.index}] \`${safeFileName}\` (${safeMimeType}): ${status}`);
	}

	if (classified.length > MAX_MANIFEST_ATTACHMENTS) {
		lines.push(
			`- ... and ${classified.length - MAX_MANIFEST_ATTACHMENTS} more attachment(s) not shown`,
		);
	}

	lines.push('[/ATTACHMENTS]');
	return lines.join('\n');
}

/**
 * Returns true if the attachment has a structured format that should be
 * routed through parse-file instead of being sent as raw multimodal content.
 */
export function isStructuredAttachment(att: AttachmentInfo): boolean {
	return detectFormat(att.fileName, att.mimeType) !== undefined;
}
