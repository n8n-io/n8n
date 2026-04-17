import { onMounted, onUnmounted, ref } from 'vue';

import { checkHealth } from './channelClient';

const POLL_INTERVAL_MS = 3000;

export type ChannelStatus = 'checking' | 'connected' | 'disconnected';

export function useChannelHealth() {
	const status = ref<ChannelStatus>('checking');
	let timer: ReturnType<typeof setTimeout> | null = null;
	let controller: AbortController | null = null;

	async function poll() {
		controller = new AbortController();
		const ok = await checkHealth(controller.signal);
		status.value = ok ? 'connected' : 'disconnected';
		timer = setTimeout(() => {
			void poll();
		}, POLL_INTERVAL_MS);
	}

	onMounted(() => {
		void poll();
	});

	onUnmounted(() => {
		if (timer) clearTimeout(timer);
		controller?.abort();
	});

	return { status };
}
