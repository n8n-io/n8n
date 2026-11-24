<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, useTemplateRef, watch } from 'vue';
import {
	useDocumentVisibility,
	useElementSize,
	usePreferredReducedMotion,
	useRafFn,
	useResizeObserver,
} from '@vueuse/core';
import {
	N8nButton,
	N8nIcon,
	N8nTooltip,
	N8nDropdownMenu,
	N8nButtonList,
	N8nIconButton,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import {
	resolveAgentPersonalisation,
	type AgentJsonConfig,
	type AgentConfigValidationIssue,
} from '@n8n/api-types';
import { AGENT_VISUALIZATION_COLLAPSE_DURATION } from '@/app/constants/durations';
import CanvasArrowHeadMarker from '@/features/workflows/canvas/components/elements/edges/CanvasArrowHeadMarker.vue';
import AgentBuildingIndicator from '@/features/ai/instanceAi/components/AgentBuildingIndicator.vue';
import AgentTestButton from './AgentTestButton.vue';
import AgentPersonalisationIcon from './AgentPersonalisationIcon.vue';
import {
	getAgentValidationIssueInterpolation,
	resolveAgentValidationIssueMessageKey,
} from '../utils/agentValidationIssueMessages';
import AgentVisualizationIcon from './AgentVisualizationIcon.vue';
import type { AgentVisualizationNode } from './AgentVisualization.types';
import {
	type VisualizationPosition,
	type VisualizationNodeSize,
	layoutAgentVisualization,
	routeLinkAroundNodes,
	visualizationBounds,
	visualizationNodeBounds,
	VISUALIZATION_ROOT,
} from './agentVisualizationLayout';

const props = defineProps<{
	root: AgentVisualizationNode;
	canEdit?: boolean;
	failedNodeIds?: string[];
	personalisation?: AgentJsonConfig['personalisation'];
	isRunning?: boolean;
	isBuilding?: boolean;
	activeNodeIds?: string[];
	isPreviewOpen?: boolean;
	hideTestButton?: boolean;
	isRunnable?: boolean;
	previewDisabledReason?: string;
	validationIssues?: AgentConfigValidationIssue[];
}>();
const emit = defineEmits<{
	close: [];
	'open-preview': [];
	'close-preview': [];
	edit: [section: string];
	add: [section: string];
}>();
const i18n = useI18n();
const markerId = `agent-visualization-arrow-${useId()}`;
const gradientId = `agent-visualization-gradient-${useId()}`;
const center = computed(() => props.root);
// Resolve validation once per configuration change, not on each animation frame.
const issueMessages = computed(() => {
	const messages = new Map<string, string[]>();
	function visit(node: AgentVisualizationNode): string[] {
		const descendants = (node.children ?? []).flatMap(visit);
		const capability = node.capability;
		const own = (props.validationIssues ?? [])
			.filter((issue) => {
				if (node.id === 'instructions')
					return issue.capability.kind === 'agent' && issue.path === 'instructions';
				if (node.id === 'agent')
					return issue.capability.kind === 'agent' || issue.capability.kind === 'guardrail';
				if (!capability || issue.capability.kind !== capability.kind) return false;
				return (
					(capability.id !== undefined && issue.capability.id === capability.id) ||
					(capability.index !== undefined && issue.capability.index === capability.index)
				);
			})
			.map((issue) =>
				i18n.baseText(resolveAgentValidationIssueMessageKey(issue), {
					interpolate: getAgentValidationIssueInterpolation(issue),
				}),
			);
		const result = [
			...new Set([
				...own,
				...(node.id === 'agent' ? [] : descendants),
				...(props.failedNodeIds?.includes(node.id)
					? [i18n.baseText('agents.builder.visualization.callFailed')]
					: []),
			]),
		];
		messages.set(node.id, result);
		return result;
	}
	visit(props.root);
	return messages;
});
function issuesFor(node: AgentVisualizationNode): string[] {
	return issueMessages.value.get(node.id) ?? [];
}

const expanded = ref(new Set<string>());
const viewport = useTemplateRef<HTMLElement>('viewport');
const host = useTemplateRef<HTMLElement>('host');
const hub = useTemplateRef<HTMLElement>('hub');
const { width, height } = useElementSize(viewport);
const motion = usePreferredReducedMotion();
const visibility = useDocumentVisibility();
const isPaused = computed(() => motion.value === 'reduce');
const nodeSizes = ref(new Map<string, VisualizationNodeSize>());
const layout = computed(() =>
	layoutAgentVisualization(
		props.root,
		expanded.value,
		props.canEdit === true,
		i18n.baseText('agents.builder.visualization.addComponent'),
		nodeSizes.value,
	),
);
const renderedLayout = ref<VisualizationPosition[]>([]);
const closing = ref<Record<string, { targetKey: string; from: Point; elapsed: number }>>({});
const collapseBounds = ref<ReturnType<typeof visualizationBounds>>();
const bounds = computed(() => {
	const current = visualizationBounds(renderedLayout.value, nodeSizes.value);
	const previous = collapseBounds.value;
	return previous
		? {
				left: Math.min(current.left, previous.left),
				right: Math.max(current.right, previous.right),
				top: Math.min(current.top, previous.top),
				bottom: Math.max(current.bottom, previous.bottom),
			}
		: current;
});
const manualCamera = ref<{ x: number; y: number; scale: number }>();
const panning = ref<{
	pointerId: number;
	x: number;
	y: number;
	cameraX: number;
	cameraY: number;
}>();
function framedCamera(minimumScale: number) {
	const graphWidth = bounds.value.right - bounds.value.left;
	const graphHeight = bounds.value.bottom - bounds.value.top;
	const scale = Math.max(
		minimumScale,
		Math.min(
			1,
			Math.max(1, width.value - 80) / graphWidth,
			Math.max(1, height.value - 160) / graphHeight,
		),
	);
	return {
		scale,
		x: (width.value - graphWidth * scale) / 2 - bounds.value.left * scale,
		y: 80 + (height.value - 160 - graphHeight * scale) / 2 - bounds.value.top * scale,
	};
}
// Keep automatic framing readable. Users can explicitly fit a large graph or zoom further out.
const camera = computed(() => manualCamera.value ?? framedCamera(0.55));
watch([width, height], ([nextWidth, nextHeight], [previousWidth, previousHeight]) => {
	if (!manualCamera.value || !previousWidth || !previousHeight) return;
	manualCamera.value = {
		...manualCamera.value,
		x: manualCamera.value.x + (nextWidth - previousWidth) / 2,
		y: manualCamera.value.y + (nextHeight - previousHeight) / 2,
	};
});
function fitView() {
	manualCamera.value = framedCamera(0.15);
}
function zoomTo(scale: number, x = width.value / 2, y = height.value / 2) {
	const current = camera.value;
	const next = Math.max(0.15, Math.min(2, scale));
	manualCamera.value = {
		scale: next,
		x: x - ((x - current.x) * next) / current.scale,
		y: y - ((y - current.y) * next) / current.scale,
	};
}
function startPan(event: PointerEvent) {
	if ((event.button !== 0 && event.button !== 1) || !(event.currentTarget instanceof HTMLElement))
		return;
	if (
		event.button === 0 &&
		event.target instanceof Element &&
		event.target.closest('[data-node-key], button, a, input, textarea')
	)
		return;
	event.preventDefault();
	event.currentTarget.setPointerCapture(event.pointerId);
	event.currentTarget.focus({ preventScroll: true });
	panning.value = {
		pointerId: event.pointerId,
		x: event.clientX,
		y: event.clientY,
		cameraX: camera.value.x,
		cameraY: camera.value.y,
	};
}
function movePan(event: PointerEvent) {
	const active = panning.value;
	if (!active || active.pointerId !== event.pointerId) return;
	manualCamera.value = {
		...camera.value,
		x: active.cameraX + event.clientX - active.x,
		y: active.cameraY + event.clientY - active.y,
	};
}
function endPan(event: PointerEvent) {
	if (panning.value?.pointerId === event.pointerId) panning.value = undefined;
}
function onWheel(event: WheelEvent) {
	event.preventDefault();
	const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height.value : 1;
	if (event.ctrlKey || event.metaKey) {
		const rect = viewport.value?.getBoundingClientRect();
		zoomTo(
			camera.value.scale * Math.exp(-event.deltaY * multiplier * 0.005),
			event.clientX - (rect?.left ?? 0),
			event.clientY - (rect?.top ?? 0),
		);
	} else {
		manualCamera.value = {
			...camera.value,
			x: camera.value.x - (event.shiftKey ? event.deltaY : event.deltaX) * multiplier,
			y: camera.value.y - (event.shiftKey ? 0 : event.deltaY) * multiplier,
		};
	}
}
function onNavigationKey(event: KeyboardEvent) {
	if (event.ctrlKey || event.metaKey || event.altKey) return;
	if (
		event.target instanceof Element &&
		event.target.closest('input, textarea, [contenteditable="true"]')
	)
		return;
	if (event.key === '+' || event.key === '=') zoomTo(camera.value.scale * 1.2);
	else if (event.key === '-') zoomTo(camera.value.scale / 1.2);
	else if (event.key === '1') fitView();
	else if (event.key === '0') zoomTo(1);
	else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
		manualCamera.value = {
			...camera.value,
			x: camera.value.x + (event.key === 'ArrowLeft' ? 48 : event.key === 'ArrowRight' ? -48 : 0),
			y: camera.value.y + (event.key === 'ArrowUp' ? 48 : event.key === 'ArrowDown' ? -48 : 0),
		};
	} else return;
	event.preventDefault();
}
const linkGradient = computed(() => {
	const gradient = resolveAgentPersonalisation(props.personalisation).gradient;
	const angle = (gradient.angle * Math.PI) / 180;
	return {
		...gradient,
		x1: -Math.sin(angle) * 320,
		y1: Math.cos(angle) * 320,
		x2: Math.sin(angle) * 320,
		y2: -Math.cos(angle) * 320,
	};
});
type Point = { x: number; y: number };
const animated = ref<Record<string, Point>>({});
const measuredElements = ref<HTMLElement[]>([]);
function measureNodes() {
	const sizes = new Map(nodeSizes.value);
	let changed = false;
	for (const node of host.value?.querySelectorAll<HTMLElement>('[data-node-key]') ?? []) {
		const key = node.dataset.nodeKey;
		if (!key || !node.offsetWidth || !node.offsetHeight) continue;
		const label = node.querySelector<HTMLElement>('[data-node-label]');
		const size = {
			width: node.offsetWidth,
			height: node.offsetHeight,
			labelWidth:
				label?.querySelector<HTMLElement>('[data-node-label-text]')?.offsetWidth ??
				label?.offsetWidth ??
				0,
			labelHeight: label?.offsetHeight ?? 0,
		};
		const previous = sizes.get(key);
		if (
			!previous ||
			previous.width !== size.width ||
			previous.height !== size.height ||
			previous.labelWidth !== size.labelWidth ||
			previous.labelHeight !== size.labelHeight
		) {
			sizes.set(key, size);
			changed = true;
		}
	}
	if (changed) nodeSizes.value = sizes;
}
useResizeObserver(measuredElements, measureNodes);
watch(
	renderedLayout,
	async () => {
		await nextTick();
		measuredElements.value = Array.from(
			host.value?.querySelectorAll<HTMLElement>('[data-node-key], [data-node-label]') ?? [],
		);
		measureNodes();
	},
	{ flush: 'post' },
);
onMounted(() => {
	measureNodes();
	host.value?.focus({ preventScroll: true });
});
const focusedKey = ref<string>();
const nodeTimes = ref<Record<string, number>>({});
const flowTime = ref(0);
const drag = ref<{ key: string; pointerId: number; x: number; y: number; moved: boolean }>();
const offsets = ref<Record<string, Point>>({});
let suppressClick = false;
useRafFn(({ delta }) => {
	if (visibility.value !== 'visible') return;
	const elapsed = Math.min(delta, 32);
	const mix = 1 - Math.exp(-elapsed / 70);
	if (!isPaused.value) flowTime.value += elapsed;
	const finished = new Set<string>();
	for (const item of renderedLayout.value) {
		const exit = closing.value[item.key];
		const point = animated.value[item.key];
		if (point && exit) {
			exit.elapsed += elapsed;
			const progress = Math.min(1, exit.elapsed / AGENT_VISUALIZATION_COLLAPSE_DURATION);
			const eased = 1 - (1 - progress) ** 3;
			const target = animated.value[exit.targetKey] ?? { x: 0, y: 0 };
			point.x = exit.from.x + (target.x - exit.from.x) * eased;
			point.y = exit.from.y + (target.y - exit.from.y) * eased;
			if (progress === 1) finished.add(item.key);
		} else if (point) {
			point.x =
				Math.abs(point.x - item.x) < 0.1 || isPaused.value
					? item.x
					: point.x + (item.x - point.x) * mix;
			point.y =
				Math.abs(point.y - item.y) < 0.1 || isPaused.value
					? item.y
					: point.y + (item.y - point.y) * mix;
		}
		if (
			!isPaused.value &&
			!exit &&
			item.key !== focusedKey.value &&
			item.key !== drag.value?.key &&
			!expanded.value.has(item.key)
		) {
			nodeTimes.value[item.key] = (nodeTimes.value[item.key] ?? 0) + elapsed;
		}
	}
	if (finished.size) {
		renderedLayout.value = renderedLayout.value.filter((item) => !finished.has(item.key));
		for (const key of finished) {
			delete closing.value[key];
			delete animated.value[key];
			delete offsets.value[key];
		}
		if (!Object.keys(closing.value).length) collapseBounds.value = undefined;
	}
	for (const [key, offset] of Object.entries(offsets.value)) {
		if (drag.value?.key === key) continue;
		const decay = isPaused.value ? 0 : Math.exp(-elapsed / 110);
		offset.x *= decay;
		offset.y *= decay;
		if (Math.abs(offset.x) + Math.abs(offset.y) < 0.1) delete offsets.value[key];
	}
});
const positions = computed(() =>
	renderedLayout.value.map((item, index) => {
		const point = animated.value[item.key] ?? item;
		const exiting = Boolean(closing.value[item.key]);
		const time = motion.value === 'reduce' ? 0 : (nodeTimes.value[item.key] ?? 0);
		const driftX =
			motion.value === 'reduce' || exiting
				? 0
				: (Math.sin(time / 4200 + index * 1.7) - Math.sin(index * 1.7)) * 8;
		const driftY =
			motion.value === 'reduce' || exiting
				? 0
				: (Math.cos(time / 5100 + index * 1.3) - Math.cos(index * 1.3)) * 7;
		return {
			...item,
			time,
			x: point.x + driftX + (exiting ? 0 : (offsets.value[item.key]?.x ?? 0)),
			y: point.y + driftY + (exiting ? 0 : (offsets.value[item.key]?.y ?? 0)),
		};
	}),
);
watch(
	[layout, isPaused],
	([next, stopped]) => {
		const previous = new Map(positions.value.map((item) => [item.key, item]));
		const initial = previous.size === 0;
		const nextKeys = new Set(next.map((item) => item.key));
		const nextClosing: typeof closing.value = {};
		const exiting: VisualizationPosition[] = [];
		if (!stopped) {
			for (const item of renderedLayout.value) {
				if (nextKeys.has(item.key) || (item.add && !props.canEdit)) continue;
				let targetKey = item.parentKey;
				while (targetKey !== VISUALIZATION_ROOT && !nextKeys.has(targetKey)) {
					targetKey = previous.get(targetKey)?.parentKey ?? VISUALIZATION_ROOT;
				}
				const from = previous.get(item.key) ?? item;
				const target = previous.get(targetKey) ?? { x: 0, y: 0 };
				if (Math.hypot(from.x - target.x, from.y - target.y) < 0.1) continue;
				nextClosing[item.key] =
					closing.value[item.key]?.targetKey === targetKey
						? closing.value[item.key]
						: { targetKey, from: { x: from.x, y: from.y }, elapsed: 0 };
				exiting.push(item);
			}
		}
		if (exiting.length && !collapseBounds.value)
			collapseBounds.value = visualizationBounds(renderedLayout.value, nodeSizes.value);
		if (!exiting.length) collapseBounds.value = undefined;
		closing.value = nextClosing;
		renderedLayout.value = [...next, ...exiting];
		animated.value = Object.fromEntries(
			renderedLayout.value.map((item) => {
				const previousPoint = nextClosing[item.key]
					? previous.get(item.key)
					: animated.value[item.key];
				const start =
					initial || stopped
						? item
						: (previousPoint ?? previous.get(item.parentKey) ?? { x: 0, y: 0 });
				return [item.key, { x: start.x, y: start.y }];
			}),
		);
	},
	{ immediate: true },
);

