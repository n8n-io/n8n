<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import type { SidebarProps } from './Sidebar.types';
import type { Direction, ResizeData } from '../../types';
import N8nResizeWrapper from '../N8nResizeWrapper/ResizeWrapper.vue';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';

defineOptions({ name: 'N8nSidebar' });

// `width` is the v-model. `defineModel` declares that prop.
const props = withDefaults(defineProps<Omit<SidebarProps, 'width'>>(), {
	side: 'left',
	minWidth: 160,
	maxWidth: 480,
	resizable: true,
});

const width = defineModel<number>('width', { default: 240 });

const emit = defineEmits<{
	resize: [value: ResizeData];
}>();

defineSlots<{
	/** Content above the scrolling body. This region stays in place. */
	header?: () => unknown;
	/** Sidebar body. The caller supplies the content. This region scrolls. */
	default?: () => unknown;
	/** Content below the scrolling body. This region stays in place. */
	footer?: () => unknown;
}>();

const startingWidth = width.value;
const resetWidth = computed(() => props.defaultWidth ?? startingWidth);
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
	<div :style="rootStyle">
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
				<div v-if="$slots.header">
					<slot name="header" />
				</div>
				<N8nScrollArea :class="$style.scroller" edge-fade="y">
					<slot />
				</N8nScrollArea>
				<div v-if="$slots.footer">
					<slot name="footer" />
				</div>
			</aside>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.sidebar {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	overflow: hidden;
	background-color: var(--n8n-sidebar--color--background, var(--background--subtle));
}

.scroller {
	flex: 1;
	padding: var(--n8n-sidebar--padding, var(--spacing--2xs));
}

.left {
	border-inline-end: 1px solid var(--border-color--subtle);
}

.right {
	border-inline-start: 1px solid var(--border-color--subtle);
}
</style>
