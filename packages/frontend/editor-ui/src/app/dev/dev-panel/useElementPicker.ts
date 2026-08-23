import { onUnmounted, ref, shallowRef } from 'vue';

export const DEV_PANEL_ROOT_ATTR = 'data-dev-panel-root';
const DRAG_THRESHOLD = 5;
const MIN_ELEMENT_SIZE = 8;

function isInsideDevPanel(el: Element | null): boolean {
	let current = el;
	while (current) {
		if (current.hasAttribute(DEV_PANEL_ROOT_ATTR)) return true;
		current = current.parentElement;
	}
	return false;
}

export type DragRect = { x: number; y: number; width: number; height: number };

export type PickOptions = {
	onShiftPick?: (el: Element) => void;
	onDragSelect?: (els: Element[]) => void;
};

function collectElementsInRect(rect: DragRect): Element[] {
	const candidates: Element[] = [];
	const set = new Set<Element>();
	const all = document.body.querySelectorAll('*');
	for (const el of all) {
		if (isInsideDevPanel(el)) continue;
		const tag = el.tagName;
		if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META') continue;
		const r = el.getBoundingClientRect();
		if (r.width < MIN_ELEMENT_SIZE || r.height < MIN_ELEMENT_SIZE) continue;
		if (
			r.left < rect.x ||
			r.top < rect.y ||
			r.right > rect.x + rect.width ||
			r.bottom > rect.y + rect.height
		) {
			continue;
		}
		candidates.push(el);
		set.add(el);
	}
	return candidates.filter((el) => {
		let parent = el.parentElement;
		while (parent) {
			if (set.has(parent)) return false;
			parent = parent.parentElement;
		}
		return true;
	});
}

export function useElementPicker() {
	const isPicking = ref(false);
	const hoveredElement = shallowRef<Element | null>(null);
	const selectedElement = shallowRef<Element | null>(null);
	const dragRect = shallowRef<DragRect | null>(null);
	let shiftPickHandler: ((el: Element) => void) | null = null;
	let dragSelectHandler: ((els: Element[]) => void) | null = null;
	let dragStart: { x: number; y: number } | null = null;
	let dragging = false;

	function suppressClickOnce() {
		const handler = (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			document.removeEventListener('click', handler, true);
		};
		document.addEventListener('click', handler, true);
	}

	function handleMouseDown(event: MouseEvent) {
		if (event.button !== 0) return;
		const target = document.elementFromPoint(event.clientX, event.clientY);
		if (!target || isInsideDevPanel(target)) return;
		event.preventDefault();
		window.getSelection()?.removeAllRanges();
		dragStart = { x: event.clientX, y: event.clientY };
		dragging = false;
	}

	function handleMouseMove(event: MouseEvent) {
		if (dragStart) {
			const dx = event.clientX - dragStart.x;
			const dy = event.clientY - dragStart.y;
			if (!dragging && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
				dragging = true;
				hoveredElement.value = null;
			}
			if (dragging) {
				dragRect.value = {
					x: Math.min(event.clientX, dragStart.x),
					y: Math.min(event.clientY, dragStart.y),
					width: Math.abs(dx),
					height: Math.abs(dy),
				};
				event.preventDefault();
				return;
			}
		}
		const target = document.elementFromPoint(event.clientX, event.clientY);
		if (!target || isInsideDevPanel(target)) {
			hoveredElement.value = null;
			return;
		}
		hoveredElement.value = target;
	}

	function handleMouseUp(event: MouseEvent) {
		if (!dragStart) return;
		const wasDrag = dragging;
		const rect = dragRect.value;
		dragStart = null;
		dragging = false;
		dragRect.value = null;
		if (!wasDrag || !rect) return;
		event.preventDefault();
		event.stopPropagation();
		suppressClickOnce();
		if (!dragSelectHandler) return;
		const els = collectElementsInRect(rect);
		if (els.length > 0) dragSelectHandler(els);
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
			if (dragStart) {
				dragStart = null;
				dragging = false;
				dragRect.value = null;
				return;
			}
			stop();
		}
	}

	let previousUserSelect = '';

	function start(options?: PickOptions) {
		if (isPicking.value) return;
		shiftPickHandler = options?.onShiftPick ?? null;
		dragSelectHandler = options?.onDragSelect ?? null;
		isPicking.value = true;
		hoveredElement.value = null;
		dragRect.value = null;
		previousUserSelect = document.body.style.userSelect;
		document.body.style.userSelect = 'none';
		document.addEventListener('mousedown', handleMouseDown, true);
		document.addEventListener('mousemove', handleMouseMove, true);
		document.addEventListener('mouseup', handleMouseUp, true);
		document.addEventListener('click', handleClick, true);
		document.addEventListener('keydown', handleKeyDown, true);
	}

	function stop() {
		if (!isPicking.value) return;
		isPicking.value = false;
		hoveredElement.value = null;
		dragRect.value = null;
		dragStart = null;
		dragging = false;
		shiftPickHandler = null;
		dragSelectHandler = null;
		document.body.style.userSelect = previousUserSelect;
		document.removeEventListener('mousedown', handleMouseDown, true);
		document.removeEventListener('mousemove', handleMouseMove, true);
		document.removeEventListener('mouseup', handleMouseUp, true);
		document.removeEventListener('click', handleClick, true);
		document.removeEventListener('keydown', handleKeyDown, true);
	}

	function clearSelection() {
		selectedElement.value = null;
	}

	onUnmounted(stop);

	return { isPicking, hoveredElement, selectedElement, dragRect, start, stop, clearSelection };
}
