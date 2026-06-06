export {
	NoMatchFoundError,
	MultipleMatchesError,
	InvalidLineNumberError,
	InvalidViewRangeError,
	InvalidPathError,
	FileExistsError,
	FileNotFoundError,
	BatchReplacementError,
} from '@n8n/text-editor';

export type {
	ViewCommand,
	CreateCommand,
	StrReplaceCommand,
	InsertCommand,
	TextEditorCommand,
	TextEditorToolCall,
	TextEditorResult,
	StrReplacement,
	BatchReplaceResult,
} from '@n8n/text-editor';
