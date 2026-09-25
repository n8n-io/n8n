import { onScopeDispose, ref } from 'vue';

// The pointer must move this far sideways before a press becomes a drag, so a
// click still selects the tab.
const DRAG_THRESHOLD_PX = 4;

/** Marks an element inside a tab, such as the close button, that does not start a drag. */
export const TAB_DRAG_IGNORE_ATTRIBUTE = 'data-tab-drag-ignore';

interface TabBox {
	id: string;
	left: number;
	width: number;
}

interface DragState {
	tabId: string;
	pointerId: number;
	startX: number;
	boxes: TabBox[];
	fromIndex: number;
	targetIndex: number;
}

const center = (box: TabBox) => box.left + box.width / 2;

/**
 * Drag tabs sideways to reorder them, like browser tabs. The dragged tab
 * follows the pointer and the other tabs move aside. The new order applies
 * when the pointer is released.
 */
export function useTabDragReorder({
	getTabElements,
	onReorder,
	onDragStart,
}: {
	/** The tab elements in display order. Each has a `data-tab-item-id` attribute. */
	getTabElements: () => HTMLElement[];
	onReorder: (tabId: string, toIndex: number) => void;
	onDragStart?: () => void;
}) {
	const draggedTabId = ref<string>();
	// Horizontal offset in pixels for each tab while a drag runs.
	const offsets = ref<Record<string, number>>({});
	let state: DragState | null = null;

	function measure(): TabBox[] {
		return getTabElements().map((element) => {
			const rect = element.getBoundingClientRect();
			return { id: element.dataset.tabItemId ?? '', left: rect.left, width: rect.width };
		});
	}

	function update(deltaX: number) {
		if (!state) return;
		const { boxes, fromIndex } = state;
		const dragged = boxes[fromIndex];
		const first = boxes[0];
		const last = boxes[boxes.length - 1];

		// Keep the dragged tab inside the row of tabs.
		const minDelta = first.left - dragged.left;
		const maxDelta = last.left + last.width - (dragged.left + dragged.width);
		const delta = Math.max(minDelta, Math.min(deltaX, maxDelta));
		const draggedLeft = dragged.left + delta;
		const draggedRight = draggedLeft + dragged.width;

		// The leading edge of the dragged tab passes a tab at its center. A center
		// check could not pass a first or last tab that is narrower than the dragged one.
		let targetIndex = fromIndex;
		for (let i = fromIndex + 1; i < boxes.length; i++) {
			if (draggedRight > center(boxes[i])) targetIndex = i;
		}
		for (let i = fromIndex - 1; i >= 0; i--) {
			if (draggedLeft < center(boxes[i])) targetIndex = i;
		}
		state.targetIndex = targetIndex;

		// A tab that moves aside moves by the dragged tab's width plus the gap.
		const gap = boxes.length > 1 ? boxes[1].left - (boxes[0].left + boxes[0].width) : 0;
		const step = dragged.width + gap;
		const next: Record<string, number> = { [dragged.id]: delta };
		for (let i = fromIndex + 1; i <= targetIndex; i++) next[boxes[i].id] = -step;
		for (let i = targetIndex; i < fromIndex; i++) next[boxes[i].id] = step;
		offsets.value = next;
	}

	function onPointerMove(event: PointerEvent) {
		if (!state || event.pointerId !== state.pointerId) return;
		const deltaX = event.clientX - state.startX;
		if (draggedTabId.value === undefined) {
			if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
			draggedTabId.value = state.tabId;
			onDragStart?.();
		}
		event.preventDefault();
		update(deltaX);
	}

	function stop(commit: boolean) {
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
		window.removeEventListener('pointercancel', onPointerCancel);
		window.removeEventListener('keydown', onKeyDown, true);

		const finished = state;
		const wasDragging = draggedTabId.value !== undefined;
		state = null;
		// Reset before the reorder, so the tabs land in their new places without an animation.
		draggedTabId.value = undefined;
		offsets.value = {};
		if (commit && wasDragging && finished && finished.targetIndex !== finished.fromIndex) {
			onReorder(finished.tabId, finished.targetIndex);
		}
	}

	function onPointerUp(event: PointerEvent) {
		if (state && event.pointerId === state.pointerId) stop(true);
	}

	function onPointerCancel(event: PointerEvent) {
		if (state && event.pointerId === state.pointerId) stop(false);
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key !== 'Escape' || draggedTabId.value === undefined) return;
		event.preventDefault();
		event.stopPropagation();
		stop(false);
	}

	function onPointerDown(tabId: string, event: PointerEvent) {
		// Touch drags scroll the tab row instead.
		if (event.button !== 0 || event.pointerType === 'touch' || state) return;
		if (event.target instanceof Element && event.target.closest(`[${TAB_DRAG_IGNORE_ATTRIBUTE}]`)) {
			return;
		}

		const boxes = measure();
		const fromIndex = boxes.findIndex((box) => box.id === tabId);
		if (fromIndex === -1 || boxes.length < 2) return;

		state = {
			tabId,
			pointerId: event.pointerId,
			startX: event.clientX,
			boxes,
			fromIndex,
			targetIndex: fromIndex,
		};
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerCancel);
		window.addEventListener('keydown', onKeyDown, true);
	}

	onScopeDispose(() => stop(false));

	return { draggedTabId, offsets, onPointerDown };
}
