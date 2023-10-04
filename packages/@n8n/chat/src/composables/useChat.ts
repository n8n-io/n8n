import { inject } from 'vue';
import { ChatSymbol } from '@/constants';
import type { Chat } from '@/types';

export function useChat() {
	return inject(ChatSymbol) as Chat;
}
