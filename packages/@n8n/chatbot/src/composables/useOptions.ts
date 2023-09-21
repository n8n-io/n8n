import { inject } from 'vue';
import { ChatbotOptionsSymbol } from '@/constants';
import type { ChatbotOptions } from '@/types';

export function useOptions() {
	const options = inject(ChatbotOptionsSymbol) as ChatbotOptions;

	return {
		options,
	};
}
