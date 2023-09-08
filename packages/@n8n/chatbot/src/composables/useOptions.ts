import { inject } from 'vue';
import { ChatbotOptionsSymbol } from '@/constants';

export function useOptions() {
	const options = inject(ChatbotOptionsSymbol);

	return {
		options,
	};
}
