import type { Ref } from 'vue';
import { ref, unref } from 'vue';

import { getMousePosition } from '@/utils/nodeViewUtils';
import { useUIStore } from '@/stores/ui.store';
import { useDeviceSupport } from 'n8n-design-system';
import { MOUSE_EVENT_BUTTON, MOUSE_EVENT_BUTTONS } from '@/constants';

/**
 * Composable for handling canvas panning interactions - it facilitates the movement of the
 * canvas element in response to mouse events
 */
export function useCanvasPanning(
	elementRef: Ref<null | HTMLElement>,
	options: {
		// @TODO To be refactored (unref) when migrating NodeView to composition API
		onMouseMoveEnd?: Ref<null | ((e: MouseEvent) => void)>;
	} = {},
) {
	const uiStore = useUIStore();
	const moveLastPosition = ref([0, 0]);
	const deviceSupport = useDeviceSupport();

	/**
	 * Updates the canvas offset position based on the mouse movement
	 */
	function panCanvas(e: MouseEvent) {
		const offsetPosition = uiStore.nodeViewOffsetPosition;

		const [x, y] = getMousePosition(e);

		const nodeViewOffsetPositionX = offsetPosition[0] + (x - moveLastPosition.value[0]);
		const nodeViewOffsetPositionY = offsetPosition[1] + (y - moveLastPosition.value[1]);
		uiStore.nodeViewOffsetPosition = [nodeViewOffsetPositionX, nodeViewOffsetPositionY];

		// Update the last position
		moveLastPosition.value = [x, y];

		return [nodeViewOffsetPositionX, nodeViewOffsetPositionY];
	}

	/**
	 * Initiates the panning process when specific conditions are met (middle mouse or ctrl key pressed)
	 */
	function onMouseDown(e: MouseEvent, moveButtonPressed: boolean) {
		if (!(deviceSupport.isCtrlKeyPressed(e) || moveButtonPressed)) {
			// We only care about it when the ctrl key is pressed at the same time.
			// So we exit when it is not pressed.
			return;
		}

		if (uiStore.isActionActive('dragActive')) {
			// If a node does currently get dragged we do not activate the selection
			return;
		}

		// Prevent moving canvas on anything but middle button
		if (e.button !== MOUSE_EVENT_BUTTON.MIDDLE) {
			uiStore.nodeViewMoveInProgress = true;
		}

		const [x, y] = getMousePosition(e);

		moveLastPosition.value = [x, y];

		const element = unref(elementRef);
		element?.addEventListener('mousemove', onMouseMove);
	}

	/**
	 * Ends the panning process and removes the mousemove event listener
	 */
	function onMouseUp() {
		if (!uiStore.nodeViewMoveInProgress) {
			// If it is not active return directly.
			// Else normal node dragging will not work.
			return;
		}

		const element = unref(elementRef);
		element?.removeEventListener('mousemove', onMouseMove);

		uiStore.nodeViewMoveInProgress = false;

		// Nothing else to do. Simply leave the node view at the current offset
	}

	/**
	 * Handles the actual movement of the canvas during a mouse drag,
	 * updating the position based on the current mouse position
	 */
	function onMouseMove(e: MouseEvent | TouchEvent) {
		const element = unref(elementRef);
		if (e.target && !(element === e.target || element?.contains(e.target as Node))) {
			return;
		}

		if (uiStore.isActionActive('dragActive')) {
			return;
		}

		// Signal that moving canvas is active if middle button is pressed and mouse is moved
		if (e instanceof MouseEvent && e.buttons === MOUSE_EVENT_BUTTONS.MIDDLE) {
			uiStore.nodeViewMoveInProgress = true;
		}

		if (e instanceof MouseEvent && e.buttons === MOUSE_EVENT_BUTTONS.NONE) {
			// Mouse button is not pressed anymore so stop selection mode
			// Happens normally when mouse leave the view pressed and then
			// comes back unpressed.
			const onMouseMoveEnd = unref(options.onMouseMoveEnd);
			onMouseMoveEnd?.(e);
			return;
		}

		panCanvas(e);
	}

	return {
		moveLastPosition,
		onMouseDown,
		onMouseUp,
		onMouseMove,
		panCanvas,
	};
}
