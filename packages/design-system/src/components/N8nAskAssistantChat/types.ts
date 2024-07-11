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

export type AssistantMessage = (TextMessage | CodeDiffMessage) & {
	quickReplies?: Array<{
		type: string;
		label: string;
	}>;
};
