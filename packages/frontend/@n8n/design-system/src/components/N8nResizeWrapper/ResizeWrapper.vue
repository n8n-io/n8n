<script lang="ts" setup>
import { computed, onBeforeUnmount, toRef, useTemplateRef } from 'vue';

import { useI18n } from '../../composables/useI18n';
import { useResizablePanel, type ResizablePanel } from '../../composables/useResizablePanel';
import { directionsCursorMaps, type Direction, type ResizeData } from '../../types';
import type { Placement } from '../N8nTooltip/Tooltip.types';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

const TOOLTIP_DELAY = 750;
const { t } = useI18n();

interface ResizeProps {
	/** Use an existing resize controller instead of creating one. */
	resizer?: ResizablePanel;
	/** Show resize handles when enabled. */
	isResizingEnabled?: boolean;
	/** Current height in pixels. */
	height?: number;
	/** Current width in pixels. */
	width?: number;
	/** Height restored on double-click. */
	defaultHeight?: number;
	/** Width restored on double-click. */
	defaultWidth?: number;
	/** Minimum height in pixels. */
	minHeight?: number;
	/** Maximum height in pixels. */
	maxHeight?: number;
	/** Minimum width in pixels. */
	minWidth?: number;
	/** Maximum width in pixels. */
	maxWidth?: number;
	/** Scale applied to pointer movement. */
	scale?: number;
	/** Grid interval in pixels. */
	gridSize?: number;
	/** Handles to show. An empty list shows all handles. */
	supportedDirections?: Direction[];
	/** Window that receives the drag events. */
	window?: Window;
}

const props = withDefaults(defineProps<ResizeProps>(), {
	isResizingEnabled: true,
	height: 0,
	width: 0,
	minHeight: 0,
	maxHeight: Number.POSITIVE_INFINITY,
	minWidth: 0,
	maxWidth: Number.POSITIVE_INFINITY,
	scale: 1,
	gridSize: 20,
	window: undefined,
	supportedDirections: function getSupportedDirections() {
		return [];
	},
});

const emit = defineEmits<{
	resizestart: [];
	resize: [value: ResizeData];
	resizeend: [];
}>();

const enabledDirections = computed(function getEnabledDirections(): Direction[] {
	const availableDirections = Object.keys(directionsCursorMaps) as Direction[];
	if (!props.isResizingEnabled) return [];
	if (props.supportedDirections.length === 0) return availableDirections;
	return props.supportedDirections;
});

const tooltipPlacements: Record<Direction, Placement> = {
	right: 'right',
	left: 'left',
	top: 'top',
	bottom: 'bottom',
	topLeft: 'left-start',
	topRight: 'right-start',
	bottomLeft: 'left-end',
	bottomRight: 'right-end',
};

function getTooltipPlacement(direction: Direction): Placement {
	return tooltipPlacements[direction];
}

const resizeWrapper = useTemplateRef<HTMLDivElement>('resizeWrapper');
const resizer =
	props.resizer ??
	useResizablePanel({
		width: {
			size: toRef(props, 'width'),
			minSize: function getMinWidth() {
				return props.minWidth;
			},
			maxSize: function getMaxWidth() {
				return props.maxWidth;
			},
		},
		height: {
			size: toRef(props, 'height'),
			minSize: function getMinHeight() {
				return props.minHeight;
			},
			maxSize: function getMaxHeight() {
				return props.maxHeight;
			},
		},
		scale: toRef(props, 'scale'),
		gridSize: toRef(props, 'gridSize'),
	});
const { activeDirection } = resizer;
let cancelDrag: (() => void) | undefined;

onBeforeUnmount(function cancelWrapperDrag() {
	cancelDrag?.();
});

function startResize(event: MouseEvent): void {
	const element = resizeWrapper.value;
	if (!element) return;
	cancelDrag = resizer.startResize(event, {
		window: props.window,
		displayedSize: { width: element.offsetWidth, height: element.offsetHeight },
		onResizeStart: function emitResizeStart() {
			emit('resizestart');
		},
		onResize: function emitResize(data: ResizeData) {
			emit('resize', data);
		},
		onResizeEnd: function emitResizeEnd() {
			emit('resizeend');
		},
	});
}

