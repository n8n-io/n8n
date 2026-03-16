interface ConversationMessage {
	role: 'user' | 'assistant';
	content: string;
}

const conversations = new Map<string, ConversationMessage[]>();

export function getConversation(sessionId: string): ConversationMessage[] {
	return conversations.get(sessionId) ?? [];
}

export function addMessage(sessionId: string, message: ConversationMessage): void {
	if (!message?.role || !message?.content) return;
	const messages = conversations.get(sessionId) ?? [];
	messages.push(message);
	conversations.set(sessionId, messages);
}

export function clearConversation(sessionId: string): void {
	conversations.delete(sessionId);
}
