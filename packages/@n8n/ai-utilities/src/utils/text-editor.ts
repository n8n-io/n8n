import {
	findDivergenceContext,
	FileNotFoundError as BaseFileNotFoundError,
	formatTextWithLineNumbers,
	InvalidLineNumberError,
	InvalidPathError as BaseInvalidPathError,
	InvalidViewRangeError,
	MultipleMatchesError,
	NoMatchFoundError,
	parseStrReplacements,
	type StrReplacement,
	TextEditorDocument,
	type TextEditorCommand,
} from '@n8n/text-editor';

export {
	findDivergenceContext,
	formatTextWithLineNumbers,
	InvalidLineNumberError,
	InvalidViewRangeError,
	MultipleMatchesError,
	NoMatchFoundError,
	parseStrReplacements,
	TextEditorDocument,
};

export type {
	BatchReplaceResult,
	CreateCommand,
	InsertCommand,
	StrReplaceCommand,
	StrReplacement,
	TextEditorCommand,
	TextEditorDocumentOptions,
	TextEditorResult,
	ViewCommand,
} from '@n8n/text-editor';

export class InvalidPathError extends BaseInvalidPathError {
	constructor(path: string, supportedPath = '/workflow.js', message?: string) {
		super(path, supportedPath, message);
	}
}

export class FileNotFoundError extends BaseFileNotFoundError {
	constructor(message = 'No workflow code exists yet. Use create first.') {
		super(message);
	}
}

export interface BatchStrReplaceCommand {
	command: 'batch_str_replace';
	path: string;
	replacements: StrReplacement[];
}

export type TextEditorCommandWithBatch = TextEditorCommand | BatchStrReplaceCommand;

export interface TextEditorToolCall {
	name: 'str_replace_based_edit_tool';
	args: TextEditorCommand;
	id: string;
}

export class FileExistsError extends Error {
	constructor() {
		super('File already exists. Use text editor tools to modify existing content.');
		this.name = 'FileExistsError';
	}
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
