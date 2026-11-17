import { onScopeDispose, ref, toValue, type MaybeRefOrGetter } from 'vue';

export const PEEK_OPEN_DELAY = 200;
export const PEEK_CLOSE_DELAY = 150;
/** How long an open panel waits for the next navigation to mount, see `carryOver` */
export const PEEK_CARRY_OVER_WINDOW = 2000;

// Each layout mounts its own navigation, so a page with another layout, such as the
// Assistant, mounts a new one. The open panel is handed to it, so it does not close and open.
const handoff = { itemId: null as string | null, at: 0 };

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
		/** Keep the open panel when the navigation unmounts and a new one mounts soon after */
		carryOver?: boolean;
	} = {},
) {
	const {
		enabled = true,
		openDelay = PEEK_OPEN_DELAY,
		closeDelay = PEEK_CLOSE_DELAY,
		carryOver = false,
	} = options;

	const handedOver =
		carryOver && Date.now() - handoff.at <= PEEK_CARRY_OVER_WINDOW ? handoff.itemId : null;
	handoff.itemId = null;
	const peekItemId = ref<string | null>(toValue(enabled) ? handedOver : null);
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

	onScopeDispose(() => {
		clearTimers();
		if (!carryOver) return;
		handoff.itemId = peekItemId.value;
		handoff.at = Date.now();
	});

	return { peekItemId, onItemEnter, onLeave, onPanelEnter, close };
}
