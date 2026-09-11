import type { BrowserAutomationIdea } from '@n8n/api-types';
import { onMounted, onUnmounted, ref } from 'vue';

import type { BackgroundPushMessage, RecommendationsStatus } from '../../types';

export function useRecommendations() {
	const status = ref<RecommendationsStatus>('loading');
	const ideas = ref<BrowserAutomationIdea[]>([]);
	// True for the duration of one `send()` call, so the UI can disable the other cards —
	// picking a second idea before the first confirms would fire two independent builds.
	const isSending = ref(false);

	async function send(idea: BrowserAutomationIdea): Promise<void> {
		if (isSending.value) return;
		isSending.value = true;
		try {
			await chrome.runtime.sendMessage({ type: 'sendRecommendation', idea });
		} finally {
			isSending.value = false;
		}
	}

	function onMessage(message: BackgroundPushMessage): void {
		if (message.type !== 'recommendationsChanged') return;
		status.value = message.status;
		ideas.value = message.ideas ?? [];
	}

	async function refresh(): Promise<void> {
		await chrome.runtime.sendMessage({ type: 'getRecommendations' });
	}

	chrome.runtime.onMessage.addListener(onMessage);

	onMounted(refresh);

	onUnmounted(() => chrome.runtime.onMessage.removeListener(onMessage));

	return { status, ideas, isSending, send, refresh };
}
