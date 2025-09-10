export interface OllamaMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	images?: string[];
	tool_calls?: ToolCall[];
	tool_name?: string;
}

export interface ToolCall {
	function: {
		name: string;
		arguments: Record<string, any>;
	};
}

export interface OllamaTool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

export interface OllamaChatResponse {
	model: string;
	created_at: string;
	message: OllamaMessage;
	done: boolean;
	done_reason?: string;
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	prompt_eval_duration?: number;
	eval_count?: number;
	eval_duration?: number;
}
