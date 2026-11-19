<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import type { SidebarProps } from './Sidebar.types';
import type { Direction, ResizeData } from '../../types';
import N8nResizeWrapper from '../N8nResizeWrapper/ResizeWrapper.vue';

defineOptions({ name: 'N8nSidebar' });

// Keep this on the component. The SFC compiler drops widthStorageId when it
// exists only on the imported SidebarProps type, so the key never arrives.
interface SidebarStorageProps {
	/** Local storage key for the width. */
	widthStorageId?: string;
}

const props = withDefaults(defineProps<SidebarProps & SidebarStorageProps>(), {
	side: 'left',
	minWidth: 160,
	maxWidth: 480,
	resizable: true,
});

/**
 * Current width in pixels.
 * Bind it so the parent can read the size after a drag.
 */
const width = defineModel<number>('width', { default: 240 });

const emit = defineEmits<{
	resize: [value: ResizeData];
}>();

defineSlots<{
	/** Sidebar body. The caller supplies the content. */
	default?: () => unknown;
}>();

// Capture this before a saved width replaces it. Double-click restores it.
const startingWidth = width.value;
const resetWidth = computed(() => props.defaultWidth ?? startingWidth);
// The parent width can stay at its initial value until it receives update:width.
// This ref paints the saved width on the first render.
const displayedWidth = ref(startingWidth);

function readStoredWidth(key: string | undefined): number | undefined {
	if (!key) return undefined;
	const raw = window.localStorage.getItem(key);
	if (raw === null) return undefined;
	const value = Number(raw);
	if (!Number.isFinite(value)) return undefined;
	if (value < props.minWidth || value > props.maxWidth) return undefined;
	return value;
}

function applyStoredWidth(key: string | undefined): void {
	const storedWidth = readStoredWidth(key);
	if (storedWidth === undefined) return;
	displayedWidth.value = storedWidth;
	if (storedWidth !== width.value) width.value = storedWidth;
}

function persistWidth(value: number): void {
	const key = props.widthStorageId;
	if (!key) return;
	window.localStorage.setItem(key, String(value));
}

applyStoredWidth(props.widthStorageId);

onMounted(function publishStoredWidth() {
	applyStoredWidth(props.widthStorageId);
});

watch(
	() => props.widthStorageId,
	function applyWidthForStorageId(key) {
		applyStoredWidth(key);
	},
);

watch(displayedWidth, persistWidth);
watch(width, function syncBoundWidth(value) {
	if (value === displayedWidth.value) return;
	displayedWidth.value = value;
});

const resizeDirections = computed<Direction[]>(() =>
	props.side === 'right' ? ['left'] : ['right'],
);

// The dragged width is a free pixel size. A grid would step the sidebar.
const resizeGridSize = 0;

const rootStyle = computed(() => ({
	width: `${displayedWidth.value}px`,
	minWidth: `${props.minWidth}px`,
	maxWidth: `${props.maxWidth}px`,
}));

function onResize(data: ResizeData) {
	displayedWidth.value = data.width;
	width.value = data.width;
	emit('resize', data);
}
</script>

<template>
	<div :class="$style.root" :style="rootStyle">
		<N8nResizeWrapper
			:width="displayedWidth"
			:default-width="resetWidth"
			:min-width="minWidth"
			:max-width="maxWidth"
			:grid-size="resizeGridSize"
			:supported-directions="resizeDirections"
			:is-resizing-enabled="resizable"
			@resize="onResize"
		>
			<aside :class="[$style.sidebar, $style[side]]" :aria-label="label" data-test-id="sidebar">
				<slot />
			</aside>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.root {
	display: flex;
	flex: 0 0 auto;
	align-self: stretch;
	height: 100%;
	min-height: 0;
	max-width: 100%;
}

.sidebar {
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
	width: 100%;
	height: 100%;
	min-height: 0;
	overflow: auto;
	padding: var(--n8n-sidebar--padding, var(--spacing--2xs));
	// Raised surface. Darker than the dialog in dark mode. Off-white in light mode.
	background-color: var(--n8n-sidebar--color--background, var(--color--background--light-2));
	color: var(--n8n-sidebar--color--text, var(--color--text));
	border-style: solid;
	border-width: 0;
	border-color: var(--n8n-sidebar--color--border, var(--border-color--subtle));
}

.left {
	// The surface is already a step off the main area, so the default border looks heavier than the frame.
	border-inline-end-width: var(--n8n-sidebar--border-width, var(--border-width, 1px));
}

.right {
	border-inline-start-width: var(--n8n-sidebar--border-width, var(--border-width, 1px));
}
</style>
