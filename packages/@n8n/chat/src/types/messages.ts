export interface ChatMessage {
	id: string;
	text: string;
	createdAt: string;
	sender: 'user' | 'bot';
}
