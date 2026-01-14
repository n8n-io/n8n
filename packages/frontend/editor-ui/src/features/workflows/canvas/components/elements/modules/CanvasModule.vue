<script setup lang="ts">
import { computed, ref, useCssModule } from 'vue';
import type { CanvasModule } from '../../../canvas.types';
import { GRID_SIZE } from '@/app/utils/nodeViewUtils';
import { N8nIcon } from '@n8n/design-system';

const props = defineProps<{
	module: CanvasModule;
	zoom?: number;
}>();

const emit = defineEmits<{
	toggleCollapse: [moduleName: string];
	dragStart: [moduleName: string];
	drag: [moduleName: string, delta: { dx: number; dy: number }];
	dragEnd: [moduleName: string];
}>();

const $style = useCssModule();

const headerHeight = GRID_SIZE * 5;

// Drag state
const isDragging = ref(false);
const dragStartPos = ref<{ x: number; y: number } | null>(null);
const hasDragged = ref(false);
const DRAG_THRESHOLD = 3; // pixels before considering it a drag vs click

const moduleStyle = computed(() => ({
	transform: `translate(${props.module.boundingBox.x}px, ${props.module.boundingBox.y}px)`,
	width: `${props.module.boundingBox.width}px`,
	height: `${props.module.boundingBox.height}px`,
}));

const headerStyle = computed(() => ({
	height: `${headerHeight}px`,
}));

const moduleClasses = computed(() => ({
	[$style.module]: true,
	[$style.collapsed]: props.module.collapsed,
	[$style.dragging]: isDragging.value,
}));

const headerClasses = computed(() => ({
	[$style.header]: true,
	[$style.headerCollapsed]: props.module.collapsed,
}));

const nodeCount = computed(() => props.module.nodeNames.length);

function onMouseDown(event: MouseEvent) {
	// Only handle left mouse button
	if (event.button !== 0) return;

	isDragging.value = true;
	hasDragged.value = false;
	dragStartPos.value = { x: event.clientX, y: event.clientY };

	// Add global listeners for move and up
	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('mouseup', onMouseUp);

	event.preventDefault();
}

function onMouseMove(event: MouseEvent) {
	if (!isDragging.value || !dragStartPos.value) return;

	const dx = event.clientX - dragStartPos.value.x;
	const dy = event.clientY - dragStartPos.value.y;

	// Check if we've moved past the drag threshold
	if (!hasDragged.value && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
		hasDragged.value = true;
		emit('dragStart', props.module.name);
	}

	if (hasDragged.value) {
		// Adjust delta by zoom level
		const zoom = props.zoom ?? 1;
		emit('drag', props.module.name, { dx: dx / zoom, dy: dy / zoom });

		// Update start position for next move event (incremental delta)
		dragStartPos.value = { x: event.clientX, y: event.clientY };
	}
}

function onMouseUp() {
	// Remove global listeners
	window.removeEventListener('mousemove', onMouseMove);
	window.removeEventListener('mouseup', onMouseUp);

	if (isDragging.value) {
		if (hasDragged.value) {
			emit('dragEnd', props.module.name);
		} else {
			// It was a click, not a drag - toggle collapse
			emit('toggleCollapse', props.module.name);
		}
	}

	isDragging.value = false;
	dragStartPos.value = null;
	hasDragged.value = false;
}
</script>

<template>
	<div :class="moduleClasses" :style="moduleStyle" data-test-id="canvas-module">
		<div :class="headerClasses" :style="headerStyle" @mousedown="onMouseDown">
			<N8nIcon
				:class="$style.collapseIcon"
				:icon="module.collapsed ? 'chevron-right' : 'chevron-down'"
				size="small"
			/>
			<div :class="$style.headerContent">
				<div :class="$style.titleRow">
					<span :class="$style.name">{{ module.name }}</span>
					<span v-if="module.collapsed" :class="$style.nodeCount">{{ nodeCount }} nodes</span>
				</div>
				<span v-if="module.description" :class="$style.description">{{ module.description }}</span>
			</div>
		</div>
		<div v-if="!module.collapsed" :class="$style.body">
			<slot />
		</div>
	</div>
</template>

<style lang="scss" module>
.module {
	position: absolute;
	top: 0;
	left: 0;
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--tint-1);
	pointer-events: none;
	transition:
		width 0.2s ease,
		height 0.2s ease;
}

.collapsed {
	background-color: var(--color--background--light-2);
}

.dragging {
	opacity: 0.8;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: 1px dashed var(--color--foreground);
	background-color: var(--color--background--light-2);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	/* Enable pointer events only on header for clicking/dragging */
	pointer-events: auto;
	cursor: grab;
	position: relative;
	z-index: 1;
	user-select: none;

	&:hover {
		background-color: var(--color--background--light-3);
	}

	&:active {
		cursor: grabbing;
	}
}

.headerCollapsed {
	border-bottom: none;
	border-radius: var(--radius--lg);
}

.collapseIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.headerContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	overflow: hidden;
	flex: 1;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.name {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.nodeCount {
	font-size: var(--font-size--2xs);
	white-space: nowrap;
	background-color: var(--color--foreground--tint-1);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius);
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.body {
	flex: 1;
	position: relative;
}
</style>
