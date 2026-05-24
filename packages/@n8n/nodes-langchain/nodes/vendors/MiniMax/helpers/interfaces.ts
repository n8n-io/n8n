import type { IDataObject } from 'n8n-workflow';

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string;
	tool_call_id?: string;
	tool_calls?: ToolCall[];
	reasoning_content?: string;
}

export interface ToolFunction {
	type: 'function';
	function: {
		name: string;
		description?: string;
		parameters?: IDataObject;
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

export interface ImageGenerationResponse {
	id: string;
	data: {
		image_urls?: string[];
		image_base64?: string[];
	};
	metadata: {
		success_count: number;
		failed_count: number;
	};
	base_resp: {
		status_code: number;
		status_msg: string;
	};
}

export interface VideoGenerationResponse {
	task_id: string;
	base_resp: {
		status_code: number;
		status_msg: string;
	};
}

export interface T2AResponse {
	data: {
		audio: string;
		status: number;
	};
	extra_info: {
		audio_length: number;
		audio_sample_rate: number;
		audio_size: number;
		bitrate: number;
		audio_format: string;
		audio_channel: number;
		usage_characters: number;
		word_count: number;
	};
	trace_id: string;
	base_resp: {
		status_code: number;
		status_msg: string;
	};
}
