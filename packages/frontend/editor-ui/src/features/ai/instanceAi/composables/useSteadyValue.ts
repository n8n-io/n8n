import { onScopeDispose, shallowRef, watch } from 'vue';

const DEFAULT_SETTLE_MS = 400;
const DEFAULT_MIN_DISPLAY_MS = 1500;
const DEFAULT_MAX_WAIT_MS = 3000;

/**
 * Follows a value that can change many times a second, so that a status text
 * does not flash. A new value shows once it has held for `settleMs`, and a
 * shown value stays for at least `minDisplayMs`. Values in between are
 * skipped. A change never waits longer than `maxWaitMs`. An urgent value, the
 * value after it, and no value show at once.
 */
export function useSteadyValue<T>(
	source: () => T | undefined,
	options: {
		/** Values with the same key read the same, so they replace each other at once. */
		key: (value: T) => string;
		urgent?: (value: T) => boolean;
		settleMs?: number;
		minDisplayMs?: number;
		maxWaitMs?: number;
	},
) {
	const {
		key,
		urgent = () => false,
		settleMs = DEFAULT_SETTLE_MS,
		minDisplayMs = DEFAULT_MIN_DISPLAY_MS,
		maxWaitMs = DEFAULT_MAX_WAIT_MS,
	} = options;
	const shown = shallowRef(source());
	let shownAt = Date.now();
	let pendingSince: number | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function cancelPending() {
		clearTimeout(timer);
		timer = undefined;
		pendingSince = undefined;
	}

	function show(value: T | undefined) {
		cancelPending();
		shown.value = value;
		shownAt = Date.now();
	}

	function showsAtOnce(next: T | undefined): boolean {
		const current = shown.value;
		return next === undefined || urgent(next) || (current !== undefined && urgent(current));
	}

	watch(source, (next) => {
		const current = shown.value;
		if (next !== undefined && current !== undefined && key(next) === key(current)) {
			cancelPending();
			shown.value = next;
			return;
		}
		if (showsAtOnce(next)) {
			show(next);
			return;
		}
		const now = Date.now();
		pendingSince ??= now;
		const delay = Math.min(
			Math.max(settleMs, minDisplayMs - (now - shownAt)),
			maxWaitMs - (now - pendingSince),
		);
		clearTimeout(timer);
		timer = setTimeout(() => show(source()), Math.max(0, delay));
	});

	onScopeDispose(cancelPending);

	return shown;
}
