<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { PreviewWorkflowNode, PreviewWorkflowOutput } from '../../../shared/workflow-diagram';
import ConnectionLine from './ConnectionLine.vue';
import NodeBox from './NodeBox.vue';
import StickyNoteBox from './StickyNoteBox.vue';

const NODE_WIDTH = 132;
const NODE_HEIGHT = 132;
const SUB_NODE_WIDTH = 112;
const SUB_NODE_HEIGHT = 126;
const ARROW_NODE_GAP = 18;
const STICKY_NOTE_NODE_GAP = 12;
const PADDING = 24;
const MIN_CANVAS_HEIGHT = 260;
const MAX_INITIAL_VIEW_WIDTH = 1200;
const FULL_WIDTH_FIT_THRESHOLD = 1500;
const MIN_ZOOM = 0.45;
const MAX_ZOOM = 2.6;
const LINE_WHEEL_DELTA = 16;

type DisplayNode = PreviewWorkflowNode & {
	x: number;
	y: number;
	width: number;
	height: number;
	renderVariant: 'node' | 'subNode' | 'stickyNote';
};

type SizedNode = PreviewWorkflowNode & {
	width: number;
	height: number;
	renderVariant: DisplayNode['renderVariant'];
};

type LayoutNode = SizedNode & {
	layoutPosition: [number, number];
};

type Rect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

const props = defineProps<{
	workflow: PreviewWorkflowOutput;
}>();

const camera = ref({ x: 0, y: 0, zoom: 1 });
const activePointer = ref<{ id: number; x: number; y: number } | null>(null);
const svgElement = ref<SVGSVGElement | null>(null);
const svgClientSize = ref({ width: 0, height: 0 });
const isPanning = computed(() => activePointer.value !== null);
let resizeObserver: ResizeObserver | undefined;

const auxiliarySourceNames = computed(() => {
	const names = new Set<string>();

	for (const [sourceName, outputsByType] of Object.entries(props.workflow.connections)) {
		for (const [connectionType, outputGroups] of Object.entries(outputsByType)) {
			if (connectionType === 'main') continue;

			if (outputGroups.some((connections) => connections && connections.length > 0)) {
				names.add(sourceName);
			}
		}
	}

	return names;
});

const nodesWithSize = computed(() =>
	props.workflow.nodes.map((node) => ({
		...node,
		...getNodeLayout(node, auxiliarySourceNames.value.has(node.name)),
	})),
);

const layoutNodes = computed(() => resolveStickyNoteCollisions(nodesWithSize.value));

const positionBounds = computed(() => {
	if (props.workflow.nodes.length === 0) {
		return { minX: 0, minY: 0, maxX: NODE_WIDTH, maxY: NODE_HEIGHT };
	}

	const minX = Math.min(...layoutNodes.value.map((node) => node.layoutPosition[0]));
	const minY = Math.min(...layoutNodes.value.map((node) => node.layoutPosition[1]));
	const maxX = Math.max(...layoutNodes.value.map((node) => node.layoutPosition[0] + node.width));
	const maxY = Math.max(...layoutNodes.value.map((node) => node.layoutPosition[1] + node.height));

	return { minX, minY, maxX, maxY };
});

const contentSize = computed(() => ({
	width: positionBounds.value.maxX - positionBounds.value.minX + PADDING * 2,
	height: positionBounds.value.maxY - positionBounds.value.minY + PADDING * 2,
}));

const canvasSize = computed(() => ({
	width: contentSize.value.width,
	height: Math.max(contentSize.value.height, MIN_CANVAS_HEIGHT),
}));

const displayNodes = computed(() =>
	layoutNodes.value.map((node) => ({
		...node,
		x: node.layoutPosition[0] - positionBounds.value.minX + PADDING,
		y:
			node.layoutPosition[1] -
			positionBounds.value.minY +
			PADDING +
			Math.max((canvasSize.value.height - contentSize.value.height) / 2, 0),
	})),
);

const stickyNodes = computed(() =>
	displayNodes.value.filter((node) => node.renderVariant === 'stickyNote'),
);

