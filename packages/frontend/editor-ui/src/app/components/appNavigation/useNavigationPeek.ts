import { onScopeDispose, ref, toValue, type MaybeRefOrGetter } from 'vue';

export const PEEK_OPEN_DELAY = 300;
export const PEEK_CLOSE_DELAY = 200;

/**
 * The floating panel of the collapsed navigation. Hovering a rail item opens its panel
 * after a short delay, so a pointer that only crosses the rail opens nothing. Once a panel
 * is open, the next rail item switches it at once. The panel closes a moment after the
 * pointer leaves both the rail and the panel, so a short gap between them does not close it.
 */
export function useNavigationPeek(
	options: {
		enabled?: MaybeRefOrGetter<boolean>;
		openDelay?: number;
		closeDelay?: number;
	} = {},
) {
	const { enabled = true, openDelay = PEEK_OPEN_DELAY, closeDelay = PEEK_CLOSE_DELAY } = options;

	const peekItemId = ref<string | null>(null);
	let openTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function clearTimers() {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
		openTimer = undefined;
		closeTimer = undefined;
	}

	function onItemEnter(itemId: string) {
		if (!toValue(enabled)) return;
		clearTimers();
		if (peekItemId.value !== null) {
			peekItemId.value = itemId;
			return;
		}
		openTimer = setTimeout(() => {
			openTimer = undefined;
			peekItemId.value = itemId;
		}, openDelay);
	}

	/** The pointer left the rail or the panel. */
	function onLeave() {
		clearTimeout(openTimer);
		openTimer = undefined;
		if (peekItemId.value === null || closeTimer) return;
		closeTimer = setTimeout(() => {
			closeTimer = undefined;
			peekItemId.value = null;
		}, closeDelay);
	}

	/** The pointer reached the panel, or came back to the rail, before it closed. */
	function onPanelEnter() {
		clearTimeout(closeTimer);
		closeTimer = undefined;
	}

	function close() {
		clearTimers();
		peekItemId.value = null;
	}

	onScopeDispose(clearTimers);

	return { peekItemId, onItemEnter, onLeave, onPanelEnter, close };
}
