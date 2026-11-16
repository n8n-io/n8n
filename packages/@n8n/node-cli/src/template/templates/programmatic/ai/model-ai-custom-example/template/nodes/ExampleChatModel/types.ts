export type OpenAITool =
	| {
			type: 'function';
			name: string;
			description?: string;
			parameters: unknown;
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
	| { type: 'function_call_output'; call_id: string; output: string }
	| {
			type: 'reasoning';
			summary: Array<{ type: 'summary_text'; text: string }>;
			encrypted_content: string;
	  };

export type OpenAIResponsesRequest = {
	model: string;
	input: string | ResponsesInputItem[];
	instructions?: string;
	max_output_tokens?: number;
	temperature?: number;
	top_p?: number;
	presence_penalty?: number;
	frequency_penalty?: number;
	tools?: OpenAITool[];
	tool_choice?: OpenAIToolChoice;
	parallel_tool_calls?: boolean;
	store?: boolean;
	stream?: boolean;
	include?: Array<'reasoning.encrypted_content'>;
	metadata?: Record<string, unknown>;
};

type OpenAIResponseStatus =
	| 'completed'
	| 'failed'
	| 'in_progress'
	| 'cancelled'
	| 'queued'
	| 'incomplete';

export type OpenAIResponsesResponse = {
	id: string;
	object: string;
	created_at: string;
	model: string;
	output: ResponsesOutputItem[];
	status: OpenAIResponseStatus;
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
	incomplete_details?: { reason?: 'max_output_tokens' | 'content_filter' } | null;
	error?: { code?: string; message?: string } | null;
	metadata?: Record<string, unknown>;
	user?: string;
	service_tier?: string;
};

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
			call_id?: string;
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
			encrypted_content?: string | null;
	  };

export type ReasoningOutputItem = Extract<ResponsesOutputItem, { type: 'reasoning' }>;

export type OpenAIStreamEvent = {
	type: string;
	delta?: string;
	output_index?: number;
	item?: Record<string, unknown>;
	response?: Partial<OpenAIResponsesResponse>;
	usage?: OpenAIResponsesResponse['usage'];
	message?: string;
};
