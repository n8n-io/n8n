/**
 * Text Editor Tool Types
 *
 * Type definitions for the Anthropic str_replace_based_edit_tool (text_editor_20250728)
 * used by the code builder agent for targeted workflow code edits.
 */

/**
 * View command - displays file content with line numbers
 */
export interface ViewCommand {
	command: 'view';
	path: string;
	/** Optional line range to view [start, end] (1-indexed, inclusive) */
	view_range?: [number, number];
}

/**
 * Create command - creates a new file with content
 */
export interface CreateCommand {
	command: 'create';
	path: string;
	file_text: string;
}

/**
 * String replace command - replaces exact text match
 */
export interface StrReplaceCommand {
	command: 'str_replace';
	path: string;
	old_str: string;
	new_str: string;
}

/**
 * Insert command - inserts text at a specific line
 */
export interface InsertCommand {
	command: 'insert';
	path: string;
	/** Line number after which to insert (0 = beginning of file) */
	insert_line: number;
	insert_text: string;
}

/**
 * Union type for all text editor commands
 */
export type TextEditorCommand = ViewCommand | CreateCommand | StrReplaceCommand | InsertCommand;

/**
 * Text editor tool call from LLM response
 */
export interface TextEditorToolCall {
	name: 'str_replace_based_edit_tool';
	args: TextEditorCommand;
	id: string;
}

/**
 * Result from text editor command execution
 */
export interface TextEditorResult {
	/** Result message to send back to the LLM */
	content: string;
}

/**
 * Error thrown when no match is found for str_replace
 */
export class NoMatchFoundError extends Error {
	constructor(_searchStr: string, nearMatchContext?: string) {
		const base =
			'No exact match found for str_replace. The old_str content was not found in the file.';
		const message = nearMatchContext ? `${base}\n${nearMatchContext}` : base;
		super(message);
		this.name = 'NoMatchFoundError';
	}
}

/**
 * Error thrown when multiple matches are found for str_replace
 */
export class MultipleMatchesError extends Error {
	constructor(count: number) {
		super(`Found ${count} matches. Please provide more context to make the replacement unique.`);
		this.name = 'MultipleMatchesError';
	}
}

/**
 * Error thrown for invalid line numbers
 */
export class InvalidLineNumberError extends Error {
	constructor(line: number, maxLine: number) {
		super(`Invalid line number ${line}. File has ${maxLine} lines (valid range: 0-${maxLine}).`);
		this.name = 'InvalidLineNumberError';
	}
}

/**
 * Error thrown when view_range end is less than start
 */
export class InvalidViewRangeError extends Error {
	constructor(start: number, end: number, maxLine: number) {
		super(
			`Invalid view range: end (${end}) must be >= start (${start}). File has ${maxLine} lines (valid range: 1-${maxLine}).`,
		);
		this.name = 'InvalidViewRangeError';
	}
}

/**
 * Error thrown for invalid file paths
 */
export class InvalidPathError extends Error {
	constructor(path: string) {
		super(`Invalid path "${path}". Only /workflow.js is supported.`);
		this.name = 'InvalidPathError';
	}
}

/**
 * Error thrown when file already exists for create command
 */
export class FileExistsError extends Error {
	constructor() {
		super('File already exists. Use text editor tools to modify existing content.');
		this.name = 'FileExistsError';
	}
}

/**
 * Error thrown when file doesn't exist for edit commands
 */
export class FileNotFoundError extends Error {
	constructor() {
		super('No workflow code exists yet. Use create first.');
		this.name = 'FileNotFoundError';
	}
}

/**
 * A single replacement in a batch operation
 */
export interface StrReplacement {
	old_str: string;
	new_str: string;
}

/**
 * Per-replacement result in a batch operation.
 * Returned as an array when any replacement fails.
 */
export interface BatchReplaceResult {
	index: number;
	/** Truncated preview of old_str for context */
	old_str: string;
	status: 'success' | 'failed' | 'not_attempted';
	error?: string;
}

/**
 * Error thrown when a batch replacement fails.
 * Contains the index that failed and the underlying cause.
 */
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
