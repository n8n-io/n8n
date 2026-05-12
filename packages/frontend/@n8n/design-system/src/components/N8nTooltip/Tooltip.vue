<script setup lang="ts">
import {
	TooltipProvider,
	TooltipRoot,
	TooltipTrigger,
	TooltipContent,
	TooltipPortal,
} from 'reka-ui';
import { computed, ref, watch } from 'vue';

import type { N8nTooltipProps } from './Tooltip.types';
import { useInjectTooltipAppendTo } from '../../composables/useTooltipAppendTo';
import { n8nHtml as vN8nHtml } from '../../directives';
import N8nButton from '../N8nButton';

defineOptions({
	name: 'N8nTooltip',
});

const props = withDefaults(defineProps<N8nTooltipProps>(), {
	placement: 'top',
	showAfter: 0,
	enterable: true,
	teleported: true,
	offset: 8,
	buttons: () => [],
	justifyButtons: 'flex-end',
	avoidCollisions: true,
});

// Get append-to target from composable, defaulting to body for proper z-index stacking
const injectedAppendTo = useInjectTooltipAppendTo();
const appendTo = computed(() => injectedAppendTo.value ?? 'body');

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

// Reka UI handles enterable behavior via disableHoverableContent prop
const disableHoverableContent = computed(() => !props.enterable);

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

// Determine if we're in controlled mode
const isControlled = computed(() => props.visible !== undefined);

const handleOpenChange = (open: boolean) => {
	isOpen.value = open;
};
</script>

<template>
	<TooltipProvider>
		<TooltipRoot
			:disabled="disabled"
			:delay-duration="showAfter"
			:open="isControlled ? isOpen : undefined"
			:disable-hoverable-content="disableHoverableContent"
			@update:open="handleOpenChange"
		>
			<TooltipTrigger as="span" :class="{ [$style.disabledTrigger]: disabled }">
				<slot />
			</TooltipTrigger>
			<TooltipPortal :to="teleported ? appendTo : undefined" :disabled="!teleported">
				<TooltipContent
					data-test-id="tooltip-content"
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
				</TooltipContent>
			</TooltipPortal>
		</TooltipRoot>
	</TooltipProvider>
</template>

<style lang="scss" module>
@use '../../css/common/var';

.buttons {
	display: flex;
	align-items: center;
	margin-top: var(--spacing--sm);
	gap: var(--spacing--2xs);
}

.disabledTrigger {
	pointer-events: none;

	> * {
		pointer-events: auto;
	}
}

// Global styles for teleported tooltip content
:global(.n8n-tooltip) {
	z-index: var.$index-popper;
	max-width: 180px;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	min-height: var(--height--sm);
	max-height: var(--reka-tooltip-content-available-height);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	border-radius: var(--radius--xs);
	background: var(--color--neutral-black);
	color: var(--color--neutral-100);
	box-shadow: var(--shadow--sm);
	word-wrap: break-word;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	transform-origin: var(--reka-tooltip-content-transform-origin);
	text-wrap: pretty;

	svg {
		fill: currentColor;
		opacity: 0.7;
	}
}

:global(.n8n-tooltip[data-state='closed']) {
	animation: none;
}
</style>
