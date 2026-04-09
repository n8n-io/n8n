// import type { OpenAIClient } from '@langchain/openai';
import type { OpenAI } from 'openai';

export type BuiltInTools = {
	webSearch?: {
		searchContextSize?: 'low' | 'medium' | 'high';
		allowedDomains?: string;
		country?: string;
		city?: string;
		region?: string;
	};
	fileSearch?: {
		vectorStoreIds?: string;
		filters?: string;
		maxResults?: number;
	};
	codeInterpreter?: boolean;
};

export type ModelOptions = {
	baseURL?: string;
	frequencyPenalty?: number;
	maxTokens?: number;
	responseFormat?: 'text' | 'json_object';
	presencePenalty?: number;
	temperature?: number;
	reasoningEffort?: 'low' | 'medium' | 'high';
	timeout?: number;
	maxRetries?: number;
	topP?: number;
	conversationId?: string;
	metadata?: string;
	promptCacheKey?: string;
	safetyIdentifier?: string;
	serviceTier?: 'auto' | 'flex' | 'default' | 'priority';
	topLogprobs?: number;
	textFormat?: {
		textOptions?: TextOptions;
	};
	promptConfig?: {
		promptOptions?: PromptOptions;
	};
};

export type PromptOptions = {
	promptId?: string;
	version?: string;
	variables?: string;
};

export type TextOptions = {
	type?: 'text' | 'json_schema' | 'json_object';
	verbosity?: 'low' | 'medium' | 'high';
	name?: string;
	schema?: string;
	description?: string;
	strict?: boolean;
};

// export type ChatResponseRequest = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
// 	conversation?: { id: string } | string;
// 	top_logprobs?: number;
// };
// // En nodes/llms/LMChatOpenAi/types.ts

export type ChatResponseRequest = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    max_tool_calls?: number;
    conversation?: string | { id: string };
    input?: any[];
    service_tier?: 'auto' | 'flex' | 'default' | 'priority' | null; 
    prompt?: any;
    text?: any;
    reasoning?: any;
    [key: string]: any;
};
