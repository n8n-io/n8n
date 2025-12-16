<script setup lang="ts">
import {
	TooltipProvider,
	TooltipRoot,
	TooltipTrigger,
	TooltipContent,
	TooltipPortal,
	TooltipArrow,
} from 'reka-ui';
import { computed, ref, watch } from 'vue';

import type { N8nTooltipProps } from './Tooltip.types';
import { useInjectTooltipAppendTo } from '../../composables/useTooltipAppendTo';
import { n8nHtml as vN8nHtml } from '../../directives';
import N8nButton from '../N8nButton';

defineOptions({
	name: 'N8nTooltip',
	inheritAttrs: false,
});

const props = withDefaults(defineProps<N8nTooltipProps>(), {
	placement: 'top',
	showAfter: 0,
	enterable: true,
	teleported: true,
	offset: 6,
	buttons: () => [],
	justifyButtons: 'flex-end',
	avoidCollisions: true,
});

// Get append-to target from composable
const appendTo = useInjectTooltipAppendTo();

// Convert Element+ placement to Reka UI side + align
type Side = 'top' | 'bottom' | 'left' | 'right';
type Align = 'start' | 'end' | 'center';

const VALID_SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
const VALID_ALIGNS: Align[] = ['start', 'end', 'center'];

const isSide = (value: string): value is Side => VALID_SIDES.includes(value as Side);
const isAlign = (value: string): value is Align => VALID_ALIGNS.includes(value as Align);

const placementParts = computed(() => {
	const [sideValue, alignValue] = props.placement.split('-');
	return {
		side: isSide(sideValue) ? sideValue : 'top',
		align: isAlign(alignValue) ? alignValue : 'center',
	};
});

// Handle controlled visibility
const isOpen = ref(false);

watch(
	() => props.visible,
	(newVisible) => {
		if (newVisible !== undefined) {
			isOpen.value = newVisible;
		}
	},
	{ immediate: true },
);

// Reka UI handles enterable behavior via disableHoverableContent prop
const disableHoverableContent = computed(() => !props.enterable);

// Determine if we're in controlled mode
const isControlled = computed(() => props.visible !== undefined);

const handleOpenChange = (open: boolean) => {
	isOpen.value = open;
};
</script>

<template>
	<TooltipProvider
		:delay-duration="showAfter"
		:disable-hoverable-content="disableHoverableContent"
		:skip-delay-duration="0"
	>
		<TooltipRoot
			:open="isControlled ? isOpen : undefined"
			:default-open="false"
			:disabled="disabled"
			:disable-closing-trigger="true"
			:ignore-non-keyboard-focus="true"
			@update:open="handleOpenChange"
		>
			<TooltipTrigger as-child :disabled="disabled">
				<slot />
			</TooltipTrigger>
			<TooltipPortal :to="teleported ? appendTo : undefined" :disabled="!teleported">
				<TooltipContent
					:class="['n8n-tooltip', contentClass]"
					:side="placementParts.side"
					:align="placementParts.align"
					:side-offset="offset"
					:avoid-collisions="avoidCollisions"
					:collision-padding="8"
				>
					<slot name="content">
						<span v-n8n-html="content ?? ''" />
					</slot>
					<div
						v-if="buttons.length"
						:class="$style.buttons"
						:style="{ justifyContent: justifyButtons }"
					>
						<N8nButton
							v-for="button in buttons"
							:key="button.attrs.label"
							v-bind="{ ...button.attrs, ...button.listeners }"
						/>
					</div>
					<TooltipArrow :class="$style.arrow" :width="8" :height="4" />
				</TooltipContent>
			</TooltipPortal>
		</TooltipRoot>
	</TooltipProvider>
</template>

<style lang="scss" module>
.arrow {
	fill: currentColor;
}

.buttons {
	display: flex;
	align-items: center;
	margin-top: var(--spacing--sm);
	gap: var(--spacing--2xs);
}

// Global styles for teleported tooltip content
:global(.n8n-tooltip) {
	max-width: 180px;
	padding: 10px;
	font-size: 12px;
	line-height: var(--line-height--md);
	border-radius: 4px;
	background: var(--color--background--shade-2);
	color: var(--color--foreground--tint-2);
	word-wrap: break-word;

	svg {
		fill: var(--color--background--shade-2);
	}
}
</style>
