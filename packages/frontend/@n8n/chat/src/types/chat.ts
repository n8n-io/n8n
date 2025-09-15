import type { Ref } from 'vue';

import type { ChatMessage } from '@n8n/chat/types/messages';

import type { SendMessageResponse } from './webhook';

export interface Chat {
	currentSessionId: Ref<string | null>;
	waitingForResponse: Ref<boolean>;
	loadPreviousSession?: () => Promise<string | undefined>;
	startNewSession?: () => Promise<void>;
	sendMessage: (text: string, files?: File[]) => Promise<SendMessageResponse | null>;
	ws?: WebSocket | null;
	initialMessages: Ref<ChatMessage[]>;
	messages: Ref<ChatMessage[]>;
}
