<script setup lang="ts">
import { computed } from 'vue';

import type { ModalSidebarProps } from './ModalSidebar.types';
import type { Direction, ResizeData } from '../../types';
import N8nResizeWrapper from '../N8nResizeWrapper/ResizeWrapper.vue';

defineOptions({ name: 'N8nModalSidebar' });

const props = withDefaults(defineProps<ModalSidebarProps>(), {
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

const startingWidth = width.value;
const resetWidth = computed(() => props.defaultWidth ?? startingWidth);
const resizeDirections = computed<Direction[]>(() =>
	props.side === 'right' ? ['left'] : ['right'],
);

// The dragged width is a free pixel size. A grid would step the sidebar.
const resizeGridSize = 0;

const rootStyle = computed(() => ({
	width: `${width.value}px`,
	minWidth: `${props.minWidth}px`,
	maxWidth: `${props.maxWidth}px`,
}));

function onResize(data: ResizeData) {
	width.value = data.width;
	emit('resize', data);
}
</script>

<template>
	<div :class="$style.root" :style="rootStyle" :data-side="side">
		<N8nResizeWrapper
			:width="width"
			:default-width="resetWidth"
			:min-width="minWidth"
			:max-width="maxWidth"
			:grid-size="resizeGridSize"
			:supported-directions="resizeDirections"
			:is-resizing-enabled="resizable"
			@resize="onResize"
		>
			<aside
				:class="[$style.sidebar, $style[side]]"
				:aria-label="label"
				data-test-id="modal-sidebar"
			>
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
	// Raised surface. Darker than the dialog in dark mode. Off-white in light mode.
	background-color: var(--color--background--light-2);
	color: var(--color--text);
}

.left {
	border-right: var(--border);
}

.right {
	border-left: var(--border);
}
</style>
