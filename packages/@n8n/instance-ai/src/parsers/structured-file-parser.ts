import { isRecord } from '@n8n/utils/is-record';
import type { parse as csvParse } from 'csv-parse/sync';

/**
 * Structured file parser for CSV, TSV, and JSON attachments.
 *
 * Security invariants:
 * - Decoded attachment size capped at MAX_DECODED_SIZE_BYTES
 * - Max columns capped at MAX_COLUMNS
 * - Max returned rows capped at MAX_ROWS_PER_CALL
 * - Output cells capped at MAX_CELLS_PER_CALL
 * - Tabular output serialized chars capped at MAX_RESULT_CHARS
 * - Paginated text and non-tabular JSON pages capped at MAX_RESULT_CHARS raw chars
 * - Individual cell strings capped at MAX_CELL_STRING_LENGTH
 * - Dangerous keys (__proto__, constructor, prototype) are rejected
 */

type CsvParseFn = typeof csvParse;
let csvParseFnCached: CsvParseFn | undefined;
function getCsvParse(): CsvParseFn {
	if (!csvParseFnCached) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('csv-parse/sync') as { parse: CsvParseFn };
		csvParseFnCached = mod.parse;
	}
	return csvParseFnCached;
}

// ── Limits ──────────────────────────────────────────────────────────────────

