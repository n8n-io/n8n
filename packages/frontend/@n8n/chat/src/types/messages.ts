export type ChatMessage<T = Record<string, unknown>> =
	| ChatMessageComponent<T>
	| ChatMessageText
	| ChatMessageRich;

export interface ChatMessageComponent<T = Record<string, unknown>> extends ChatMessageBase {
	type: 'component';
	key: string;
	arguments: T;
}

export interface ChatMessageText extends ChatMessageBase {
	type?: 'text';
	text: string;
}

export interface ChatMessageRich extends ChatMessageBase {
	type: 'rich';
	content: RichContent;
}

export interface RichContent {
	html?: string;
	css?: string;
	script?: string;
	data?: Record<string, unknown>;
	components?: RichComponent[];
	// Sanitization level: 'none' | 'basic' | 'strict'
	sanitize?: 'none' | 'basic' | 'strict';
}

export interface RichComponent {
	type: 'button' | 'form' | 'chart' | 'table' | 'image' | 'video' | 'iframe';
	id: string;
	props: Record<string, unknown>;
	events?: Record<string, string>; // Event handlers as string functions
	style?: Record<string, string>;
}

interface ChatMessageBase {
	id: string;
	transparent?: boolean;
	sender: 'user' | 'bot';
	files?: File[];
}
