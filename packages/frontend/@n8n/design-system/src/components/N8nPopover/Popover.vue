<script setup lang="ts">
import {
	PopoverArrow,
	PopoverContent,
	type PopoverContentProps,
	PopoverPortal,
	PopoverRoot,
	type PopoverRootProps,
	PopoverTrigger,
	type PointerDownOutsideEvent,
	type FocusOutsideEvent,
} from 'reka-ui';
import { watch } from 'vue';
import type { CSSProperties } from 'vue';

defineOptions({ name: 'N8nPopover' });

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
	/**
	 * Whether to show an arrow pointing to the trigger
	 */
	showArrow?: boolean;
	/**
	 * Whether to teleport the popover to the body element
	 */
	teleported?: boolean;
}

interface Emits {
	(event: 'update:open', value: boolean): void;
	(event: 'before-enter'): void;
	(event: 'after-leave'): void;
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
	showArrow: false,
	teleported: true,
});

const emit = defineEmits<Emits>();

function handleOpenAutoFocus(e: Event) {
	if (props.suppressAutoFocus) {
		e.preventDefault();
	}
}

/**
 * Handles outside interaction events to prevent Reka UI from interfering
 * with Element Plus dropdown selections. Element Plus teleports dropdowns
 * to the body, so Reka UI's DismissableLayer detects clicks on them as
 * "outside" clicks, which would otherwise prevent proper selection.
 *
 * TODO: This workaround can be removed once N8nSelect is migrated to Reka UI.
 */
function handleOutsideInteraction(e: PointerDownOutsideEvent | FocusOutsideEvent) {
	const target = e.target as HTMLElement | null;
	if (target?.closest('.el-popper, .el-select-dropdown')) {
		e.preventDefault();
	}
}

// Watch open state to emit lifecycle events
watch(
	() => props.open,
	(newOpen, oldOpen) => {
		if (newOpen && !oldOpen) {
			emit('before-enter');
		} else if (!newOpen && oldOpen) {
			emit('after-leave');
		}
	},
);
</script>

<template>
	<PopoverRoot :open="open" @update:open="emit('update:open', $event)">
		<PopoverTrigger :as-child="true">
			<slot name="trigger"></slot>
		</PopoverTrigger>
		<PopoverPortal :disabled="!teleported">
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
				@pointer-down-outside="handleOutsideInteraction"
				@interact-outside="handleOutsideInteraction"
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
				<PopoverArrow v-if="showArrow" :class="$style.popoverArrow" />
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

.popoverArrow {
	fill: var(--color--foreground--tint-2);
	stroke: var(--color--foreground);
	stroke-width: 1px;
}
</style>
