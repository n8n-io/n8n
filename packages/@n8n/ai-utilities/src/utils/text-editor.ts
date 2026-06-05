export interface ViewCommand {
	command: 'view';
	path: string;
	/** Optional line range to view [start, end] (1-indexed, inclusive). */
	view_range?: [number, number];
}

export interface CreateCommand {
	command: 'create';
	path: string;
	file_text: string;
}

export interface StrReplaceCommand {
	command: 'str_replace';
	path: string;
	old_str: string;
	new_str: string;
}

export interface InsertCommand {
	command: 'insert';
	path: string;
	/** Line number after which to insert (0 = beginning of file). */
	insert_line: number;
	insert_text: string;
}

export interface BatchStrReplaceCommand {
	command: 'batch_str_replace';
	path: string;
	replacements: StrReplacement[];
}

export type TextEditorCommand = ViewCommand | CreateCommand | StrReplaceCommand | InsertCommand;

export type TextEditorCommandWithBatch = TextEditorCommand | BatchStrReplaceCommand;

export interface TextEditorToolCall {
	name: 'str_replace_based_edit_tool';
	args: TextEditorCommand;
	id: string;
}

export interface TextEditorResult {
	content: string;
}

export class NoMatchFoundError extends Error {
	constructor(_searchStr: string, nearMatchContext?: string) {
		const base =
			'No exact match found for str_replace. The old_str content was not found in the file.';
		const message = nearMatchContext ? `${base}\n${nearMatchContext}` : base;
		super(message);
		this.name = 'NoMatchFoundError';
	}
}

export class MultipleMatchesError extends Error {
	constructor(count: number) {
		super(`Found ${count} matches. Please provide more context to make the replacement unique.`);
		this.name = 'MultipleMatchesError';
	}
}

export class InvalidLineNumberError extends Error {
	constructor(line: number, maxLine: number) {
		super(`Invalid line number ${line}. File has ${maxLine} lines (valid range: 0-${maxLine}).`);
		this.name = 'InvalidLineNumberError';
	}
}

export class InvalidViewRangeError extends Error {
	constructor(start: number, end: number, maxLine: number) {
		super(
			`Invalid view range: end (${end}) must be >= start (${start}). File has ${maxLine} lines (valid range: 1-${maxLine}).`,
		);
		this.name = 'InvalidViewRangeError';
	}
}

export class InvalidPathError extends Error {
	constructor(path: string, supportedPath = '/workflow.js', message?: string) {
		super(message ?? `Invalid path "${path}". Only ${supportedPath} is supported.`);
		this.name = 'InvalidPathError';
	}
}

export class FileExistsError extends Error {
	constructor() {
		super('File already exists. Use text editor tools to modify existing content.');
		this.name = 'FileExistsError';
	}
}

export class FileNotFoundError extends Error {
	constructor(message = 'No workflow code exists yet. Use create first.') {
		super(message);
		this.name = 'FileNotFoundError';
	}
}

export interface StrReplacement {
	old_str: string;
	new_str: string;
}

export interface BatchReplaceResult {
	index: number;
	/** Truncated preview of old_str for context. */
	old_str: string;
	status: 'success' | 'failed' | 'not_attempted';
	error?: string;
}

export class BatchReplacementError extends Error {
	readonly failedIndex: number;
	readonly totalCount: number;
	override readonly cause: NoMatchFoundError | MultipleMatchesError;

	constructor(
		failedIndex: number,
		totalCount: number,
		cause: NoMatchFoundError | MultipleMatchesError,
	) {
		super(
			`Batch replacement failed at index ${failedIndex} of ${totalCount}: ${cause.message}. All changes have been rolled back.`,
		);
		this.name = 'BatchReplacementError';
		this.failedIndex = failedIndex;
		this.totalCount = totalCount;
		this.cause = cause;
	}
}

export interface TextEditorDocumentOptions {
	initialText?: string | null;
	supportedPath?: string;
	createInvalidPathMessage?: (path: string, supportedPath: string) => string;
	invalidPathMessage?: (path: string, supportedPath: string) => string;
	fileNotFoundMessage?: string;
}

const PREVIEW_MAX_LENGTH = 80;
const MIN_PREFIX_LENGTH = 10;
const CONTEXT_LINES = 3;
const OLD_STR_CONTEXT_LENGTH = 40;

function truncatePreview(str: string): string {
	if (str.length <= PREVIEW_MAX_LENGTH) return str;
	return str.slice(0, PREVIEW_MAX_LENGTH) + '...';
}

