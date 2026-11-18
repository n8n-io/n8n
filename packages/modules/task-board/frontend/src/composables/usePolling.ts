import { useDocumentVisibility, useIntervalFn } from '@vueuse/core';
import { watch } from 'vue';

export type PollingOptions = {
	intervalMs: number;
	/** Polls only while this returns true, for example while a panel is open. */
	enabled?: () => boolean;
};

/**
 * Runs `poll` at an interval while the tab is visible. It polls once more when the tab
 * becomes visible again. A run that is still in flight skips the next tick. The interval
 * stops when the calling component unmounts.
 */
export function usePolling(poll: () => Promise<void>, options: PollingOptions) {
	const visibility = useDocumentVisibility();
	let running = false;

	async function tick() {
		if (running || visibility.value !== 'visible') return;
		if (options.enabled && !options.enabled()) return;
		running = true;
		try {
			await poll();
		} finally {
			running = false;
		}
	}

	const { pause, resume } = useIntervalFn(() => {
		void tick();
	}, options.intervalMs);

	watch(visibility, (state) => {
		if (state === 'visible') {
			resume();
			void tick();
		} else {
			pause();
		}
	});

	return { pause, resume };
}
