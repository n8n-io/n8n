import type { JSONSchema7 } from 'json-schema';

export type OpenAITool =
	| {
			type: 'function';
			name: string;
			description?: string;
			parameters: JSONSchema7;
			strict?: boolean;
	  }
	| {
			type: 'web_search';
	  };

export type OpenAIToolChoice = 'auto' | 'required' | 'none' | { type: 'function'; name: string };

export type ResponsesInputItem =
	| { role: 'user'; content: string }
	| { role: 'user'; content: Array<{ type: 'input_text'; text: string }> }
	| {
			type: 'message';
			role: 'assistant';
			content: Array<{ type: 'output_text'; text: string }>;
	  }
	| {
			type: 'function_call';
			call_id: string;
			name: string;
			arguments: string;
	  }
	| { type: 'function_call_output'; call_id: string; output: string };

export interface OpenAIResponsesRequest {
	model: string;
	input: string | ResponsesInputItem[];
	instructions?: string;
	max_output_tokens?: number;
	temperature?: number;
	top_p?: number;
	tools?: OpenAITool[];
	tool_choice?: OpenAIToolChoice;
	parallel_tool_calls?: boolean;
	store?: boolean;
	stream?: boolean;
	metadata?: Record<string, unknown>;
}

export interface OpenAIResponsesResponse {
	id: string;
	object: string;
	created_at: string;
	model: string;
	output: ResponsesOutputItem[];
	status: string;
	usage?: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
		input_tokens_details?: {
			cached_tokens?: number;
		};
		output_tokens_details?: {
			reasoning_tokens?: number;
		};
	};
	incomplete_details?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	user?: string;
	service_tier?: string;
}

export type ResponsesOutputItem =
	| {
			type: 'message';
			role: 'assistant';
			id?: string;
			content: Array<{
				type: 'output_text';
				text: string;
			}>;
	  }
	| {
			type: 'function_call';
			id?: string;
			call_id: string;
			name: string;
			arguments: string;
	  }
	| {
			type: 'reasoning';
			id?: string;
			summary: Array<{
				type: string;
				text: string;
			}>;
	  };

export interface OpenAIStreamEvent {
	type: string;
	delta?: string;
	output_index?: number;
	item?: Record<string, unknown>;
	response?: Record<string, unknown>;
}

export interface OpenAIErrorResponse {
	error: {
		message: string;
		type: string;
		code?: string;
		param?: string;
	};
}
