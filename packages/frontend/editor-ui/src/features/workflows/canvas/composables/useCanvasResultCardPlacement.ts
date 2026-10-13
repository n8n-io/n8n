import { jsonParse } from 'n8n-workflow';
import { computed, inject, onBeforeUnmount, ref, type Ref } from 'vue';

import { CanvasKey } from '@/app/constants';

export const RESULT_CARD_PLACEMENT_STORAGE_KEY = 'n8n-canvas-result-card-placement';

export interface ResultCardOffset {
	x: number;
	y: number;
}

export interface ResultCardSize {
	width: number;
	height: number;
}

export interface ResultCardConnector {
	/** SVG path in the card container's coordinate space (negative values reach the node). */
	path: string;
	from: { x: number; y: number };
	to: { x: number; y: number };
}

type Placements = Record<string, Record<string, ResultCardOffset>>;

const isOffset = (value: unknown): value is ResultCardOffset =>
	typeof value === 'object' &&
	value !== null &&
	Number.isFinite((value as ResultCardOffset).x) &&
	Number.isFinite((value as ResultCardOffset).y);

function readAll(): Placements {
	try {
		const parsed = jsonParse<unknown>(localStorage.getItem(RESULT_CARD_PLACEMENT_STORAGE_KEY) ?? '', {
			fallbackValue: {},
		});
		if (typeof parsed !== 'object' || parsed === null) return {};
		const out: Placements = {};
		for (const [workflowId, byNode] of Object.entries(parsed as Record<string, unknown>)) {
			if (typeof byNode !== 'object' || byNode === null) continue;
			out[workflowId] = {};
			for (const [nodeId, offset] of Object.entries(byNode as Record<string, unknown>)) {
				if (isOffset(offset)) out[workflowId][nodeId] = { x: offset.x, y: offset.y };
			}
		}
		return out;
	} catch {
		return {};
	}
}

function writeOffset(workflowId: string, nodeId: string, offset: ResultCardOffset | null) {
	try {
		const all = readAll();
		const byNode = { ...(all[workflowId] ?? {}) };
		if (offset) byNode[nodeId] = offset;
		else delete byNode[nodeId];
		if (Object.keys(byNode).length) all[workflowId] = byNode;
		else delete all[workflowId];
		localStorage.setItem(RESULT_CARD_PLACEMENT_STORAGE_KEY, JSON.stringify(all));
	} catch {
		// view preference only; a missing store degrades to the default placement
	}
}

const ANCHORS = ['left', 'right', 'top', 'bottom'] as const;
type Side = (typeof ANCHORS)[number];

interface Anchor {
	x: number;
	y: number;
	side: Side;
}

function anchorsOf(x: number, y: number, width: number, height: number): Anchor[] {
	return [
		{ x, y: y + height / 2, side: 'left' },
		{ x: x + width, y: y + height / 2, side: 'right' },
		{ x: x + width / 2, y, side: 'top' },
		{ x: x + width / 2, y: y + height, side: 'bottom' },
	];
}

/** Outward unit normal of a side, used to bend the connector away from the box. */
const normal = (side: Side): ResultCardOffset =>
	side === 'left'
		? { x: -1, y: 0 }
		: side === 'right'
			? { x: 1, y: 0 }
			: side === 'top'
				? { x: 0, y: -1 }
				: { x: 0, y: 1 };

/**
 * Draws the connector between the node and the floating card stack as the
 * shortest edge-to-edge bezier. Everything is expressed in the card container's
 * own coordinate space, where the node sits at a negative x.
 */
export function connectorFor(
	offset: ResultCardOffset,
	gap: number,
	node: ResultCardSize,
	card: ResultCardSize,
): ResultCardConnector | null {
	if (!node.width || !node.height || !card.width || !card.height) return null;
	// By default the container's left edge is `gap` right of the node and its
	// vertical centre matches the node's; the offset shifts the container away.
	const nodeX = -(gap + offset.x) - node.width;
	const nodeY = card.height / 2 - offset.y - node.height / 2;
	const nodeAnchors = anchorsOf(nodeX, nodeY, node.width, node.height);
	const cardAnchors = anchorsOf(0, 0, card.width, card.height);

	let best: { from: Anchor; to: Anchor; distance: number } | null = null;
	for (const from of nodeAnchors) {
		for (const to of cardAnchors) {
			const distance = Math.hypot(to.x - from.x, to.y - from.y);
			if (!best || distance < best.distance) best = { from, to, distance };
		}
	}
	if (!best) return null;

	const bend = Math.max(24, Math.min(120, best.distance * 0.4));
	const n1 = normal(best.from.side);
	const n2 = normal(best.to.side);
	const c1 = { x: best.from.x + n1.x * bend, y: best.from.y + n1.y * bend };
	const c2 = { x: best.to.x + n2.x * bend, y: best.to.y + n2.y * bend };
	const f = (value: number) => value.toFixed(1);
	return {
		from: { x: best.from.x, y: best.from.y },
		to: { x: best.to.x, y: best.to.y },
		path: `M${f(best.from.x)} ${f(best.from.y)} C${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(best.to.x)} ${f(best.to.y)}`,
	};
}

