<script setup lang="ts">
import {
	PopoverContent,
	type PopoverContentProps,
	PopoverPortal,
	PopoverRoot,
	type PopoverRootProps,
	PopoverTrigger,
} from 'reka-ui';
import type { CSSProperties } from 'vue';

import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';

interface Props
	extends Pick<PopoverContentProps, 'side' | 'align' | 'sideFlip' | 'sideOffset' | 'reference'>,
		Pick<PopoverRootProps, 'open'> {
	/**
	 * Whether to enable scrolling in the popover content
	 */
	enableScrolling?: boolean;
	/**
	 * Whether to enable slide-in animation
	 */
	enableSlideIn?: boolean;
	/**
	 * Whether to suppress auto-focus behavior when the content includes focusable element
	 */
	suppressAutoFocus?: boolean;
	/**
	 * Scrollbar visibility behavior
	 */
	scrollType?: 'auto' | 'always' | 'scroll' | 'hover';
	/**
	 * Popover width
	 */
	width?: string;
	/**
	 * z-index of popover content
	 */
	zIndex?: number | CSSProperties['zIndex'];
	/**
	 * Popover max height
	 */
	maxHeight?: string;
	/**
	 * Additional class name set to PopperContent
	 */
	contentClass?: string;
}

interface Emits {
	(event: 'update:open', value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
	open: undefined,
	maxHeight: undefined,
	width: undefined,
	enableScrolling: true,
	enableSlideIn: true,
	scrollType: 'hover',
	sideOffset: 5,
	sideFlip: undefined,
	suppressAutoFocus: false,
	zIndex: 999,
});

const emit = defineEmits<Emits>();

function handleOpenAutoFocus(e: Event) {
	if (props.suppressAutoFocus) {
		e.preventDefault();
	}
}
</script>

<template>
	<PopoverRoot :open="open" @update:open="emit('update:open', $event)">
		<PopoverTrigger :as-child="true">
			<slot name="trigger"></slot>
		</PopoverTrigger>
		<PopoverPortal>
			<PopoverContent
				role="dialog"
				:side="side"
				:side-flip="sideFlip"
				:align="align"
				:side-offset="sideOffset"
				:class="[$style.popoverContent, contentClass, { [$style.enableSlideIn]: enableSlideIn }]"
				:style="{ width, zIndex }"
				:reference="reference"
				@open-auto-focus="handleOpenAutoFocus"
			>
				<N8nScrollArea
					v-if="enableScrolling"
					:max-height="maxHeight"
					:type="scrollType"
					:enable-vertical-scroll="true"
					:enable-horizontal-scroll="false"
				>
					<slot name="content" :close="() => emit('update:open', false)" />
				</N8nScrollArea>
				<template v-else>
					<slot name="content" :close="() => emit('update:open', false)" />
				</template>
			</PopoverContent>
		</PopoverPortal>
	</PopoverRoot>
</template>

<style lang="scss" module>
.popoverContent {
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;
	will-change: transform, opacity;

	&.enableSlideIn {
		animation-duration: 400ms;
		animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	}
}

.popoverContent[data-state='open'][data-side='top'] {
	animation-name: slideDownAndFade;
}

.popoverContent[data-state='open'][data-side='right'] {
	animation-name: slideLeftAndFade;
}

.popoverContent[data-state='open'][data-side='bottom'] {
	animation-name: slideUpAndFade;
}

.popoverContent[data-state='open'][data-side='left'] {
	animation-name: slideRightAndFade;
}

@keyframes slideUpAndFade {
	from {
		opacity: 0;
		transform: translateY(2px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideRightAndFade {
	from {
		opacity: 0;
		transform: translateX(-2px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

@keyframes slideDownAndFade {
	from {
		opacity: 0;
		transform: translateY(-2px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes slideLeftAndFade {
	from {
		opacity: 0;
		transform: translateX(2px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}
</style>