const workflowNodes = computed(() =>
	displayNodes.value.filter((node) => node.renderVariant !== 'stickyNote'),
);

const nodesByName = computed(
	() => new Map<string, DisplayNode>(displayNodes.value.map((node) => [node.name, node])),
);

const connectionLines = computed(() => {
	const lines: Array<{
		key: string;
		sourceX: number;
		sourceY: number;
		targetX: number;
		targetY: number;
		variant: 'main' | 'auxiliary';
	}> = [];

	for (const [sourceName, outputsByType] of Object.entries(props.workflow.connections)) {
		const sourceNode = nodesByName.value.get(sourceName);
		if (!sourceNode) continue;

		for (const [connectionType, outputGroups] of Object.entries(outputsByType)) {
			outputGroups.forEach((connections, outputIndex) => {
				connections?.forEach((connection, connectionIndex) => {
					const targetNode = nodesByName.value.get(connection.node);
					if (!targetNode) return;
					const variant = connectionType === 'main' ? 'main' : 'auxiliary';
					const anchors = getConnectionAnchors(sourceNode, targetNode, variant);

					lines.push({
						key: `${sourceName}-${connectionType}-${outputIndex}-${connection.node}-${connection.index}-${connectionIndex}`,
						...anchors,
						variant,
					});
				});
			});
		}
	}

	return lines;
});

const viewport = computed(() => {
	if (props.workflow.nodes.length === 0) {
		return {
			x: 0,
			y: 0,
			width: NODE_WIDTH + PADDING * 2,
			height: MIN_CANVAS_HEIGHT,
		};
	}

	return {
		x: 0,
		y: 0,
		width: canvasSize.value.width,
		height: canvasSize.value.height,
	};
});

const baseViewport = computed(() => ({
	x: viewport.value.x,
	y: viewport.value.y,
	width:
		viewport.value.width <= FULL_WIDTH_FIT_THRESHOLD
			? viewport.value.width
			: MAX_INITIAL_VIEW_WIDTH,
	height: viewport.value.height,
}));

const visibleViewport = computed(() => ({
	x: camera.value.x,
	y: camera.value.y,
	width: baseViewport.value.width / camera.value.zoom,
	height: baseViewport.value.height / camera.value.zoom,
}));

const viewBox = computed(() =>
	[
		visibleViewport.value.x,
		visibleViewport.value.y,
		visibleViewport.value.width,
		visibleViewport.value.height,
	].join(' '),
);

const diagramStyle = computed<Record<string, string>>(() => ({
	'--diagram-stroke-scale': getStrokeScale().toFixed(3),
}));

watch(
	() => [
		props.workflow.workflowId,
		props.workflow.execution?.id,
		baseViewport.value.x,
		baseViewport.value.y,
		baseViewport.value.width,
		baseViewport.value.height,
	],
	() => resetView(),
	{ immediate: true },
);

onMounted(() => {
	updateSvgClientSize();
	resizeObserver = new ResizeObserver(updateSvgClientSize);

	if (svgElement.value) {
		resizeObserver.observe(svgElement.value);
	}
});

onBeforeUnmount(() => {
	resizeObserver?.disconnect();
});

function getStrokeScale() {
	if (svgClientSize.value.width === 0 || svgClientSize.value.height === 0) return 1;

	const visible = visibleViewport.value;
	const scale = Math.min(
		svgClientSize.value.width / visible.width,
		svgClientSize.value.height / visible.height,
	);

	return clamp(scale, 0.38, 1);
}

function updateSvgClientSize() {
	const bounds = svgElement.value?.getBoundingClientRect();
	if (!bounds) return;

	svgClientSize.value = { width: bounds.width, height: bounds.height };
}

function getNodeLayout(node: PreviewWorkflowNode, isSubNode: boolean) {
	if (node.display?.variant === 'stickyNote') {
		return {
			width: clamp(node.display.width, 120, 1200),
			height: clamp(node.display.height, 80, 800),
			renderVariant: 'stickyNote' as const,
		};
	}

	if (isSubNode) {
		return { width: SUB_NODE_WIDTH, height: SUB_NODE_HEIGHT, renderVariant: 'subNode' as const };
	}

	return { width: NODE_WIDTH, height: NODE_HEIGHT, renderVariant: 'node' as const };
}

