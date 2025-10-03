export interface UserMessage {
	id: string;
	role: 'user';
	type: 'message';
	text: string;
}

export interface AssistantMessage {
	id: string;
	role: 'assistant';
	type: 'message';
	text: string;
}

export interface ErrorMessage {
	id: string;
	role: 'assistant';
	type: 'error';
	content: string;
}

export type StreamChunk = AssistantMessage | ErrorMessage;
export type ChatMessage = UserMessage | AssistantMessage | ErrorMessage;

export interface StreamOutput {
	messages: StreamChunk[];
}
