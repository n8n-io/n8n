export type ChatMessage<T = Record<string, unknown>> = ChatMessageComponent<T> | ChatMessageText;

export interface ChatMessageComponent<T = Record<string, unknown>> extends ChatMessageBase {
	type: 'component';
	key: string;
	arguments: T;
}

export interface ChatMessageText extends ChatMessageBase {
	type?: 'text';
	text: string;
}

interface ChatMessageBase {
	id: string;
	createdAt: string;
	transparent?: boolean;
	sender: 'user' | 'bot';
}