function escapeWhitespace(str: string): string {
	return str.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r');
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function formatTextWithLineNumbers(text: string): string {
	const lines = text.split('\n');
	return lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
}

export function findDivergenceContext(code: string, searchStr: string): string | undefined {
	let lo = 0;
	let hi = searchStr.length;

	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (code.includes(searchStr.substring(0, mid))) {
			lo = mid;
		} else {
			hi = mid - 1;
		}
	}

	const matchLength = lo;
	if (matchLength < MIN_PREFIX_LENGTH) return undefined;

	const matchPos = code.indexOf(searchStr.substring(0, matchLength));
	const divergePos = matchPos + matchLength;
	const percentage = Math.round((matchLength / searchStr.length) * 100);

	const codeUpToDiverge = code.substring(0, divergePos);
	const divergeLine = codeUpToDiverge.split('\n').length;

	const oldStrRemainder = searchStr.substring(matchLength, matchLength + OLD_STR_CONTEXT_LENGTH);
	const oldStrPrefix = searchStr.substring(Math.max(0, matchLength - 20), matchLength);

	const codeLines = code.split('\n');
	const startLine = Math.max(0, divergeLine - CONTEXT_LINES);
	const endLine = Math.min(codeLines.length, divergeLine + 1);
	const fileContext = codeLines
		.slice(startLine, endLine)
		.map((line, i) => `    ${startLine + i + 1}: ${line}`)
		.join('\n');

	return (
		`Closest match (${percentage}% of old_str matched, diverges at line ${divergeLine}):\n` +
		`  old_str: ...${escapeWhitespace(oldStrPrefix)}>>> ${escapeWhitespace(oldStrRemainder)}\n` +
		`  file:\n${fileContext}`
	);
}

export function parseStrReplacements(raw: unknown): StrReplacement[] {
	let parsed = raw;

	if (typeof parsed === 'string') {
		try {
			parsed = JSON.parse(parsed);
		} catch {
			throw new Error(
				'replacements must be a JSON array of {old_str, new_str} objects, but received an invalid JSON string.',
			);
		}
	}

	if (!Array.isArray(parsed)) {
		throw new Error(
			'replacements must be an array of {old_str, new_str} objects. Example: {"replacements": [{"old_str": "foo", "new_str": "bar"}]}',
		);
	}

	const replacements: StrReplacement[] = [];

	for (let i = 0; i < parsed.length; i++) {
		const item = parsed[i];
		if (!isObjectRecord(item) || typeof item.old_str !== 'string') {
			throw new Error(
				`replacements[${i}] is missing a valid "old_str" string. Each replacement must have {old_str: string, new_str: string}.`,
			);
		}
		if (typeof item.new_str !== 'string') {
			throw new Error(
				`replacements[${i}] is missing a valid "new_str" string. Each replacement must have {old_str: string, new_str: string}.`,
			);
		}
		replacements.push({ old_str: item.old_str, new_str: item.new_str });
	}

	return replacements;
}

export class TextEditorDocument {
	private text: string | null;
	private readonly options: TextEditorDocumentOptions;

	constructor(options: TextEditorDocumentOptions = {}) {
		this.text = options.initialText ?? null;
		this.options = options;
	}

	execute(command: TextEditorCommand): string {
		if (command.command === 'create') {
			this.validateCreatePath(command.path);
		}

		this.validatePath(command.path);

		switch (command.command) {
			case 'view':
				return this.handleView(command);
			case 'create':
				return this.handleCreate(command);
			case 'str_replace':
				return this.handleStrReplace(command);
			case 'insert':
				return this.handleInsert(command);
		}
	}

	executeBatch(replacements: StrReplacement[]): string | BatchReplaceResult[] {
		if (this.text === null) {
			throw this.createFileNotFoundError();
		}

		if (replacements.length === 0) {
			return 'No replacements to apply.';
		}

		const snapshot = this.text;
		const results: BatchReplaceResult[] = [];

		for (let i = 0; i < replacements.length; i++) {
			const { old_str, new_str } = replacements[i];
			const preview = truncatePreview(old_str);
			const count = this.countOccurrences(this.text, old_str);

			if (count === 0) {
				this.text = snapshot;
				results.push({
					index: i,
					old_str: preview,
					status: 'failed',
					error: new NoMatchFoundError(old_str).message,
				});
				this.appendNotAttemptedResults(results, replacements, i + 1);
				return results;
			}

			if (count > 1) {
				this.text = snapshot;
				results.push({
					index: i,
					old_str: preview,
					status: 'failed',
					error: new MultipleMatchesError(count).message,
				});
				this.appendNotAttemptedResults(results, replacements, i + 1);
				return results;
			}

			this.text = this.text.replace(old_str, this.escapeReplacement(new_str));
			results.push({ index: i, old_str: preview, status: 'success' });
		}

		return `All ${replacements.length} replacements applied successfully.`;
	}

