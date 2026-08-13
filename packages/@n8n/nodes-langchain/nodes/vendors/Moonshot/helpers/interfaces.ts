import type { IDataObject } from 'n8n-workflow';

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string | ContentBlock[];
	tool_call_id?: string;
	tool_calls?: ToolCall[];
	reasoning_content?: string;
}

export type ContentBlock =
	| { type: 'text'; text: string }
	| { type: 'image_url'; image_url: { url: string } };

export interface ToolFunction {
	type: 'function';
	function: {
		name: string;
		description?: string;
		parameters?: IDataObject;
	};
}

export interface BuiltinTool {
	type: 'builtin_function';
	function: {
		name: string;
	};
}

export interface ToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export interface ChatCompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string | null;
			reasoning_content?: string | null;
			tool_calls?: ToolCall[];
		};
		finish_reason: string;
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}
