import type { BrowserAutomationIdea } from '@n8n/api-types';
import { onMounted, onUnmounted, ref } from 'vue';

import type { BackgroundPushMessage, RecommendationsStatus } from '../../types';

export function useRecommendations() {
	const status = ref<RecommendationsStatus>('loading');
	const ideas = ref<BrowserAutomationIdea[]>([]);

	async function send(idea: BrowserAutomationIdea): Promise<void> {
		await chrome.runtime.sendMessage({ type: 'sendRecommendation', idea });
	}

	function onMessage(message: BackgroundPushMessage): void {
		if (message.type !== 'recommendationsChanged') return;
		status.value = message.status;
		ideas.value = message.ideas ?? [];
	}

	chrome.runtime.onMessage.addListener(onMessage);

	onMounted(async () => {
		await chrome.runtime.sendMessage({ type: 'getRecommendations' });
	});

	onUnmounted(() => chrome.runtime.onMessage.removeListener(onMessage));

	return { status, ideas, send };
}
