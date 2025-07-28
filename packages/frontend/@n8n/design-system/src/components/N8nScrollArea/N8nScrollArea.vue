<script setup lang="ts">
import {
	ScrollAreaCorner,
	ScrollAreaRoot,
	ScrollAreaScrollbar,
	ScrollAreaThumb,
	ScrollAreaViewport,
} from 'reka-ui';
import { computed } from 'vue';

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
}

const props = withDefaults(defineProps<Props>(), {
	type: 'hover',
	dir: 'ltr',
	scrollHideDelay: 600,
	maxHeight: undefined,
	maxWidth: undefined,
	enableHorizontalScroll: false,
	enableVerticalScroll: true,
});

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
</script>

<template>
	<ScrollAreaRoot
		:type="type"
		:dir="dir"
		:scroll-hide-delay="scrollHideDelay"
		:class="$style.scrollAreaRoot"
	>
		<ScrollAreaViewport :class="$style.viewport" :style="viewportStyle">
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
	padding: var(--spacing-5xs);
	background: transparent;
	transition: background 160ms ease-out;

	&:hover {
		background: var(--color-foreground-light);
	}

	&[data-orientation='vertical'] {
		width: var(--spacing-xs);
	}

	&[data-orientation='horizontal'] {
		height: var(--spacing-xs);
		flex-direction: row;
	}
}

.thumb {
	flex: 1;
	background: var(--color-foreground-base);
	border-radius: 4px;
	position: relative;

	&::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 100%;
		height: 100%;
		min-width: 44px;
		min-height: 44px;
	}

	&:hover {
		background: var(--color-foreground-dark);
	}

	&:active {
		background: var(--color-foreground-xdark);
	}
}

// Style the scrollbar when type is 'always' to be more subtle
.scrollAreaRoot[data-type='always'] {
	.scrollbar {
		background: var(--color-foreground-xlight);

		&:hover {
			background: var(--color-foreground-light);
		}
	}

	.thumb {
		background: var(--color-foreground-light);

		&:hover {
			background: var(--color-foreground-base);
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
