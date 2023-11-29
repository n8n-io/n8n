import { inject } from 'vue';
import { ChatOptionsSymbol } from '@/constants';
import type { ChatOptions } from '@/types';

export function useOptions() {
	const options = inject(ChatOptionsSymbol) as ChatOptions;

	return {
		options,
	};
}
