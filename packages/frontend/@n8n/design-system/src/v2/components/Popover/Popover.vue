<script setup lang="ts">
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent, PopoverArrow } from 'reka-ui';
import { computed, ref, watch, onUnmounted } from 'vue';

import type { N8nPopoverProps, N8nPopoverEmits } from './Popover.types';

defineOptions({
	inheritAttrs: false,
});

const props = withDefaults(defineProps<N8nPopoverProps>(), {
	trigger: 'click',
	placement: 'bottom',
	teleported: true,
	showArrow: true,
	offset: 6,
});

const emit = defineEmits<N8nPopoverEmits>();

// Convert Element+ placement to Reka UI side + align
type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'end' | 'center';

const VALID_SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
const VALID_ALIGNS: Align[] = ['start', 'end', 'center'];

const isSide = (value: string): value is Side => VALID_SIDES.some((side) => side === value);
const isAlign = (value: string): value is Align => VALID_ALIGNS.some((align) => align === value);

const placementParts = computed(() => {
	const [sideValue, alignValue] = props.placement.split('-');
	return {
		side: isSide(sideValue) ? sideValue : 'bottom',
		align: isAlign(alignValue) ? alignValue : 'center',
	};
});

// Handle controlled/uncontrolled visibility
const internalOpen = ref(false);

watch(
	() => props.visible,
	(newVisible) => {
		if (newVisible !== undefined) {
			internalOpen.value = newVisible;
		}
	},
	{ immediate: true },
);

const isControlled = computed(() => props.visible !== undefined);

const handleOpenChange = (open: boolean) => {
	internalOpen.value = open;
	emit('update:visible', open);
};

const close = () => {
	handleOpenChange(false);
};

// Hover trigger support (Reka UI only supports click natively)
const hoverTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

const handleMouseEnter = () => {
	if (props.trigger !== 'hover') return;
	if (hoverTimeout.value) {
		clearTimeout(hoverTimeout.value);
		hoverTimeout.value = null;
	}
	handleOpenChange(true);
};

const handleMouseLeave = () => {
	if (props.trigger !== 'hover') return;
	hoverTimeout.value = setTimeout(() => {
		handleOpenChange(false);
	}, 100);
};

// Normalize width prop
const normalizedWidth = computed(() => {
	if (props.width === undefined) return undefined;
	if (typeof props.width === 'number') return `${props.width}px`;
	return props.width;
});

// Emit animation events based on visibility changes
watch(internalOpen, (isOpen, wasOpen) => {
	if (isOpen && !wasOpen) {
		emit('before-enter');
	} else if (!isOpen && wasOpen) {
		emit('after-leave');
	}
});

// Cleanup on unmount
onUnmounted(() => {
	if (hoverTimeout.value) {
		clearTimeout(hoverTimeout.value);
	}
});

// Compute content styles
const contentStyles = computed(() => {
	return [{ width: normalizedWidth.value }, props.contentStyle];
});
</script>

<template>
	<PopoverRoot :open="isControlled ? internalOpen : undefined" @update:open="handleOpenChange">
		<PopoverTrigger as-child>
			<span
				:class="$style.triggerWrapper"
				@mouseenter="handleMouseEnter"
				@mouseleave="handleMouseLeave"
			>
				<slot name="reference" />
			</span>
		</PopoverTrigger>

		<component :is="teleported ? PopoverPortal : 'template'">
			<PopoverContent
				:side="placementParts.side"
				:align="placementParts.align"
				:side-offset="offset"
				:class="[$style.popoverContent, contentClass]"
				:style="contentStyles"
				@mouseenter="handleMouseEnter"
				@mouseleave="handleMouseLeave"
			>
				<slot :close="close" />
				<PopoverArrow v-if="showArrow" :class="$style.arrow" />
			</PopoverContent>
		</component>
	</PopoverRoot>
</template>

<style lang="scss" module>
.triggerWrapper {
	display: inline-block;
}

.popoverContent {
	border-radius: var(--radius);
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;
	z-index: 999999;
	will-change: transform, opacity;
	animation-duration: 200ms;
	animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);

	&[data-state='open'][data-side='top'] {
		animation-name: slideDownAndFade;
	}

	&[data-state='open'][data-side='right'] {
		animation-name: slideLeftAndFade;
	}

	&[data-state='open'][data-side='bottom'] {
		animation-name: slideUpAndFade;
	}

	&[data-state='open'][data-side='left'] {
		animation-name: slideRightAndFade;
	}
}

.arrow {
	fill: var(--color--foreground--tint-2);

	path {
		stroke: var(--color--foreground);
		stroke-width: 1;
	}
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
