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
	extends Pick<
			PopoverContentProps,
			| 'side'
			| 'align'
			| 'sideFlip'
			| 'sideOffset'
			| 'reference'
			| 'positionStrategy'
			| 'collisionPadding'
		>,
		Pick<PopoverRootProps, 'open'> {
	/**
	 * Whether to enable scrolling in the popover content
	 */
	enableScrolling?: boolean;
	/**
	 * Whether to force mount the content even when closed
	 */
	forceMount?: boolean;
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
	forceMount: false,
	enableSlideIn: true,
	scrollType: 'hover',
	sideOffset: 4,
	align: 'start',
	sideFlip: undefined,
	collisionPadding: 5,
	suppressAutoFocus: false,
	zIndex: 999,
	showArrow: false,
	teleported: true,
	positionStrategy: undefined,
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
				:collision-padding="collisionPadding"
				:class="[$style.popoverContent, contentClass, { [$style.enableSlideIn]: enableSlideIn }]"
				:style="{ width, zIndex }"
				:reference="reference"
				:force-mount="forceMount"
				:position-strategy="positionStrategy"
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
	--popover--offset--slide-x: 0;
	--popover--offset--slide-y: 0;
	--popover--offset--origin-x: center;
	--popover--offset--origin-y: center;

	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	// NOTE: In https://github.com/n8n-io/n8n/pull/27429 we'll replace custom shadows with tokens
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;
	will-change: transform, opacity;
	transform-origin: var(--popover--offset--origin-x) var(--popover--offset--origin-y);

	&.enableSlideIn {
		animation-duration: var(--duration--snappy);
		animation-timing-function: var(--easing--ease-out);

		&[data-state='open'] {
			animation-name: popoverIn;
		}
	}

	&[data-state='closed'] {
		display: none;
	}
}

.popoverContent[data-state='open'][data-side='top'] {
	--popover--offset--slide-y: -2px;
	--popover--offset--origin-y: bottom;
}

.popoverContent[data-state='open'][data-side='right'] {
	--popover--offset--slide-x: 2px;
	--popover--offset--origin-x: left;
}

.popoverContent[data-state='open'][data-side='bottom'] {
	--popover--offset--slide-y: 2px;
	--popover--offset--origin-y: top;
}

.popoverContent[data-state='open'][data-side='left'] {
	--popover--offset--slide-x: -2px;
	--popover--offset--origin-x: right;
}

.popoverContent[data-state='open'][data-side='top'][data-align='start'],
.popoverContent[data-state='open'][data-side='bottom'][data-align='start'] {
	--popover--offset--slide-x: -2px;
	--popover--offset--origin-x: left;
}

.popoverContent[data-state='open'][data-side='top'][data-align='end'],
.popoverContent[data-state='open'][data-side='bottom'][data-align='end'] {
	--popover--offset--slide-x: 2px;
	--popover--offset--origin-x: right;
}

.popoverContent[data-state='open'][data-side='left'][data-align='start'],
.popoverContent[data-state='open'][data-side='right'][data-align='start'] {
	--popover--offset--slide-y: -2px;
	--popover--offset--origin-y: top;
}

.popoverContent[data-state='open'][data-side='left'][data-align='end'],
.popoverContent[data-state='open'][data-side='right'][data-align='end'] {
	--popover--offset--slide-y: 2px;
	--popover--offset--origin-y: bottom;
}

@keyframes popoverIn {
	from {
		opacity: 0;
		transform: translate(var(--popover--offset--slide-x), var(--popover--offset--slide-y))
			scale(0.96);
	}
	to {
		opacity: 1;
		transform: translate(0, 0) scale(1);
	}
}

.popoverArrow {
	fill: var(--color--foreground--tint-2);
	stroke: var(--color--foreground);
	stroke-width: 1px;
}
</style>
