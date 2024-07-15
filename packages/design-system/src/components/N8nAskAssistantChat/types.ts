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

export type AssistantMessage = (TextMessage | CodeDiffMessage) & {
	quickReplies?: Array<{
		type: string;
		label: string;
	}>;
};
