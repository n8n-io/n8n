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

import type { N8nTooltipProps, N8nTooltipEmits } from './Tooltip.types';
import N8nButton from '../../../components/N8nButton';
import { useInjectTooltipAppendTo } from '../../../composables/useTooltipAppendTo';

defineOptions({
	inheritAttrs: false,
});

const props = withDefaults(defineProps<N8nTooltipProps>(), {
	placement: 'top',
	showAfter: 0,
	enterable: true,
	teleported: true,
	showArrow: true,
	justifyButtons: 'flex-end',
	buttons: () => [],
	offset: 6,
});

const emit = defineEmits<N8nTooltipEmits>();

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
	const [s, a] = props.placement.split('-');
	return {
		side: isSide(s) ? s : 'top',
		align: isAlign(a) ? a : 'center',
	};
});

// Handle controlled visibility
const isOpen = ref(false);

watch(
	() => props.visible,
	(newVisible, oldVisible) => {
		if (newVisible !== undefined) {
			isOpen.value = newVisible;
			// Only emit on changes, not on initial mount
			if (oldVisible !== undefined && newVisible !== oldVisible) {
				emit('update:visible', newVisible);
			}
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
	emit('update:visible', open);
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
			<TooltipTrigger as-child>
				<slot />
			</TooltipTrigger>

			<component
				:is="teleported ? TooltipPortal : 'template'"
				:to="teleported ? (appendTo ?? 'body') : undefined"
			>
				<TooltipContent
					:side="placementParts.side"
					:align="placementParts.align"
					:side-offset="offset"
					:class="popperClass ?? 'n8n-tooltip'"
					v-bind="popperOptions ?? {}"
				>
					<slot name="content">
						<div v-n8n-html="content"></div>
					</slot>

					<div
						v-if="buttons.length"
						:class="$style.buttons"
						:style="{ justifyContent: justifyButtons }"
					>
						<N8nButton
							v-for="(button, index) in buttons"
							:key="button.attrs.label ?? `button-${index}`"
							v-bind="{ ...button.attrs, ...button.listeners }"
						/>
					</div>

					<TooltipArrow v-if="showArrow" :class="$style.arrow" />
				</TooltipContent>
			</component>
		</TooltipRoot>
	</TooltipProvider>
</template>

<style lang="scss" module>
.buttons {
	display: flex;
	align-items: center;
	margin-top: var(--spacing--sm);
	gap: var(--spacing--2xs);
}

.arrow {
	fill: currentColor;
}

// Global styles for teleported tooltip content
// TODO: Remove :not(.el-popper) selector once Element+ is fully removed
:global(.n8n-tooltip:not(.el-popper)) {
	max-width: 180px;
	padding: 10px;
	font-size: 12px;
	line-height: var(--line-height--md);
	border-radius: 4px;
	background: var(--color--background--shade-2);
	color: var(--color--foreground--tint-2);
	word-wrap: break-word;

	img {
		max-width: 100%;
	}

	svg {
		fill: var(--color--background--shade-2);
	}
}
</style>
