import type { ChatMessage } from '@/types/messages';
import type { Ref } from 'vue';

export interface Chat {
	initialMessages: Ref<ChatMessage[]>;
	messages: Ref<ChatMessage[]>;
	currentSessionId: Ref<string | null>;
	waitingForResponse: Ref<boolean>;
	loadPreviousSession: () => Promise<string>;
	startNewSession: () => Promise<void>;
	sendMessage: (text: string) => Promise<void>;
}