function resolveStickyNoteCollisions(nodes: SizedNode[]): LayoutNode[] {
	const workflowNodeRects = nodes
		.filter((node) => node.renderVariant !== 'stickyNote')
		.map((node) => expandRect(getNodeRect(node), STICKY_NOTE_NODE_GAP));

	return nodes.map((node) => {
		if (node.renderVariant !== 'stickyNote') {
			return { ...node, layoutPosition: node.position };
		}

		return {
			...node,
			layoutPosition: getNonOverlappingStickyNotePosition(node, workflowNodeRects),
		};
	});
}

function getNonOverlappingStickyNotePosition(
	stickyNote: SizedNode,
	workflowNodeRects: Rect[],
): [number, number] {
	if (workflowNodeRects.length === 0) return stickyNote.position;

	const originalRect = getNodeRect(stickyNote);
	if (!workflowNodeRects.some((rect) => rectsOverlap(originalRect, rect))) {
		return stickyNote.position;
	}

	const collisionBounds = getCollisionBounds(originalRect, workflowNodeRects);
	const candidates = getStickyNotePositionCandidates(originalRect, collisionBounds);
	const validCandidate = candidates.find((candidate) =>
		workflowNodeRects.every((rect) => !rectsOverlap(candidate, rect)),
	);

	if (validCandidate) return [validCandidate.x, validCandidate.y];

	const fallback = [...candidates].sort(
		(firstCandidate, secondCandidate) =>
			getTotalOverlapArea(firstCandidate, workflowNodeRects) -
				getTotalOverlapArea(secondCandidate, workflowNodeRects) ||
			getDistanceSquared(firstCandidate, originalRect) -
				getDistanceSquared(secondCandidate, originalRect),
	)[0];

	return fallback ? [fallback.x, fallback.y] : stickyNote.position;
}

function getStickyNotePositionCandidates(originalRect: Rect, collisionBounds: Rect) {
	const above = { ...originalRect, y: collisionBounds.y - originalRect.height };
	const below = { ...originalRect, y: collisionBounds.y + collisionBounds.height };
	const left = { ...originalRect, x: collisionBounds.x - originalRect.width };
	const right = { ...originalRect, x: collisionBounds.x + collisionBounds.width };

	const horizontalPositions = [originalRect.x, left.x, right.x];
	const verticalPositions = [above.y, below.y, originalRect.y];
	const mixedCandidates = horizontalPositions.flatMap((x) =>
		verticalPositions.map((y) => ({ ...originalRect, x, y })),
	);

	return sortByDistance([above, below, left, right, ...mixedCandidates], originalRect);
}