function resetSize(event: MouseEvent, direction: Direction): void {
	if (!props.resizer && props.defaultWidth === undefined && props.defaultHeight === undefined) {
		if (import.meta.env.IS_DEV) {
			console.warn(
				'[N8nResizeWrapper]: Set defaultWidth, defaultHeight, or resizer to enable double-click reset.',
			);
		}
		return;
	}
	resizer.resetSize({ width: props.defaultWidth, height: props.defaultHeight });
	emit('resize', {
		width: resizer.width.value,
		height: resizer.height.value,
		dX: 0,
		dY: 0,
		x: event.clientX,
		y: event.clientY,
		direction,
	});
}
</script>

<template>
	<div ref="resizeWrapper" :class="$style.resize">
		<N8nTooltip
			v-for="direction in enabledDirections"
			:key="direction"
			:placement="getTooltipPlacement(direction)"
			:show-after="TOOLTIP_DELAY"
			as-child
		>
			<template #content>
				<div :class="$style.tooltipContent">
					<div :class="$style.tooltipLabel">{{ t('resizeWrapper.resize') }}</div>
					<div :class="$style.dragShortcut">{{ t('resizeWrapper.drag') }}</div>
				</div>
			</template>
			<div
				:data-dir="direction"
				:class="{
					[$style.resizer]: true,
					[$style[direction]]: true,
					[$style.active]: activeDirection === direction,
				}"
				data-test-id="resize-handle"
				@mousedown="startResize"
				@dblclick="resetSize($event, direction)"
			/>
		</N8nTooltip>
		<slot></slot>
	</div>
</template>

<style lang="scss" module>
.tooltipContent {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.tooltipLabel {
	min-width: 0;
	font-size: var(--font-size--xs);
}

.dragShortcut {
	padding: 0 var(--spacing--4xs);
	border: solid 1px transparent;
	border-radius: var(--radius--sm);
	background: var(--color--white-alpha-300);
	color: var(--color--neutral-200);
	font-size: var(--font-size--3xs);
	line-height: 16px;
}

.resize {
	--resizer--size: 4px;
	--resizer--spacing--side: calc(var(--resizer--size) / -2);
	--resizer--spacing--corner: -3px;
	--resizer--indicator--thickness: var(--spacing--3xs);
	--resizer--indicator--color: light-dark(var(--color--neutral-250), var(--color--neutral-700));

	position: relative;
	width: 100%;
	height: 100%;
	z-index: 2;
}

.resizer {
	position: absolute;
	z-index: 3;
}

.right {
	width: var(--resizer--size);
	height: 100%;
	top: var(--resizer--spacing--side);
	right: var(--resizer--spacing--side);
	cursor: col-resize;
	border-color: var(--border-color);
	border-color: var(--color--neutral-400);
}

.top {
	width: 100%;
	height: var(--resizer--size);
	top: var(--resizer--spacing--side);
	left: var(--resizer--spacing--side);
	cursor: row-resize;
}

.bottom {
	width: 100%;
	height: var(--resizer--size);
	bottom: var(--resizer--spacing--side);
	left: var(--resizer--spacing--side);
	cursor: row-resize;
}

.left {
	width: var(--resizer--size);
	height: 100%;
	top: var(--resizer--spacing--side);
	left: var(--resizer--spacing--side);
	cursor: col-resize;
}

.topLeft {
	width: var(--resizer--size);
	height: var(--resizer--size);
	top: var(--resizer--spacing--corner);
	left: var(--resizer--spacing--corner);
	cursor: nw-resize;
}

.topRight {
	width: var(--resizer--size);
	height: var(--resizer--size);
	top: var(--resizer--spacing--corner);
	right: var(--resizer--spacing--corner);
	cursor: ne-resize;
}

.bottomLeft {
	width: var(--resizer--size);
	height: var(--resizer--size);
	bottom: var(--resizer--spacing--corner);
	left: var(--resizer--spacing--corner);
	cursor: sw-resize;
}

.bottomRight {
	width: var(--resizer--size);
	height: var(--resizer--size);
	bottom: var(--resizer--spacing--corner);
	right: var(--resizer--spacing--corner);
	cursor: se-resize;
}

.right,
.left {
	top: 0;
}

.top,
.bottom {
	left: 0;
}

.right,
.left,
.top,
.bottom {
	&::after {
		content: '';
		position: absolute;
		background-color: var(--resizer--indicator--color);
		opacity: 0;
		pointer-events: none;
	}

	&:hover::after,
	&.active::after {
		opacity: 1;
	}
}

.right::after,
.left::after {
	top: 0;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: var(--resizer--indicator--thickness);
}

.top::after,
.bottom::after {
	left: 0;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	height: var(--resizer--indicator--thickness);
}
</style>

<style lang="scss">
body.n8n-resizing iframe {
	pointer-events: none;
}
</style>
