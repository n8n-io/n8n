export namespace ChatUI {
	export interface TextMessage {
		role: 'assistant' | 'user';
		type: 'text';
		content: string;
	}

	export interface SummaryBlock {
		role: 'assistant';
		type: 'block';
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
		type: 'event';
		eventName: 'end-session';
	}

	export interface QuickReply {
		type: string;
		text: string;
	}

	export interface ErrorMessage {
		role: 'assistant';
		type: 'error';
		content: string;
	}

	type MessagesWithReplies = (TextMessage | CodeDiffMessage | SummaryBlock) & {
		quickReplies?: QuickReply[];
	};

	export type AssistantMessage = (MessagesWithReplies | ErrorMessage | EndSessionMessage) & {
		id: string;
		read: boolean;
	};
}
