<script setup lang="ts">
import {
	ScrollAreaCorner,
	ScrollAreaRoot,
	ScrollAreaScrollbar,
	ScrollAreaThumb,
	ScrollAreaViewport,
} from 'reka-ui';
import { useResizeObserver, useScroll } from '@vueuse/core';
import { computed, ref, nextTick, onMounted, type Ref } from 'vue';

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
	/**
	 * Fade the content at the top and bottom edges while more of it can be scrolled into
	 * view: the bottom fade shows until the viewport reaches the end, the top fade shows
	 * once it has left the start. The fade colour defaults to the surface background; set
	 * `--scroll-area--fade-color` on the component to match a different background, and
	 * `--scroll-area--fade-size` to change its height.
	 */
	edgeFade?: boolean;
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
	edgeFade: false,
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

// Edge fades follow the viewport's scroll position. The viewport element is only known
// after mount, so the scroll tracking targets a ref that is filled in then.
const viewportElement = ref<HTMLElement>();
const fadeTarget = computed(() => (props.edgeFade ? viewportElement.value : undefined));
const { arrivedState, measure } = useScroll(fadeTarget, { offset: { top: 1, bottom: 1 } });

// Content or viewport size changes move the edges without a scroll event. The first
// div inside the viewport is the content wrapper that grows with the slot.
useResizeObserver(
	() =>
		props.edgeFade && viewportElement.value
			? [viewportElement.value, viewportElement.value.querySelector('div')]
			: [],
	() => measure(),
);

onMounted(async () => {
	viewportElement.value = getViewportElement();
	await nextTick();
	measure();
});

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

		<template v-if="edgeFade">
			<div
				aria-hidden="true"
				data-test-id="scroll-area-fade-top"
				:class="[$style.fade, $style.fadeTop, { [$style.fadeVisible]: !arrivedState.top }]"
			/>
			<div
				aria-hidden="true"
				data-test-id="scroll-area-fade-bottom"
				:class="[$style.fade, $style.fadeBottom, { [$style.fadeVisible]: !arrivedState.bottom }]"
			/>
		</template>

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
	contain: layout style;
}

.viewport {
	width: 100%;
	height: 100%;
	border-radius: inherit;
	overflow-anchor: none;
}

/* Edge fades sit over the viewport and under the scrollbar; they never take pointer events. */
$fade-color: var(--scroll-area--fade-color, var(--background--surface));

@function fade-stop($opacity) {
	@return color-mix(in srgb, #{$fade-color} #{$opacity}, transparent);
}

.fade {
	position: absolute;
	inset-inline: 0;
	height: var(--scroll-area--fade-size, var(--spacing--3xl));
	pointer-events: none;
	opacity: 0;
	transition: opacity var(--animation--duration--snappy) var(--animation--easing);
	/*
	 * An eased ramp instead of a straight one: a two-stop gradient looks thin because it is
	 * already half transparent at the midpoint. These stops hold the colour over the row at
	 * the edge and taper off in a long tail, so the fade is clearly visible and there is no
	 * line where it ends.
	 */
	background: linear-gradient(
		var(--scroll-area--fade--direction),
		#{$fade-color} 0%,
		fade-stop(92%) 15%,
		fade-stop(78%) 30%,
		fade-stop(58%) 45%,
		fade-stop(38%) 60%,
		fade-stop(20%) 75%,
		fade-stop(8%) 88%,
		transparent 100%
	);
}

.fadeTop {
	--scroll-area--fade--direction: to bottom;

	top: 0;
}

.fadeBottom {
	--scroll-area--fade--direction: to top;

	bottom: 0;
}

.fadeVisible {
	opacity: 1;
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
		width: var(--spacing--2xs);
	}

	&[data-orientation='horizontal'] {
		height: var(--spacing--2xs);
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
