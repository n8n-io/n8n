export interface InstanceAiToolCallState {
	toolCallId: string;
	toolName: string;
	args: Record<string, unknown>;
	result?: unknown;
	isError?: boolean;
	isLoading: boolean;
}

export interface InstanceAiChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	toolCalls: InstanceAiToolCallState[];
	reasoning: string;
	isStreaming: boolean;
	createdAt: string;
}

export interface InstanceAiStreamChunk {
	type: string;
	payload?: Record<string, unknown>;
	[key: string]: unknown;
}
