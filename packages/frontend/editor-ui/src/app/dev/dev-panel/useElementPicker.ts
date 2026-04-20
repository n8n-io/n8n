import { onUnmounted, ref, shallowRef } from 'vue';

export const DEV_PANEL_ROOT_ATTR = 'data-dev-panel-root';

function isInsideDevPanel(el: Element | null): boolean {
	let current = el;
	while (current) {
		if (current.hasAttribute(DEV_PANEL_ROOT_ATTR)) return true;
		current = current.parentElement;
	}
	return false;
}

export type PickOptions = {
	onShiftPick?: (el: Element) => void;
};

export function useElementPicker() {
	const isPicking = ref(false);
	const hoveredElement = shallowRef<Element | null>(null);
	const selectedElement = shallowRef<Element | null>(null);
	let shiftPickHandler: ((el: Element) => void) | null = null;

	function handleMouseMove(event: MouseEvent) {
		const target = document.elementFromPoint(event.clientX, event.clientY);
		if (!target || isInsideDevPanel(target)) {
			hoveredElement.value = null;
			return;
		}
		hoveredElement.value = target;
	}

	function handleClick(event: MouseEvent) {
		const target = document.elementFromPoint(event.clientX, event.clientY);
		if (!target || isInsideDevPanel(target)) return;
		event.preventDefault();
		event.stopPropagation();

		if (event.shiftKey && shiftPickHandler) {
			shiftPickHandler(target);
			return;
		}

		selectedElement.value = target;
		stop();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			stop();
		}
	}

	function start(options?: PickOptions) {
		if (isPicking.value) return;
		shiftPickHandler = options?.onShiftPick ?? null;
		isPicking.value = true;
		hoveredElement.value = null;
		document.addEventListener('mousemove', handleMouseMove, true);
		document.addEventListener('click', handleClick, true);
		document.addEventListener('keydown', handleKeyDown, true);
	}

	function stop() {
		if (!isPicking.value) return;
		isPicking.value = false;
		hoveredElement.value = null;
		shiftPickHandler = null;
		document.removeEventListener('mousemove', handleMouseMove, true);
		document.removeEventListener('click', handleClick, true);
		document.removeEventListener('keydown', handleKeyDown, true);
	}

	function clearSelection() {
		selectedElement.value = null;
	}

	onUnmounted(stop);

	return { isPicking, hoveredElement, selectedElement, start, stop, clearSelection };
}