export const MAX_DECODED_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatMB(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSizeLimitMessage(
	actualBytes: number,
	label: string = 'maximum size',
): string {
	return `Attachment exceeds ${label} of ${formatMB(MAX_DECODED_SIZE_BYTES)} (got ${formatMB(actualBytes)})`;
}
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

/** Tabular formats produce row+column output via parse-file. */
export type TabularFormat = ParseableFormat | 'xlsx';

/** Text-like formats produce a single text/markdown body (extracted from rich source). */
export type TextLikeFormat = 'text' | 'markdown' | 'html' | 'pdf' | 'docx';

/** Every format we know how to extract content from. */
export type SupportedFormat = TabularFormat | TextLikeFormat;

/** Formats handled by the existing CSV/TSV/JSON pipeline in parseStructuredFile. */
function isLegacyTabularFormat(format: SupportedFormat): format is ParseableFormat {
	return format === 'csv' || format === 'tsv' || format === 'json';
}

export interface ColumnMeta {
	originalName: string;
	name: string;
	inferredType: 'string' | 'number' | 'boolean' | 'date';
	index: number;
}

export type CellValue = string | number | boolean | null;

export interface TextPaginationOptions {
	startChar?: number;
	maxChars?: number;
}

export interface TextPaginationResult {
	content: string;
	totalChars: number;
	truncated: boolean;
	nextStartChar?: number;
}

export interface ParseFileInput {
	attachmentIndex?: number;
	format?: SupportedFormat;
	hasHeader?: boolean;
	delimiter?: string;
	startRow?: number;
	maxRows?: number;
	startChar?: number;
	maxChars?: number;
}

export interface ParseFileOutput {
	attachmentIndex: number;
	fileName: string;
	mimeType: string;
	format: SupportedFormat;
	columns: ColumnMeta[];
	rows: Array<Record<string, CellValue>>;
	totalRows: number;
	returnedRows: number;
	truncated: boolean;
	nextStartRow?: number;
	warnings?: string[];
	content?: string;
	totalChars?: number;
	nextStartChar?: number;
	title?: string;
	pages?: number;
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
	format?: SupportedFormat;
	unavailableReason?: string;
}

// ── Format detection ────────────────────────────────────────────────────────

const EXTENSION_TO_FORMAT: Record<string, SupportedFormat> = {
	'.csv': 'csv',
	'.tsv': 'tsv',
	'.json': 'json',
	'.xlsx': 'xlsx',
	'.txt': 'text',
	'.md': 'markdown',
	'.markdown': 'markdown',
	'.html': 'html',
	'.htm': 'html',
	'.pdf': 'pdf',
	'.docx': 'docx',
};

const MIME_TO_FORMAT: Record<string, SupportedFormat> = {
	'text/csv': 'csv',
	'application/csv': 'csv',
	'text/tab-separated-values': 'tsv',
	'application/json': 'json',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
	'text/plain': 'text',
	'text/markdown': 'markdown',
	'text/x-markdown': 'markdown',
	'text/html': 'html',
	'application/xhtml+xml': 'html',
	'application/pdf': 'pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

function getExtension(fileName: string): string {
	const lastDot = fileName.lastIndexOf('.');
	return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : '';
}

export function detectFormat(
	fileName: string,
	mimeType: string,
	override?: SupportedFormat,
): SupportedFormat | undefined {
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

	const records = getCsvParse()(content, {
		delimiter,
		columns: false,
		skip_empty_lines: true,
		relax_column_count: true,
		trim: true,
	});

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

function toCellValueOrNull(value: unknown): CellValue {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		return value;
	}
	return null;
}

function decodeAttachmentText(attachment: AttachmentInfo): string {
	let decoded: Buffer;
	try {
		decoded = Buffer.from(attachment.data, 'base64');
	} catch {
		throw new Error('Failed to decode base64 attachment data');
	}

	if (decoded.length > MAX_DECODED_SIZE_BYTES) {
		throw new Error(formatSizeLimitMessage(decoded.length));
	}

	return decoded.toString('utf-8');
}

function finalizeTabularOutput(
	attachment: AttachmentInfo,
	attachmentIndex: number,
	format: ParseableFormat,
	columns: ColumnMeta[],
	initialRows: Array<Record<string, CellValue>>,
	totalRows: number,
	startRow: number,
): ParseFileOutput {
	let paginatedRows = initialRows;
	const warnings: string[] = [];

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

function buildJsonTabularRows(
	rawHeaders: string[],
	allRows: Array<Record<string, unknown>>,
	startRow: number,
	maxRows: number,
): { columns: ColumnMeta[]; paginatedRows: Array<Record<string, CellValue>>; totalRows: number } {
	const normalizedNames = normalizeColumnNames(rawHeaders);
	const totalRows = allRows.length;
	const sliced = allRows.slice(startRow, startRow + maxRows);

	const columns = rawHeaders.map((raw, i) => ({
		originalName: raw,
		name: normalizedNames[i],
		inferredType: inferColumnType(sliced.map((row) => toCellValueOrNull(row[raw]))),
		index: i,
	}));

	const paginatedRows = sliced.map((row, rowIdx) => {
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

	return { columns, paginatedRows, totalRows };
}

function isHighSurrogate(code: number): boolean {
	return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
	return code >= 0xdc00 && code <= 0xdfff;
}

/**
 * Paginates text content by character offset.
 *
 * Keeps UTF-16 surrogate pairs together across page boundaries so each page
 * stays valid UTF-8 and concatenating pages reproduces the original string.
 */
export function paginateTextContent(
	text: string,
	options: TextPaginationOptions = {},
): TextPaginationResult {
	const totalChars = text.length;
	let startChar = Math.max(0, options.startChar ?? 0);
	const maxChars = Math.min(Math.max(1, options.maxChars ?? MAX_RESULT_CHARS), MAX_RESULT_CHARS);

	if (startChar >= totalChars) {
		return {
			content: '',
			totalChars,
			truncated: false,
		};
	}

	if (
		startChar > 0 &&
		isHighSurrogate(text.charCodeAt(startChar - 1)) &&
		isLowSurrogate(text.charCodeAt(startChar))
	) {
		startChar -= 1;
	}

	let end = Math.min(startChar + maxChars, totalChars);
	if (end < totalChars && end > startChar) {
		const lastCode = text.charCodeAt(end - 1);
		const nextCode = text.charCodeAt(end);
		if (isHighSurrogate(lastCode) && isLowSurrogate(nextCode)) {
			end += end - startChar === 1 ? 1 : -1;
		}
	}

	const content = text.slice(startChar, end);
	const hasMore = end < totalChars;

	return {
		content,
		totalChars,
		truncated: hasMore,
		...(hasMore ? { nextStartChar: end } : {}),
	};
}

/**
 * Extracts raw UTF-8 text from a plain-text or Markdown attachment with
 * character pagination. Keeps leading and trailing whitespace intact so
 * paginated reads can reconstruct the exact original text.
 */
export function extractPlainTextContent(
	attachment: AttachmentInfo,
	options: TextPaginationOptions = {},
): TextPaginationResult {
	const raw = decodeAttachmentText(attachment);
	if (!raw.trim()) {
		throw new Error(`"${attachment.fileName}" contains no extractable text.`);
	}
	return paginateTextContent(raw, options);
}

type TabularJsonResult =
	| { kind: 'tabular'; rawHeaders: string[]; allRows: Array<Record<string, unknown>> }
	| { kind: 'non-tabular'; warning?: string };

/**
 * Checks whether a parsed JSON array can be represented as flat tabular rows
 * within the tabular limits. Returns a non-tabular result (with a warning when
 * a tabular limit triggered the fallback), and throws on dangerous keys.
 */
function extractTabularJsonRows(parsed: unknown[]): TabularJsonResult {
	if (parsed.length === 0) {
		return { kind: 'tabular', rawHeaders: [], allRows: [] };
	}

	const keySet = new Set<string>();
	const allRows: Array<Record<string, unknown>> = [];

	for (const item of parsed) {
		if (!isRecord(item)) return { kind: 'non-tabular' };
		for (const [key, value] of Object.entries(item)) {
			if (value !== null && typeof value === 'object') return { kind: 'non-tabular' };
			if (typeof value === 'string' && value.length > MAX_CELL_STRING_LENGTH) {
				return {
					kind: 'non-tabular',
					warning: `Returned as raw JSON text: cell string length exceeds the ${MAX_CELL_STRING_LENGTH}-character tabular limit.`,
				};
			}
			keySet.add(key);
			if (keySet.size > MAX_COLUMNS) {
				return {
					kind: 'non-tabular',
					warning: `Returned as raw JSON text: key count exceeds the ${MAX_COLUMNS}-column tabular limit.`,
				};
			}
		}
		allRows.push(item);
	}

	// Reject prototype-pollution keys before materializing tabular row objects.
	for (const row of allRows) {
		const dangerousKey = hasDangerousKey(row);
		if (dangerousKey) {
			throw new Error(`Dangerous key "${dangerousKey}" found in JSON data`);
		}
	}

	return { kind: 'tabular', rawHeaders: [...keySet], allRows };
}

/**
 * Parses a JSON attachment for `parse-file`.
 *
 * Returns tabular rows and columns for flat arrays of flat objects within
 * tabular limits (unless character pagination is requested). Returns exact,
 * character-paginated UTF-8 JSON content for objects, nested structures,
 * primitive arrays, or arrays that exceed tabular limits.
 */
export function parseJsonAttachment(
	attachment: AttachmentInfo,
	attachmentIndex: number,
	input: ParseFileInput,
): ParseFileOutput {
	const raw = decodeAttachmentText(attachment);

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error('Invalid JSON: failed to parse');
	}

	const requestsCharPagination =
		(input.startChar !== undefined && input.startChar > 0) || input.maxChars !== undefined;

	let warnings: string[] | undefined;

	if (!requestsCharPagination && Array.isArray(parsed)) {
		const tabular = extractTabularJsonRows(parsed);
		if (tabular.kind === 'tabular') {
			const startRow = input.startRow ?? 0;
			const maxRows = Math.min(input.maxRows ?? DEFAULT_MAX_ROWS, MAX_ROWS_PER_CALL);
			const { columns, paginatedRows, totalRows } = buildJsonTabularRows(
				tabular.rawHeaders,
				tabular.allRows,
				startRow,
				maxRows,
			);
			return finalizeTabularOutput(
				attachment,
				attachmentIndex,
				'json',
				columns,
				paginatedRows,
				totalRows,
				startRow,
			);
		}
		if (tabular.warning) {
			warnings = [tabular.warning];
		}
	}

	return {
		attachmentIndex,
		fileName: attachment.fileName,
		mimeType: attachment.mimeType,
		format: 'json',
		columns: [],
		rows: [],
		totalRows: 0,
		returnedRows: 0,
		...paginateTextContent(raw, {
			startChar: input.startChar,
			maxChars: input.maxChars,
		}),
		...(warnings ? { warnings } : {}),
	};
}

// ── Main parse function ─────────────────────────────────────────────────────

export function parseStructuredFile(
	attachment: AttachmentInfo,
	attachmentIndex: number,
	input: ParseFileInput,
): ParseFileOutput {
	const content = decodeAttachmentText(attachment);
	const format = detectFormat(attachment.fileName, attachment.mimeType, input.format);
	if (!format || !isLegacyTabularFormat(format)) {
		throw new Error(
			`Unsupported format for "${attachment.fileName}" (${attachment.mimeType}). Supported: csv, tsv, json`,
		);
	}

	const hasHeader = input.hasHeader ?? true;
	const startRow = input.startRow ?? 0;
	const maxRows = Math.min(input.maxRows ?? DEFAULT_MAX_ROWS, MAX_ROWS_PER_CALL);

	let columns: ColumnMeta[];
	let paginatedRows: Array<Record<string, CellValue>>;
	let totalRows: number;

	if (format === 'json') {
		const { rawHeaders, allRows } = parseJson(content);

		if (rawHeaders.length > MAX_COLUMNS) {
			throw new Error(`Too many columns: ${rawHeaders.length} (max ${MAX_COLUMNS})`);
		}

		({ columns, paginatedRows, totalRows } = buildJsonTabularRows(
			rawHeaders,
			allRows,
			startRow,
			maxRows,
		));
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

	return finalizeTabularOutput(
		attachment,
		attachmentIndex,
		format,
		columns,
		paginatedRows,
		totalRows,
		startRow,
	);
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
				unavailableReason: formatSizeLimitMessage(estimatedDecodedSize, 'limit'),
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
 * Returns true if the attachment is a tabular format (csv/tsv/json/xlsx)
 * that produces row+column output via parse-file.
 */
export function isStructuredAttachment(att: AttachmentInfo): boolean {
	const format = detectFormat(att.fileName, att.mimeType);
	return format === 'csv' || format === 'tsv' || format === 'json' || format === 'xlsx';
}

/**
 * Returns true if we have a parser that can extract content for this attachment
 * (tabular OR text-like). Used to decide whether to register the parse-file tool
 * and to route the attachment through extraction instead of raw multimodal content.
 */
export function isParseableAttachment(att: AttachmentInfo): boolean {
	return detectFormat(att.fileName, att.mimeType) !== undefined;
}