	getText(): string | null {
		return this.text;
	}

	setText(text: string): void {
		this.text = text;
	}

	hasText(): boolean {
		return this.text !== null;
	}

	clearText(): void {
		this.text = null;
	}

	private validateCreatePath(path: string): void {
		const supportedPath = this.options.supportedPath;
		if (supportedPath === undefined || path === supportedPath) {
			return;
		}

		throw new Error(
			this.options.createInvalidPathMessage?.(path, supportedPath) ??
				`Cannot create "${path}". Only ${supportedPath} is supported.`,
		);
	}

	private validatePath(path: string): void {
		const supportedPath = this.options.supportedPath;
		if (supportedPath === undefined || path === supportedPath) {
			return;
		}

		throw new InvalidPathError(
			path,
			supportedPath,
			this.options.invalidPathMessage?.(path, supportedPath),
		);
	}

	private handleView(command: ViewCommand): string {
		if (this.text === null) {
			throw this.createFileNotFoundError();
		}

		const lines = this.text.split('\n');

		if (command.view_range) {
			const [start, rawEnd] = command.view_range;
			const end = rawEnd === -1 ? lines.length : rawEnd;

			if (start < 1 || start > lines.length) {
				throw new InvalidLineNumberError(start, lines.length);
			}
			if (end < start) {
				throw new InvalidViewRangeError(start, end, lines.length);
			}

			const startIndex = start - 1;
			const endIndex = Math.min(end, lines.length);
			const selectedLines = lines.slice(startIndex, endIndex);

			return selectedLines.map((line, i) => `${startIndex + i + 1}: ${line}`).join('\n');
		}

		return formatTextWithLineNumbers(this.text);
	}

	private handleCreate(command: CreateCommand): string {
		this.text = command.file_text;
		return 'File created successfully.';
	}

	private handleStrReplace(command: StrReplaceCommand): string {
		if (this.text === null) {
			throw this.createFileNotFoundError();
		}

		const { old_str, new_str } = command;
		const count = this.countOccurrences(this.text, old_str);

		if (count === 0) {
			const normalized = old_str.endsWith('\n') ? old_str.slice(0, -1) : old_str + '\n';
			const normalizedCount = this.countOccurrences(this.text, normalized);
			if (normalizedCount === 1) {
				this.text = this.text.replace(normalized, this.escapeReplacement(new_str));
				return 'Edit applied successfully.';
			}

			const context = findDivergenceContext(this.text, old_str);
			throw new NoMatchFoundError(old_str, context);
		}

		if (count > 1) {
			throw new MultipleMatchesError(count);
		}

		this.text = this.text.replace(old_str, this.escapeReplacement(new_str));
		return 'Edit applied successfully.';
	}

	private handleInsert(command: InsertCommand): string {
		if (this.text === null) {
			throw this.createFileNotFoundError();
		}

		const { insert_line, insert_text } = command;
		const lines = this.text.split('\n');

		if (insert_line < 0 || insert_line > lines.length) {
			throw new InvalidLineNumberError(insert_line, lines.length);
		}

		lines.splice(insert_line, 0, insert_text);
		this.text = lines.join('\n');

		return 'Text inserted successfully.';
	}

	private countOccurrences(text: string, search: string): number {
		if (search.length === 0) {
			return 0;
		}

		let count = 0;
		let pos = 0;

		while ((pos = text.indexOf(search, pos)) !== -1) {
			count++;
			pos += search.length;
		}

		return count;
	}

	private appendNotAttemptedResults(
		results: BatchReplaceResult[],
		replacements: StrReplacement[],
		startIndex: number,
	): void {
		for (let i = startIndex; i < replacements.length; i++) {
			results.push({
				index: i,
				old_str: truncatePreview(replacements[i].old_str),
				status: 'not_attempted',
			});
		}
	}

	private createFileNotFoundError(): FileNotFoundError {
		return new FileNotFoundError(this.options.fileNotFoundMessage);
	}

	private escapeReplacement(replacement: string): string {
		return replacement.replace(/\$/g, '$$$$');
	}
}
