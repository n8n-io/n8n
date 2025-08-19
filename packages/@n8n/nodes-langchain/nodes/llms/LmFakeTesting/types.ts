export type FakeLlmResponseType = 'fixed' | 'sequence' | 'error';

export interface ToolCall {
	id?: string;
	name: string;
	args: Record<string, any>;
}

export interface FakeLlmResponse {
	content?: string;
	toolCalls?: ToolCall[];
}

export interface FakeLlmConfig {
	responseType: FakeLlmResponseType;
	responses?: Array<string | FakeLlmResponse>;
	errorMessage?: string;
	shouldThrowError?: boolean;
	toolStyle?: 'none' | 'function_calling' | 'structured';
}