/**
 * Where a node's result cards sit relative to the node. The user drags the
 * stack anywhere around the node; the offset is kept in canvas units (so it
 * survives zooming) and remembered per workflow + node in localStorage.
 */
export function useCanvasResultCardPlacement(options: {
	workflowId: Ref<string>;
	nodeId: Ref<string>;
	gap: number;
}) {
	const canvas = inject(CanvasKey, undefined);
	const zoom = computed(() => canvas?.viewport.value.zoom ?? 1);

	const key = computed(() => `${options.workflowId.value}:${options.nodeId.value}`);
	const stored = computed(
		() => readAll()[options.workflowId.value]?.[options.nodeId.value] ?? { x: 0, y: 0 },
	);
	const offset = ref<ResultCardOffset>({ ...stored.value });
	let loadedFor = key.value;

	/** Keeps the live offset in sync when the host node (or workflow) changes under us. */
	function ensureLoaded() {
		if (loadedFor === key.value) return;
		loadedFor = key.value;
		offset.value = { ...stored.value };
	}

	const isMoved = computed(() => {
		ensureLoaded();
		return offset.value.x !== 0 || offset.value.y !== 0;
	});

	const dragging = ref(false);
	let origin: { pointerX: number; pointerY: number; x: number; y: number } | null = null;
	let activePointer: number | null = null;
	let captured: HTMLElement | null = null;

	function onPointerMove(event: PointerEvent) {
		if (!origin || event.pointerId !== activePointer) return;
		const scale = zoom.value || 1;
		offset.value = {
			x: Math.round(origin.x + (event.clientX - origin.pointerX) / scale),
			y: Math.round(origin.y + (event.clientY - origin.pointerY) / scale),
		};
	}

	function endDrag(event?: PointerEvent) {
		if (event && event.pointerId !== activePointer) return;
		if (!dragging.value) return;
		dragging.value = false;
		origin = null;
		activePointer = null;
		if (captured) {
			captured.removeEventListener('pointermove', onPointerMove);
			captured.removeEventListener('pointerup', endDrag);
			captured.removeEventListener('pointercancel', endDrag);
			captured = null;
		}
		writeOffset(
			options.workflowId.value,
			options.nodeId.value,
			isMoved.value ? { ...offset.value } : null,
		);
	}

	function startDrag(event: PointerEvent) {
		if (event.button !== 0 && event.pointerType === 'mouse') return;
		ensureLoaded();
		event.preventDefault();
		event.stopPropagation();
		const target = event.currentTarget;
		if (!(target instanceof HTMLElement)) return;
		dragging.value = true;
		activePointer = event.pointerId;
		origin = {
			pointerX: event.clientX,
			pointerY: event.clientY,
			x: offset.value.x,
			y: offset.value.y,
		};
		captured = target;
		target.setPointerCapture?.(event.pointerId);
		target.addEventListener('pointermove', onPointerMove);
		target.addEventListener('pointerup', endDrag);
		target.addEventListener('pointercancel', endDrag);
	}

	function reset() {
		ensureLoaded();
		offset.value = { x: 0, y: 0 };
		writeOffset(options.workflowId.value, options.nodeId.value, null);
	}

	/** Arrow keys nudge the stack by a canvas unit step so the handle works without a mouse. */
	function nudge(dx: number, dy: number) {
		ensureLoaded();
		offset.value = { x: offset.value.x + dx, y: offset.value.y + dy };
		writeOffset(
			options.workflowId.value,
			options.nodeId.value,
			isMoved.value ? { ...offset.value } : null,
		);
	}

	const transform = computed(() => {
		ensureLoaded();
		const { x, y } = offset.value;
		return `translate(${options.gap + x}px, calc(-50% + ${y}px))`;
	});

	onBeforeUnmount(() => endDrag());

	return { offset, isMoved, dragging, transform, startDrag, reset, nudge, zoom };
}
