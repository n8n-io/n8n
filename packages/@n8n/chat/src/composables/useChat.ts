import { inject } from 'vue';

import { ChatSymbol } from '@n8n/chat/constants';
import type { Chat } from '@n8n/chat/types';

export function useChat() {
	return inject(ChatSymbol) as Chat;
}
