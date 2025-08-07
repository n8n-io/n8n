<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';

import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';

interface Props {
	open?: boolean;
	/**
	 * Whether to enable scrolling in the popover content
	 */
	enableScrolling?: boolean;
	/**
	 * Scrollbar visibility behavior
	 */
	scrollType?: 'auto' | 'always' | 'scroll' | 'hover';
	/**
	 * Popover width
	 */
	width?: string;
	/**
	 * Popover max height
	 */
	maxHeight?: string;
	/**
	 * The preferred alignment against the trigger. May change when collisions occur.
	 */
	align?: 'start' | 'center' | 'end';
}

interface Emits {
	(event: 'update:open', value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
	open: undefined,
	maxHeight: undefined,
	width: undefined,
	enableScrolling: true,
	scrollType: 'hover',
	align: undefined,
});

const emit = defineEmits<Emits>();
</script>

<template>
	<PopoverRoot :open="open" @update:open="emit('update:open', $event)">
		<PopoverTrigger :as-child="true">
			<slot name="trigger"></slot>
		</PopoverTrigger>
		<PopoverPortal>
			<PopoverContent side="bottom" :align="align" :side-offset="5" :class="$style.popoverContent">
				<N8nScrollArea
					v-if="enableScrolling"
					:max-height="props.maxHeight"
					:type="scrollType"
					:enable-vertical-scroll="true"
					:enable-horizontal-scroll="false"
				>
					<div :style="{ width }">
						<slot name="content" :close="() => emit('update:open', false)" />
					</div>
				</N8nScrollArea>
				<div v-else :style="{ width }">
					<slot name="content" :close="() => emit('update:open', false)" />
				</div>
			</PopoverContent>
		</PopoverPortal>
	</PopoverRoot>
</template>

<style lang="scss" module>
.popoverContent {
	border-radius: var(--border-radius-base);
	background-color: var(--color-foreground-xlight);
	border: var(--border-base);
	box-shadow:
		rgba(0, 0, 0, 0.1) 0 10px 15px -3px,
		rgba(0, 0, 0, 0.05) 0 4px 6px -2px;
	animation-duration: 400ms;
	animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
	will-change: transform, opacity;
	z-index: 999;
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
