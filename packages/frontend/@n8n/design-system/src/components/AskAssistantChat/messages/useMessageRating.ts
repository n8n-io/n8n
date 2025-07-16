import { computed } from 'vue';

import type { ChatUI } from '../../../types/assistant';

export function useMessageRating(message: ChatUI.AssistantMessage) {
	const ratingProps = computed(() => ({
		showRating: message.showRating,
		ratingStyle: message.ratingStyle,
		showFeedback: message.showFeedback,
	}));

	return {
		ratingProps,
	};
}
