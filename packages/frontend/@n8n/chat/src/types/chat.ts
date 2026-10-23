import type { Ref } from 'vue';

import type { CredentialStatus } from '@n8n/chat/types/credentialStatus';
import type { ChatMessage } from '@n8n/chat/types/messages';

import type { SendMessageResponse } from './webhook';

export interface Chat {
	initialMessages: Ref<ChatMessage[]>;
	messages: Ref<ChatMessage[]>;
	currentSessionId: Ref<string | null>;
	waitingForResponse: Ref<boolean>;
	blockUserInput: Ref<boolean>;
	credentialStatus: Ref<CredentialStatus | null>;
	loadPreviousSession?: () => Promise<string | undefined>;
	startNewSession?: () => Promise<void>;
	sendMessage: (text: string, files?: File[]) => Promise<SendMessageResponse | null>;
	ws?: WebSocket | null;
}
