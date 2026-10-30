import { useMediaQuery } from '@vueuse/core';
import { computed, onScopeDispose, shallowRef, watch } from 'vue';

const DEFAULT_INTERVAL_MS = 80;
const DEFAULT_MAX_DURATION_MS = 1200;

/**
 * Shows the items of a list one at a time, so new items join with a rhythm
 * instead of all together. Removed items go at once. A long queue uses a
 * shorter interval, so it never takes longer than `maxDurationMs`. With
 * reduced motion, all items show at once.
 */
export function useStaggeredList<T>(
	source: () => readonly T[],
	options: { key: (item: T) => string; intervalMs?: number; maxDurationMs?: number },
) {
	const {
		key,
		intervalMs = DEFAULT_INTERVAL_MS,
		maxDurationMs = DEFAULT_MAX_DURATION_MS,
	} = options;
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
	const revealed = shallowRef(new Set<string>());
	let timer: ReturnType<typeof setTimeout> | undefined;
	// Kept until the queue empties, so the interval does not grow as the queue shrinks.
	let batchInterval = intervalMs;

	function pendingKeys(): string[] {
		return source()
			.map(key)
			.filter((itemKey) => !revealed.value.has(itemKey));
	}

	function reveal(keys: string[]) {
		revealed.value = new Set([...revealed.value, ...keys]);
	}

	function schedule() {
		if (timer !== undefined) return;
		const pending = pendingKeys();
		if (pending.length === 0) {
			batchInterval = intervalMs;
			return;
		}
		if (reducedMotion.value) {
			reveal(pending);
			return;
		}
		batchInterval = Math.min(batchInterval, maxDurationMs / pending.length);
		timer = setTimeout(() => {
			timer = undefined;
			const [next] = pendingKeys();
			if (next !== undefined) reveal([next]);
			schedule();
		}, batchInterval);
	}

	watch(
		() => source().map(key),
		(keys) => {
			const current = new Set(keys);
			const kept = [...revealed.value].filter((itemKey) => current.has(itemKey));
			if (kept.length !== revealed.value.size) revealed.value = new Set(kept);
			schedule();
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		clearTimeout(timer);
		timer = undefined;
	});

	return computed(() => source().filter((item) => revealed.value.has(key(item))));
}
