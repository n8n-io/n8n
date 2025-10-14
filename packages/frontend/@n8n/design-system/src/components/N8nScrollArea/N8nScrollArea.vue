<script setup lang="ts">
import {
	ScrollAreaCorner,
	ScrollAreaRoot,
	ScrollAreaScrollbar,
	ScrollAreaThumb,
	ScrollAreaViewport,
} from 'reka-ui';
import { computed, ref, nextTick, type Ref } from 'vue';

export interface Props {
	/**
	 * Controls scrollbar visibility behavior
	 * - auto: shows scrollbars only when content overflows
	 * - always: always shows scrollbars
	 * - scroll: shows scrollbars when scrolling
	 * - hover: shows scrollbars on hover
	 */
	type?: 'auto' | 'always' | 'scroll' | 'hover';
	/**
	 * Reading direction for RTL support
	 */
	dir?: 'ltr' | 'rtl';
	/**
	 * Time in milliseconds before scrollbars auto-hide
	 */
	scrollHideDelay?: number;
	/**
	 * Maximum height of the scroll area
	 */
	maxHeight?: string;
	/**
	 * Maximum width of the scroll area
	 */
	maxWidth?: string;
	/**
	 * Whether to show horizontal scrollbar
	 */
	enableHorizontalScroll?: boolean;
	/**
	 * Whether to show vertical scrollbar
	 */
	enableVerticalScroll?: boolean;
	/**
	 * Change the default rendered element for the one passed as a child, merging their props and behavior.
	 */
	asChild?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	type: 'hover',
	dir: 'ltr',
	scrollHideDelay: 600,
	maxHeight: undefined,
	maxWidth: undefined,
	enableHorizontalScroll: false,
	enableVerticalScroll: true,
	asChild: false,
});

// Type for the ScrollAreaRoot instance with the viewport property
interface ScrollAreaRootWithViewport {
	viewport?: Ref<HTMLElement | undefined> | HTMLElement;
}

const rootRef = ref<ScrollAreaRootWithViewport>();

const viewportStyle = computed(() => {
	const style: Record<string, string> = {};
	if (props.maxHeight) {
		style.maxHeight = props.maxHeight;
	}
	if (props.maxWidth) {
		style.maxWidth = props.maxWidth;
	}
	return style;
});

/**
 * Gets the viewport element from the root ref
 */
function getViewportElement(): HTMLElement | undefined {
	if (!rootRef.value?.viewport) return undefined;

	const viewport = rootRef.value.viewport;

	// If it's a Vue ref, unwrap it
	if (typeof viewport === 'object' && 'value' in viewport) {
		return viewport.value;
	}

	// If it's already an HTMLElement, use it directly
	if (viewport instanceof HTMLElement) {
		return viewport;
	}

	return undefined;
}

/**
 * Scrolls the viewport to the bottom
 * @param options - Options for controlling scroll behavior
 */
async function scrollToBottom(options: { smooth?: boolean } = {}) {
	// Wait for DOM updates to ensure content is fully rendered
	await nextTick();

	const viewport = getViewportElement();

	if (viewport && typeof viewport.scrollTo === 'function') {
		viewport.scrollTo({
			top: viewport.scrollHeight,
			behavior: options.smooth ? 'smooth' : 'auto',
		});
	} else if (viewport) {
		// Fallback for test environments or browsers that don't support scrollTo
		viewport.scrollTop = viewport.scrollHeight;
	}
}

/**
 * Scrolls the viewport to the top
 * @param options - Options for controlling scroll behavior
 */
async function scrollToTop(options: { smooth?: boolean } = {}) {
	await nextTick();

	const viewport = getViewportElement();

	if (viewport && typeof viewport.scrollTo === 'function') {
		viewport.scrollTo({
			top: 0,
			behavior: options.smooth ? 'smooth' : 'auto',
		});
	} else if (viewport) {
		// Fallback for test environments or browsers that don't support scrollTo
		viewport.scrollTop = 0;
	}
}

/**
 * Gets the current scroll position
 */
function getScrollPosition() {
	const viewport = getViewportElement();

	if (viewport) {
		return {
			top: viewport.scrollTop,
			left: viewport.scrollLeft,
			height: viewport.scrollHeight,
			width: viewport.scrollWidth,
		};
	}
	return null;
}

defineExpose({
	scrollToBottom,
	scrollToTop,
	getScrollPosition,
});
</script>

<template>
	<ScrollAreaRoot
		ref="rootRef"
		:type="type"
		:dir="dir"
		:scroll-hide-delay="scrollHideDelay"
		:class="$style.scrollAreaRoot"
	>
		<ScrollAreaViewport :as-child="asChild" :class="$style.viewport" :style="viewportStyle">
			<slot />
		</ScrollAreaViewport>

		<ScrollAreaScrollbar
			v-if="enableVerticalScroll"
			orientation="vertical"
			:class="$style.scrollbar"
		>
			<ScrollAreaThumb :class="$style.thumb" />
		</ScrollAreaScrollbar>

		<ScrollAreaScrollbar
			v-if="enableHorizontalScroll"
			orientation="horizontal"
			:class="$style.scrollbar"
		>
			<ScrollAreaThumb :class="$style.thumb" />
		</ScrollAreaScrollbar>

		<ScrollAreaCorner v-if="enableHorizontalScroll && enableVerticalScroll" />
	</ScrollAreaRoot>
</template>

<style lang="scss" module>
.scrollAreaRoot {
	position: relative;
	overflow: hidden;
	width: 100%;
	height: 100%;
	--scrollbar-size: 10px;
}

.viewport {
	width: 100%;
	height: 100%;
	border-radius: inherit;
}

.scrollbar {
	display: flex;
	user-select: none;
	touch-action: none;
	padding: var(--spacing--5xs);
	background: transparent;
	transition: background 160ms ease-out;
	pointer-events: none;

	&:hover {
		background: var(--color--foreground--tint-1);
	}

	&[data-orientation='vertical'] {
		width: var(--spacing--xs);
	}

	&[data-orientation='horizontal'] {
		height: var(--spacing--xs);
		flex-direction: row;
	}
}

.thumb {
	flex: 1;
	background: var(--color--foreground);
	border-radius: 4px;
	position: relative;
	pointer-events: auto;

	&:hover {
		background: var(--color--foreground--shade-1);
	}

	&:active {
		background: var(--color--foreground--shade-2);
	}
}

// Style the scrollbar when type is 'always' to be more subtle
.scrollAreaRoot[data-type='always'] {
	.scrollbar {
		background: var(--color--foreground--tint-2);

		&:hover {
			background: var(--color--foreground--tint-1);
		}
	}

	.thumb {
		background: var(--color--foreground--tint-1);

		&:hover {
			background: var(--color--foreground);
		}
	}
}

// Enhanced styling for hover type
.scrollAreaRoot[data-type='hover'] {
	.scrollbar {
		opacity: 0;
		transition: opacity 160ms ease-out;
	}

	&:hover .scrollbar {
		opacity: 1;
	}
}
</style>