function anchor(point: Point, other: Point, size: number, circle: boolean): Point {
	const dx = other.x - point.x;
	const dy = other.y - point.y;
	const ratio = circle
		? size / (Math.hypot(dx, dy) || 1)
		: Math.min(size / (Math.abs(dx) || 1), size / (Math.abs(dy) || 1));
	return { x: point.x + dx * ratio, y: point.y + dy * ratio };
}
// A wave packet that travels along an entry link into its target. The ends stay fixed so the arrow
// keeps its anchor and direction.
function ripplePath(points: [Point, Point, Point, Point], phase: number) {
	const [p0, p1, p2, p3] = points;
	const width = 0.35;
	const center = -width / 2 + phase * (1 + width);
	const samples = 64;
	const segments: string[] = [];
	for (let step = 0; step <= samples; step++) {
		const t = step / samples;
		const u = 1 - t;
		const x = u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x;
		const y = u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y;
		const tx = 3 * u ** 2 * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x);
		const ty = 3 * u ** 2 * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y);
		const length = Math.hypot(tx, ty) || 1;
		const offset = t - center;
		const envelope = Math.abs(offset) < width / 2 ? Math.cos((Math.PI * offset) / width) ** 2 : 0;
		const lift = 4 * envelope * Math.sin((4 * Math.PI * offset) / width) * Math.sin(Math.PI * t);
		segments.push(`${step ? 'L' : 'M'} ${x - (ty / length) * lift} ${y + (tx / length) * lift}`);
	}
	return segments.join(' ');
}
const connections = computed(() => {
	const byKey = new Map(positions.value.map((item) => [item.key, item]));
	return positions.value.map((item, index) => {
		const parent = byKey.get(item.parentKey) ?? { x: 0, y: 0 };
		const rootParent = item.parentKey === VISUALIZATION_ROOT;
		const source = item.incoming
			? { x: item.x + (item.add ? 24 : 56), y: item.y }
			: rootParent
				? anchor(parent, item.spoke ?? item, 42, true)
				: { x: parent.x + 48, y: parent.y };
		let target = item.incoming
			? { x: parent.x - (rootParent ? 42 : 48), y: parent.y }
			: rootParent
				? anchor(item, parent, item.add ? 24 : 48, item.add)
				: { x: item.x - (item.add ? 24 : 48), y: item.y };
		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const distance = Math.hypot(dx, dy) || 1;
		const bend = Math.sin(item.time / 6200 + index * 1.1) * 24;
		let c1 =
			item.incoming || !rootParent
				? { x: source.x + dx * 0.4, y: source.y }
				: {
						x: source.x + dx * 0.32 - (dy / distance) * bend,
						y: source.y + dy * 0.32 + (dx / distance) * bend,
					};
		let c2 =
			item.incoming || !rootParent
				? { x: target.x - dx * 0.4, y: target.y }
				: {
						x: source.x + dx * 0.72 + (dy / distance) * bend * 0.65,
						y: source.y + dy * 0.72 - (dx / distance) * bend * 0.65,
					};
		if (rootParent && !item.incoming && item.spoke) {
			// An open group moves out of its spoke. Leave the hub along the spoke and enter the group
			// side-on, like its own child links. Handles scale with the link so they never cross.
			const amount = Math.min(1, Math.max(0, (item.x - item.spoke.x - 16) / 80));
			const side = Math.sign(item.x - parent.x) || 1;
			const entry = { x: item.x - side * (item.add ? 24 : 48), y: item.y };
			target = {
				x: target.x + (entry.x - target.x) * amount,
				y: target.y + (entry.y - target.y) * amount,
			};
			const spokeLength = Math.hypot(item.spoke.x - parent.x, item.spoke.y - parent.y) || 1;
			const handle = Math.hypot(target.x - source.x, target.y - source.y) * 0.45;
			const exit = {
				x: source.x + ((item.spoke.x - parent.x) / spokeLength) * handle,
				y: source.y + ((item.spoke.y - parent.y) / spokeLength) * handle,
			};
			const approach = { x: target.x - side * handle, y: target.y };
			c1 = { x: c1.x + (exit.x - c1.x) * amount, y: c1.y + (exit.y - c1.y) * amount };
			c2 = { x: c2.x + (approach.x - c2.x) * amount, y: c2.y + (approach.y - c2.y) * amount };
		}
		if (rootParent && !item.incoming) {
			// Pass each node on the side away from its resting spoke, so the choice never flips.
			const own = item.spoke ?? item;
			[, c1, c2] = routeLinkAroundNodes(
				[source, c1, c2, target],
				positions.value
					.filter((other) => other.key !== item.key && !other.key.startsWith(`${item.key}/`))
					.map((other) => {
						const rest = other.spoke ?? other;
						return {
							...visualizationNodeBounds(other, nodeSizes.value),
							side: own.x * rest.y - own.y * rest.x > 0 ? -1 : 1,
						};
					}),
			);
		}
		return {
			...item,
			opacity: closing.value[item.key]
				? Math.max(0, Math.min(1, (Math.hypot(item.x - parent.x, item.y - parent.y) - 96) / 48))
				: 1,
			curve:
				item.incoming && motion.value !== 'reduce'
					? ripplePath([source, c1, c2, target], (flowTime.value / 3200 + index * 0.17) % 1)
					: `M ${source.x} ${source.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${target.x} ${target.y}`,
		};
	});
});
function isExpandable(node: AgentVisualizationNode) {
	return Boolean(node.children?.length || (props.canEdit && node.addActions?.length));
}
function open(key: string, node: AgentVisualizationNode) {
	if (closing.value[key]) return;
	if (suppressClick) {
		suppressClick = false;
		return;
	}
	if (isExpandable(node)) {
		const next = new Set(expanded.value);
		if (next.has(key)) {
			next.delete(key);
			for (const child of next) if (child.startsWith(`${key}/`)) next.delete(child);
		} else next.add(key);
		expanded.value = next;
	} else if (node.editSection) emit('edit', node.editSection);
}
async function back() {
	const key = [...expanded.value].at(-1);
	const node = layout.value.find((item) => item.key === key);
	if (node) open(node.key, node.node);
	await nextTick();
	hub.value?.focus();
}
function startDrag(event: PointerEvent, key: string) {
	if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
	suppressClick = false;
	event.currentTarget.setPointerCapture(event.pointerId);
	drag.value = {
		key,
		pointerId: event.pointerId,
		x: event.clientX / camera.value.scale - (offsets.value[key]?.x ?? 0),
		y: event.clientY / camera.value.scale - (offsets.value[key]?.y ?? 0),
		moved: false,
	};
}
function moveDrag(event: PointerEvent) {
	const active = drag.value;
	if (!active || active.pointerId !== event.pointerId) return;
	const x = event.clientX / camera.value.scale - active.x;
	const y = event.clientY / camera.value.scale - active.y;
	if (Math.hypot(x, y) > 5 / camera.value.scale) active.moved = true;
	if (active.moved) offsets.value[active.key] = { x, y };
}
function endDrag(event: PointerEvent) {
	if (drag.value?.pointerId !== event.pointerId) return;
	suppressClick = drag.value.moved;
	drag.value = undefined;
}
function onFocusOut(event: FocusEvent) {
	if (
		!(event.currentTarget instanceof HTMLElement) ||
		!(event.relatedTarget instanceof Node) ||
		!event.currentTarget.contains(event.relatedTarget)
	)
		focusedKey.value = undefined;
}
function nodeStyle(key: string, x: number, y: number) {
	const exit = closing.value[key];
	const progress = exit ? Math.min(1, exit.elapsed / AGENT_VISUALIZATION_COLLAPSE_DURATION) : 0;
	return {
		transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${1 - progress ** 3 * 0.85})`,
		opacity: 1 - Math.max(0, (progress - 0.65) / 0.35),
	};
}
watch(
	() => props.root.id,
	() => {
		expanded.value = new Set();
		offsets.value = {};
		nodeTimes.value = {};
		manualCamera.value = undefined;
	},
);
</script>

<template>
	<section
		ref="host"
		tabindex="-1"
		:class="[
			$style.visualization,
			{ [$style.motionPaused]: isPaused, [$style.manualView]: Boolean(manualCamera) },
		]"
		data-testid="agent-visualization"
		:aria-label="i18n.baseText('agents.builder.visualization.title')"
		@keydown.esc.stop="expanded.size ? back() : emit('close')"
		@keydown="onNavigationKey"
	>
		<div
			ref="viewport"
			tabindex="0"
			:class="[$style.viewport, { [$style.panning]: panning }]"
			data-testid="agent-visualization-viewport"
			:aria-label="i18n.baseText('agents.builder.visualization.title')"
			:aria-description="i18n.baseText('agents.builder.visualization.navigationHint')"
			:style="{
				'--visualization-scale': camera.scale,
				backgroundPosition: `${camera.x}px ${camera.y}px`,
			}"
			@pointerdown="startPan"
			@pointermove="movePan"
			@pointerup="endPan"
			@pointercancel="endPan"
			@lostpointercapture="endPan"
			@wheel="onWheel"
		>
			<div :class="$style.stage">
				<div
					:class="$style.scene"
					data-testid="agent-visualization-scene"
					:data-paused="isPaused"
					:data-scale="camera.scale"
					:data-x="camera.x"
					:data-y="camera.y"
					:style="{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }"
				>
					<CanvasArrowHeadMarker :id="markerId" :class="$style.marker" />
					<svg
						:class="$style.connections"
						aria-hidden="true"
						:viewBox="`${bounds.left} ${bounds.top} ${bounds.right - bounds.left} ${bounds.bottom - bounds.top}`"
						:width="bounds.right - bounds.left"
						:height="bounds.bottom - bounds.top"
						:style="{ left: `${bounds.left}px`, top: `${bounds.top}px` }"
					>
						<defs>
							<linearGradient
								:id="gradientId"
								gradientUnits="userSpaceOnUse"
								:x1="linkGradient.x1"
								:y1="linkGradient.y1"
								:x2="linkGradient.x2"
								:y2="linkGradient.y2"
							>
								<stop :offset="`${linkGradient.fromStop}%`" :stop-color="linkGradient.from" />
								<stop :offset="`${linkGradient.toStop}%`" :stop-color="linkGradient.to" />
							</linearGradient>
						</defs>
						<TransitionGroup tag="g" :enter-active-class="$style.linkEnter">
							<g
								v-for="connection in connections"
								:key="connection.key"
								:opacity="connection.opacity"
							>
								<path
									:d="connection.curve"
									:stroke="`url(#${gradientId})`"
									:class="$style.linkGlow"
								/>
								<path
									:d="connection.curve"
									:stroke="`url(#${gradientId})`"
									:class="$style.link"
									:marker-end="`url(#${markerId})`"
									:data-testid="`agent-visualization-link-${connection.node.id}`"
									:data-parent="connection.parentKey"
								/>
							</g>
						</TransitionGroup>
					</svg>
					<TransitionGroup :enter-active-class="$style.nodeEnter">
						<div
							v-for="{ key, parentKey, node, x, y, incoming, add } in positions"
							:key="key"
							:data-node-id="node.id"
							:data-node-key="key"
							:data-parent="parentKey"
							:data-x="x"
							:data-y="y"
							:aria-busy="activeNodeIds?.includes(node.id) || undefined"
							:class="[
								$style.node,
								{
									[$style.inactive]: node.inactive,
									[$style.nodeActive]: activeNodeIds?.includes(node.id),
									[$style.expanded]: expanded.has(key),
									[$style.closing]: Boolean(closing[key]),
									[$style.nodeInvalid]: issuesFor(node).length > 0,
									[$style.entryNode]: incoming && !add,
									[$style.addNode]: add,
								},
							]"
							:style="nodeStyle(key, x, y)"
							:data-closing="Boolean(closing[key])"
							:inert="Boolean(closing[key])"
							@focusin="focusedKey = key"
							@focusout="onFocusOut"
						>
							<N8nDropdownMenu
								v-if="add"
								:items="
									(node.addActions ?? []).map((action) => ({ id: action.id, label: action.label }))
								"
								@select="emit('add', $event)"
							>
								<template #trigger
									><button
										type="button"
										:class="$style.nodeButton"
										:aria-label="node.label"
										data-testid="agent-visualization-add"
										data-attr="agent-visualization-add"
									>
										<N8nIcon icon="plus" :size="24" /></button
								></template>
							</N8nDropdownMenu>
							<template v-else>
								<button
									type="button"
									:class="$style.nodeButton"
									:data-testid="`agent-visualization-node-${node.id}`"
									data-attr="agent-visualization-node"
									:aria-label="node.label"
									:aria-description="issuesFor(node).join('\n') || undefined"
									:aria-expanded="isExpandable(node) ? expanded.has(key) : undefined"
									:aria-haspopup="isExpandable(node) ? undefined : 'dialog'"
									@pointerdown="startDrag($event, key)"
									@pointermove="moveDrag"
									@pointerup="endDrag"
									@pointercancel="endDrag"
									@lostpointercapture="endDrag"
									@click="open(key, node)"
								>
									<span :class="$style.nodeIcon"
										><AgentVisualizationIcon
											:node="
												node.id === 'invocation'
													? {
															...node,
															iconSource: { type: 'icon', name: 'node:manual-trigger' },
														}
													: node
											"
											:size="48"
									/></span>
									<span data-node-label :class="$style.nodeLabel"
										><span data-node-label-text>{{ node.label }}</span></span
									>
									<span v-if="node.children?.length" :class="$style.count">{{
										node.children.length
									}}</span>
									<N8nIcon
										v-if="issuesFor(node).length"
										icon="triangle-alert"
										size="small"
										:class="[$style.warningIcon, $style.nodeWarning]"
									/>
								</button>
							</template>
						</div>
					</TransitionGroup>
					<div :class="$style.center">
						<div
							ref="hub"
							tabindex="-1"
							:aria-label="center.label"
							:class="$style.hub"
							data-testid="agent-visualization-hub"
						>
							<AgentBuildingIndicator
								v-if="isRunning || isBuilding"
								variant="ring"
								:label="
									i18n.baseText(
										isRunning
											? 'agents.builder.visualization.running'
											: 'instanceAi.agentPreview.building',
									)
								"
								:class="$style.runRing"
							/>
							<N8nTooltip v-if="issuesFor(center).length" :content="issuesFor(center).join(' · ')"
								><N8nIcon
									icon="triangle-alert"
									:class="[$style.warningIcon, $style.hubWarning]"
									:aria-label="issuesFor(center).join(' · ')"
							/></N8nTooltip>
							<AgentPersonalisationIcon :personalisation="personalisation" :size="80" />
						</div>
					</div>
				</div>
			</div>
		</div>
		<N8nButtonList
			variant="toolbar"
			:class="$style.navigationControls"
			data-testid="agent-visualization-navigation"
		>
			<N8nTooltip :content="i18n.baseText('nodeView.zoomToFit')"
				><N8nIconButton
					variant="ghost"
					size="large"
					icon="corners"
					:aria-label="i18n.baseText('nodeView.zoomToFit')"
					data-testid="agent-visualization-fit"
					data-attr="agent-visualization-fit"
					@click="fitView"
			/></N8nTooltip>
			<N8nTooltip :content="i18n.baseText('nodeView.zoomOut')"
				><N8nIconButton
					variant="ghost"
					size="large"
					icon="zoom-out"
					:aria-label="i18n.baseText('nodeView.zoomOut')"
					:disabled="camera.scale <= 0.15"
					data-testid="agent-visualization-zoom-out"
					data-attr="agent-visualization-zoom-out"
					@click="zoomTo(camera.scale / 1.2)"
			/></N8nTooltip>
			<N8nButton
				variant="ghost"
				size="small"
				:aria-label="i18n.baseText('agents.builder.visualization.resetZoom')"
				data-testid="agent-visualization-zoom-reset"
				data-attr="agent-visualization-zoom-reset"
				@click="zoomTo(1)"
				>{{ Math.round(camera.scale * 100) }}%</N8nButton
			>
			<N8nTooltip :content="i18n.baseText('nodeView.zoomIn')"
				><N8nIconButton
					variant="ghost"
					size="large"
					icon="zoom-in"
					:aria-label="i18n.baseText('nodeView.zoomIn')"
					:disabled="camera.scale >= 2"
					data-testid="agent-visualization-zoom-in"
					data-attr="agent-visualization-zoom-in"
					@click="zoomTo(camera.scale * 1.2)"
			/></N8nTooltip>
		</N8nButtonList>
		<div :class="$style.controls">
			<N8nTooltip v-if="issuesFor(root).length" :content="issuesFor(root).join(' · ')"
				><N8nIcon icon="triangle-alert" :class="$style.warningIcon"
			/></N8nTooltip>
			<N8nButton
				variant="outline"
				size="small"
				icon="brain"
				:class="$style.modelButton"
				:label="root.description || i18n.baseText('agents.builder.visualization.chooseModel')"
				data-testid="agent-visualization-model"
				@click="emit('edit', 'model')"
			/>
			<AgentTestButton
				v-if="!hideTestButton"
				:is-runnable="isRunnable === true"
				:is-preview-open="isPreviewOpen"
				:disabled-reason="previewDisabledReason"
				:validation-issues="validationIssues"
				test-id="agent-visualization-test"
				@open-preview="emit('open-preview')"
				@close-preview="emit('close-preview')"
			/>
		</div>
	</section>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';
@use '@/features/workflows/canvas/components/elements/nodes/render-types/canvasNodeStyles' as
	nodeStyles;
.visualization {
	position: absolute;
	inset: 0;
	z-index: 10;
	display: flex;
	flex-direction: column;
	outline: none;
	background: var(--canvas--color--background);
	color: var(--text-color);
}
.viewport {
	position: relative;
	flex: 1;
	overflow: hidden;
	min-height: 0;
	touch-action: none;
	cursor: grab;
	// Fade dots by area as they shrink, so they disappear on zoom-out like the workflow canvas.
	--visualization-dot--opacity: min(
		100%,
		calc(var(--visualization-scale) * var(--visualization-scale) * 100%)
	);
	background-image: radial-gradient(
		circle,
		color-mix(in srgb, var(--canvas--dot--color) var(--visualization-dot--opacity), transparent) 1px,
		transparent 1px
	); // Match the workflow canvas dot size.
	background-size: calc(var(--spacing--lg) * var(--visualization-scale))
		calc(var(--spacing--lg) * var(--visualization-scale));
}
.stage {
	position: absolute;
	inset: 0;
}
.panning {
	cursor: grabbing;
}
.manualView .scene {
	transition: none;
}
.navigationControls {
	position: absolute;
	bottom: var(--spacing--lg);
	right: var(--spacing--lg);
	z-index: 10;
}
.scene {
	position: absolute;
	top: 0;
	left: 0;
	width: 0;
	height: 0;
	transform-origin: 0 0;
	transition: transform var(--duration--slow) var(--easing--ease-out);
	@include motion.reduced-motion;
}
.connections {
	position: absolute;
	overflow: visible;
	pointer-events: none;
}
.connections path {
	fill: none;
	stroke-linecap: round;
}
.link {
	stroke-width: 1.4;
	stroke-opacity: light-dark(0.85, 0.8);
} // SVG canvas coordinates.
.linkGlow {
	stroke-width: 4.2;
	stroke-opacity: light-dark(0.06, 0.12);
}
.marker {
	position: absolute;
	width: 0;
	height: 0;
	pointer-events: none;
}
.node {
	@include nodeStyles.canvas-node-border-defaults;
	@include nodeStyles.canvas-node-border;
	--node--icon--color: var(--text-color--subtle);
	isolation: isolate;
	z-index: 1;
	position: absolute;
	top: 0;
	left: 0;
	width: var(--height--5xl);
	height: var(--height--5xl);
	border-radius: var(--radius--lg);
	background: var(--canvas-node--color--background, var(--node--color--background));
	color: var(--text-color);
}
.entryNode {
	border-radius: calc(var(--spacing--xl) + var(--spacing--3xs)) var(--radius--lg) var(--radius--lg)
		calc(var(--spacing--xl) + var(--spacing--3xs));
}
.entryNode::before {
	@include nodeStyles.canvas-node-border;
	content: '';
	position: absolute;
	right: calc(-1 * var(--spacing--xs));
	top: calc(50% - var(--spacing--xs));
	width: var(--spacing--md);
	height: var(--spacing--md);
	border-radius: var(--radius--full);
	background: var(--canvas-node--color--background, var(--node--color--background));
	pointer-events: none;
}
.node:has(.nodeButton:focus-visible) {
	outline: var(--focus--border-width) solid var(--color--primary);
}
.nodeButton {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	padding: var(--spacing--sm);
	border: none;
	border-radius: inherit;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: grab;
	touch-action: none;
	user-select: none;
}
.nodeButton:active {
	cursor: grabbing;
}
.nodeIcon {
	display: flex;
	color: var(--text-color--subtle);
}
.nodeLabel {
	position: absolute;
	top: 100%;
	margin-top: var(--spacing--2xs);
	left: 50%;
	transform: translateX(-50%);
	width: calc(var(--height--5xl) * 2);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	text-align: center;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	overflow-wrap: anywhere;
}
.count {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}
.inactive {
	opacity: 0.5;
}
.closing {
	z-index: 0;
	pointer-events: none;
}
.expanded {
	@include nodeStyles.canvas-node-selected-ring;
	--canvas-node--border-color: var(--color--primary);
	z-index: 2;
}
.nodeInvalid {
	@include nodeStyles.status-warning;
}
.nodeWarning {
	position: absolute;
	bottom: var(--spacing--2xs);
	left: var(--spacing--2xs);
}
.hubWarning {
	position: absolute;
	top: 0;
	right: 0;
	z-index: 1;
}
.warningIcon {
	color: var(--color--warning);
}
.addNode {
	width: var(--height--2xl);
	height: var(--height--2xl);
	border-radius: var(--radius--full);
}
.addNode .nodeButton {
	cursor: pointer;
}
.modelButton {
	min-width: 0;
	max-width: calc(var(--height--5xl) * 3);
	overflow: hidden;
	text-overflow: ellipsis;
}
.center {
	position: absolute;
	left: 0;
	top: 0;
	transform: translate(-50%, -50%);
	width: calc(var(--height--xl) * 2);
	height: calc(var(--height--xl) * 2);
}
.hub {
	position: relative;
	isolation: isolate;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	outline: none;
}
.controls {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	position: absolute;
	top: var(--spacing--lg);
	right: var(--spacing--lg);
	z-index: 4;
}
.runRing {
	z-index: -1;
}
.nodeActive::after {
	@include nodeStyles.status-animated-after;
	@include nodeStyles.status-running-animation;
	inset: calc(-1 * var(--spacing--5xs));
	padding: var(--spacing--5xs);
	border-radius: inherit;
	z-index: 1;
	background: conic-gradient(
		from var(--node--gradient-angle),
		var(--color--success),
		color-mix(in srgb, var(--color--success) 15%, transparent) 35% 65%,
		var(--color--success)
	);
	mask:
		linear-gradient(white 0 0) content-box,
		linear-gradient(white 0 0);
	mask-composite: exclude;
	pointer-events: none;
	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
}
.motionPaused .nodeActive::after,
.motionPaused .runRing :global(*) {
	animation-play-state: paused;
}
.motionPaused .scene {
	transition: none;
}
@include nodeStyles.status-animation-definitions;
.nodeEnter,
.linkEnter {
	@include motion.fade-in;
}
</style>