function getCollisionBounds(originalRect: Rect, workflowNodeRects: Rect[]) {
	const collidingRects = workflowNodeRects.filter((rect) => rectsOverlap(originalRect, rect));
	const minX = Math.min(...collidingRects.map((rect) => rect.x));
	const minY = Math.min(...collidingRects.map((rect) => rect.y));
	const maxX = Math.max(...collidingRects.map((rect) => rect.x + rect.width));
	const maxY = Math.max(...collidingRects.map((rect) => rect.y + rect.height));

	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function sortByDistance(candidates: Rect[], originalRect: Rect) {
	const uniqueCandidates = new Map<string, Rect>();

	for (const candidate of candidates) {
		uniqueCandidates.set(`${candidate.x},${candidate.y}`, candidate);
	}

	return Array.from(uniqueCandidates.values()).sort(
		(firstCandidate, secondCandidate) =>
			getDistanceSquared(firstCandidate, originalRect) -
			getDistanceSquared(secondCandidate, originalRect),
	);
}

function getNodeRect(node: SizedNode): Rect {
	return {
		x: node.position[0],
		y: node.position[1],
		width: node.width,
		height: node.height,
	};
}

function expandRect(rect: Rect, padding: number): Rect {
	return {
		x: rect.x - padding,
		y: rect.y - padding,
		width: rect.width + padding * 2,
		height: rect.height + padding * 2,
	};
}

function rectsOverlap(firstRect: Rect, secondRect: Rect) {
	return (
		firstRect.x < secondRect.x + secondRect.width &&
		firstRect.x + firstRect.width > secondRect.x &&
		firstRect.y < secondRect.y + secondRect.height &&
		firstRect.y + firstRect.height > secondRect.y
	);
}

function getTotalOverlapArea(rect: Rect, otherRects: Rect[]) {
	return otherRects.reduce(
		(totalArea, otherRect) => totalArea + getOverlapArea(rect, otherRect),
		0,
	);
}

function getOverlapArea(firstRect: Rect, secondRect: Rect) {
	const width =
		Math.min(firstRect.x + firstRect.width, secondRect.x + secondRect.width) -
		Math.max(firstRect.x, secondRect.x);
	const height =
		Math.min(firstRect.y + firstRect.height, secondRect.y + secondRect.height) -
		Math.max(firstRect.y, secondRect.y);

	return Math.max(0, width) * Math.max(0, height);
}

function getDistanceSquared(firstRect: Rect, secondRect: Rect) {
	return (firstRect.x - secondRect.x) ** 2 + (firstRect.y - secondRect.y) ** 2;
}

function getConnectionAnchors(
	sourceNode: DisplayNode,
	targetNode: DisplayNode,
	variant: 'main' | 'auxiliary',
) {
	const sourceCenter = getNodeCenter(sourceNode);
	const targetCenter = getNodeCenter(targetNode);
	const deltaX = targetCenter.x - sourceCenter.x;
	const deltaY = targetCenter.y - sourceCenter.y;
	const useVerticalAnchors = variant === 'auxiliary' || Math.abs(deltaY) > Math.abs(deltaX) * 1.25;

	if (useVerticalAnchors) {
		const targetIsBelow = targetCenter.y >= sourceCenter.y;

		return {
			sourceX: sourceCenter.x,
			sourceY: targetIsBelow
				? sourceNode.y + sourceNode.height + ARROW_NODE_GAP
				: sourceNode.y - ARROW_NODE_GAP,
			targetX: targetCenter.x,
			targetY: targetIsBelow
				? targetNode.y - ARROW_NODE_GAP
				: targetNode.y + targetNode.height + ARROW_NODE_GAP,
		};
	}

	const targetIsLeft = targetCenter.x < sourceCenter.x;

	return {
		sourceX: targetIsLeft
			? sourceNode.x - ARROW_NODE_GAP
			: sourceNode.x + sourceNode.width + ARROW_NODE_GAP,
		sourceY: sourceCenter.y,
		targetX: targetIsLeft
			? targetNode.x + targetNode.width + ARROW_NODE_GAP
			: targetNode.x - ARROW_NODE_GAP,
		targetY: targetCenter.y,
	};
}

function getNodeCenter(node: DisplayNode) {
	return {
		x: node.x + node.width / 2,
		y: node.y + node.height / 2,
	};
}

function handleWheel(event: WheelEvent) {
	event.preventDefault();

	const svg = event.currentTarget;
	if (!(svg instanceof SVGSVGElement)) return;

	const bounds = svg.getBoundingClientRect();
	if (bounds.width === 0 || bounds.height === 0) return;

	if (event.metaKey || event.ctrlKey) {
		const relativeX = (event.clientX - bounds.left) / bounds.width;
		const relativeY = (event.clientY - bounds.top) / bounds.height;
		const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, bounds.height);
		const zoomFactor = Math.exp(-deltaY * 0.0014);

		setZoom(camera.value.zoom * zoomFactor, relativeX, relativeY);
		return;
	}

	panByWheel(event, bounds);
}

