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
}

interface QuickRepliesMessage {
	role: 'assistant';
	type: 'quick-replies';
	options: Array<{
		type: string;
		label: string;
	}>;
}

export type AssistantMessage = TextMessage | CodeDiffMessage | QuickRepliesMessage;
