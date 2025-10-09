import { type OpenAIClient } from '@langchain/openai';
import type { IDataObject } from 'n8n-workflow';
import type {
	ResponseInputAudio,
	ResponseInputFile,
	ResponseInputImage,
	ResponseInputItem,
	ResponseInputText,
} from 'openai/resources/responses/responses';

export type OutputItem = {
	id: string;
	type: string;
	status: 'completed' | 'failed' | 'in_progress' | 'incomplete';
	role: string;
} & (
	| {
			type: 'message';
			content:
				| { type: 'output_text'; text: string; annotations?: unknown[]; logprobs?: unknown[] }
				| { type: 'refusal'; refusal: string };
	  }
	| {
			type: 'function_call';
			name: string;
			arguments: string;
			call_id: string;
	  }
);
export type ChatResponse = OpenAIClient.Responses.Response;

// 	id: string;
// 	object: string;
// 	created_at: number;
// 	status: 'completed' | 'failed' | 'in_progress' | 'incomplete';
// 	error?: string | null;
// 	incomplete_details?: {
// 		reason: string;
// 	} | null;
// 	instructions?: string | null;
// 	max_output_tokens?: number | null;
// 	model: string;
// 	output: OutputItem[];
// 	parallel_tool_calls: boolean;
// 	previous_response_id?: string | null;
// 	reasoning?: {
// 		effort?: string | null;
// 		summary?: string | null;
// 	};
// 	store: boolean;
// 	temperature: number;
// 	text?: {
// 		format?: {
// 			type: string;
// 		};
// 	};
// 	tool_choice?: string;
// 	tools: unknown[];
// 	top_p: number;
// 	truncation: string;
// 	usage: {
// 		input_tokens: number;
// 		input_tokens_details: {
// 			cached_tokens: number;
// 		};
// 		output_tokens: number;
// 		output_tokens_details: {
// 			reasoning_tokens: number;
// 		};
// 		total_tokens: number;
// 	};
// 	user?: string | null;
// 	metadata: Record<string, unknown>;
// };

// FIXME: currently package types do not include the ResponseInputAudio type, remove this once the package types are updated
export type ResponseInputContent =
	| ResponseInputText
	| ResponseInputImage
	| ResponseInputFile
	| ResponseInputAudio;
export type ChatContent = ResponseInputContent[];

export type ChatInputItem = Omit<OpenAIClient.Responses.ResponseInputItem.Message, 'content'> & {
	content: ChatContent;
};

export type ChatResponseRequest = Omit<
	OpenAIClient.Responses.ResponseCreateParamsNonStreaming,
	'input'
> & {
	max_tool_calls?: number;
	conversation?: {
		id: string;
	};
	input: Array<ChatInputItem | ResponseInputItem.FunctionCallOutput>;
	top_logprobs?: number;
};

export type ChatCompletion = {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		index: number;
		message: {
			role: string;
			content: string;
			tool_calls?: Array<{
				id: string;
				type: 'function';
				function: {
					name: string;
					arguments: string;
				};
			}>;
		};
		finish_reason?: 'tool_calls';
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
	system_fingerprint: string;
};

export type ThreadMessage = {
	id: string;
	object: string;
	created_at: number;
	thread_id: string;
	role: string;
	content: Array<{
		type: string;
		text: {
			value: string;
			annotations: string[];
		};
	}>;
	file_ids: string[];
	assistant_id: string;
	run_id: string;
	metadata: IDataObject;
};

export type ExternalApiCallOptions = {
	callExternalApi: boolean;
	url: string;
	path: string;
	method: string;
	requestOptions: IDataObject;
	sendParametersIn: string;
};
