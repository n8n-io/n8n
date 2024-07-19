export namespace ChatUI {
	export interface TextMessage {
		role: 'assistant' | 'user';
		type: 'text';
		content: string;
	}

	export interface SummaryBlock {
		role: 'assistant';
		type: 'summary';
		title: string;
		content: string;
	}

	interface CodeDiffMessage {
		role: 'assistant';
		type: 'code-diff';
		description?: string;
		codeDiff?: string;
		replacing?: boolean;
		replaced?: boolean;
		error?: boolean;
		suggestionId: string;
	}

	interface EndSessionMessage {
		role: 'assistant';
		type: 'end-session';
	}

	export interface QuickReply {
		type: string;
		content: string;
	}

	export interface ErrorMessage {
		role: 'assistant';
		type: 'error';
		content: string;
	}

	export type AssistantMessage =
		| ((TextMessage | CodeDiffMessage | SummaryBlock) & {
				quickReplies?: QuickReply[];
		  })
		| ErrorMessage
		| EndSessionMessage;
}
