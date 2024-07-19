export namespace ChatUI {
	export interface TextMessage {
		role: 'assistant' | 'user';
		type: 'text';
		title?: string;
		content: string;
		streaming?: boolean;
	}

	interface CodeDiffMessage {
		role: 'assistant';
		type: 'code-diff';
		description?: string;
		codeDiff?: string;
		replacing?: boolean;
		replaced?: boolean;
		error?: boolean;
		streaming?: boolean;
		suggestionId: string;
	}

	interface EndSessionMessage {
		role: 'assistant';
		type: 'end-session';
	}

	export interface QuickReply {
		type: string;
		label: string;
	}

	export interface ErrorMessage {
		role: 'assistant';
		type: 'error';
		content: string;
	}

	export type AssistantMessage =
		| ((TextMessage | CodeDiffMessage) & {
				quickReplies?: QuickReply[];
		  })
		| ErrorMessage
		| EndSessionMessage;
}
