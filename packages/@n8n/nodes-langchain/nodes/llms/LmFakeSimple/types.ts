export interface ToolCall {
	id?: string;
	name: string;
	args: Record<string, any>;
}

export interface SimpleFakeResponse {
	content?: string;
	toolCalls?: ToolCall[];
}

export type FakeResponseItem = string | SimpleFakeResponse;
