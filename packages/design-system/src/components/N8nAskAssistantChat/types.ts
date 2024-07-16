interface TextMessage {
	role: 'assistant' | 'user';
	type: 'text';
	title?: string;
	content: string;
}

interface CodeDiffMessage {
	role: 'assistant';
	type: 'code-diff';
	description: string;
	codeDiff: string;
	replacing?: boolean;
	replaced?: boolean;
	error?: boolean;
}

export interface QuickReply {
	type: string;
	label: string;
}

export type AssistantMessage = (TextMessage | CodeDiffMessage) & {
	quickReplies?: QuickReply[];
};
