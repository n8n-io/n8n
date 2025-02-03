export interface LangChainMessage {
	id: string[];
	kwargs: {
		content: string;
	};
}

export interface MemoryOutput {
	action: string;
	chatHistory?: LangChainMessage[];
}

export interface IChatMessageResponse {
	executionId?: string;
	success: boolean;
	error?: Error;
}

export interface IChatResizeStyles {
	'--panel-height': string;
	'--chat-width': string;
}
