import type { Ref } from 'vue';
import { ref, unref } from 'vue';

import { getMousePosition } from '@/utils/nodeViewUtils';
import { useUIStore } from '@/stores/ui.store';
import { useDeviceSupport } from 'n8n-design-system';

export function useCanvasPanning(elementRef: Ref<HTMLElement>) {
	const uiStore = useUIStore();
	const moveLastPosition = ref([0, 0]);
	const deviceSupport = useDeviceSupport();

	function panCanvas(e: MouseEvent) {
		const offsetPosition = uiStore.nodeViewOffsetPosition;

		const [x, y] = getMousePosition(e);

		const nodeViewOffsetPositionX = offsetPosition[0] + (x - moveLastPosition.value[0]);
		const nodeViewOffsetPositionY = offsetPosition[1] + (y - moveLastPosition.value[1]);
		uiStore.nodeViewOffsetPosition = [nodeViewOffsetPositionX, nodeViewOffsetPositionY];

		// Update the last position
		moveLastPosition.value[0] = x;
		moveLastPosition.value[1] = y;
	}

	function onMouseDown(e: MouseEvent, moveButtonPressed: boolean) {
		if (!deviceSupport.isCtrlKeyPressed(e) && !moveButtonPressed) {
			// We only care about it when the ctrl key is pressed at the same time.
			// So we exit when it is not pressed.
			return;
		}

		if (uiStore.isActionActive('dragActive')) {
			// If a node does currently get dragged we do not activate the selection
			return;
		}

		// Prevent moving canvas on anything but middle button
		if (e.button !== 1) {
			uiStore.nodeViewMoveInProgress = true;
		}

		const [x, y] = getMousePosition(e);

		moveLastPosition.value[0] = x;
		moveLastPosition.value[1] = y;

		const element = unref(elementRef);
		element.addEventListener('mousemove', onMouseMove);
	}

	function onMouseUp(e: MouseEvent) {
		if (!uiStore.nodeViewMoveInProgress) {
			// If it is not active return directly.
			// Else normal node dragging will not work.
			return;
		}

		const element = unref(elementRef);
		element.removeEventListener('mousemove', onMouseMove);

		uiStore.nodeViewMoveInProgress = false;

		// Nothing else to do. Simply leave the node view at the current offset
	}

	function onMouseMove(e: MouseEvent) {
		if (e.target && !e.target.id.includes('node-view')) {
			return;
		}

		if (uiStore.isActionActive('dragActive')) {
			return;
		}

		// Signal that moving canvas is active if middle button is pressed and mouse is moved
		if (e.buttons === 4) {
			uiStore.nodeViewMoveInProgress = true;
		}

		if (e.buttons === 0) {
			// Mouse button is not pressed anymore so stop selection mode
			// Happens normally when mouse leave the view pressed and then
			// comes back unpressed.
			onMouseUp(e);
			return;
		}

		panCanvas(e);
	}

	return {
		onMouseDown,
		onMouseUp,
		onMouseMove,
		panCanvas,
	};
}