function handlePointerDown(event: PointerEvent) {
	if (event.button !== 0) return;

	const svg = event.currentTarget;
	if (!(svg instanceof SVGSVGElement)) return;

	activePointer.value = { id: event.pointerId, x: event.clientX, y: event.clientY };
	svg.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
	if (!activePointer.value) return;

	const svg = event.currentTarget;
	if (!(svg instanceof SVGSVGElement)) return;

	const bounds = svg.getBoundingClientRect();
	if (bounds.width === 0 || bounds.height === 0) return;

	const deltaX = event.clientX - activePointer.value.x;
	const deltaY = event.clientY - activePointer.value.y;
	const visible = visibleViewport.value;

	activePointer.value = { id: event.pointerId, x: event.clientX, y: event.clientY };
	camera.value = {
		...camera.value,
		x: camera.value.x - (deltaX * visible.width) / bounds.width,
		y: camera.value.y - (deltaY * visible.height) / bounds.height,
	};
}

function handlePointerUp(event: PointerEvent) {
	const svg = event.currentTarget;
	if (svg instanceof SVGSVGElement && svg.hasPointerCapture(event.pointerId)) {
		svg.releasePointerCapture(event.pointerId);
	}

	activePointer.value = null;
}

function resetView() {
	camera.value = { x: baseViewport.value.x, y: baseViewport.value.y, zoom: 1 };
}

function setZoom(nextZoom: number, relativeX: number, relativeY: number) {
	const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
	const visible = visibleViewport.value;
	const anchorX = visible.x + visible.width * relativeX;
	const anchorY = visible.y + visible.height * relativeY;
	const nextWidth = baseViewport.value.width / zoom;
	const nextHeight = baseViewport.value.height / zoom;

	camera.value = {
		zoom,
		x: anchorX - nextWidth * relativeX,
		y: anchorY - nextHeight * relativeY,
	};
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function panByWheel(event: WheelEvent, bounds: DOMRect) {
	const visible = visibleViewport.value;
	const deltaX = normalizeWheelDelta(event.deltaX, event.deltaMode, bounds.width);
	const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, bounds.height);

	camera.value = {
		...camera.value,
		x: camera.value.x + (deltaX * visible.width) / bounds.width,
		y: camera.value.y + (deltaY * visible.height) / bounds.height,
	};
}

function normalizeWheelDelta(delta: number, deltaMode: number, pageDelta: number) {
	if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * LINE_WHEEL_DELTA;
	if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * pageDelta;

	return delta;
}
</script>

<template>
	<div class="diagram-frame" :class="{ 'is-panning': isPanning }">
		<svg
			ref="svgElement"
			class="workflow-svg"
			:style="diagramStyle"
			:width="baseViewport.width"
			:height="baseViewport.height"
			:viewBox="viewBox"
			preserveAspectRatio="xMinYMid meet"
			role="img"
			aria-label="Workflow diagram"
			@wheel="handleWheel"
			@pointerdown="handlePointerDown"
			@pointermove="handlePointerMove"
			@pointerup="handlePointerUp"
			@pointercancel="handlePointerUp"
		>
			<g class="sticky-note-layer">
				<StickyNoteBox
					v-for="node in stickyNodes"
					:key="node.name"
					:name="node.name"
					:content="node.display?.variant === 'stickyNote' ? node.display.content : undefined"
					:color="node.display?.variant === 'stickyNote' ? node.display.color : undefined"
					:x="node.x"
					:y="node.y"
					:width="node.width"
					:height="node.height"
				/>
			</g>

			<g class="connection-layer">
				<ConnectionLine
					v-for="line in connectionLines"
					:key="line.key"
					:source-x="line.sourceX"
					:source-y="line.sourceY"
					:target-x="line.targetX"
					:target-y="line.targetY"
					:variant="line.variant"
				/>
			</g>

			<g class="node-layer">
				<NodeBox
					v-for="node in workflowNodes"
					:key="node.name"
					:name="node.name"
					:type="node.type"
					:icon="node.icon"
					:x="node.x"
					:y="node.y"
					:width="node.width"
					:height="node.height"
					:variant="node.renderVariant === 'subNode' ? 'subNode' : 'node'"
					:execution-status="node.executionStatus"
				/>
			</g>
		</svg>
	</div>
</template>
