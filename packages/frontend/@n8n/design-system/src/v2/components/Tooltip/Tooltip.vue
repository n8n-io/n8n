<script setup lang="ts">
import {
	TooltipRoot,
	TooltipTrigger,
	TooltipContent,
	TooltipPortal,
	TooltipArrow,
	useForwardPropsEmits,
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
});

const emit = defineEmits<N8nTooltipEmits>();

// Get append-to target from composable
const appendTo = useInjectTooltipAppendTo();

// Convert Element+ placement to Reka UI side + align
const placementParts = computed(() => {
	const [s, a] = props.placement.split('-');
	return {
		side: s as 'top' | 'bottom' | 'left' | 'right',
		align: (a as 'start' | 'end') ?? 'center',
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

// Forward props and emits to Reka UI
const rootProps = computed(() => {
	const {
		content,
		placement,
		showAfter,
		visible,
		popperClass,
		enterable,
		popperOptions,
		teleported,
		offset,
		showArrow,
		buttons,
		justifyButtons,
		...rest
	} = props;

	return {
		...rest,
		disabled: props.disabled,
		delayDuration: showAfter,
		...(visible !== undefined && { open: isOpen.value }),
	};
});

const forwarded = useForwardPropsEmits(rootProps, emit);

// Reka UI handles enterable behavior via disableHoverableContent prop
const disableHoverableContent = computed(() => !props.enterable);
</script>

<template>
	<TooltipRoot
		v-bind="forwarded"
		:disable-hoverable-content="disableHoverableContent"
		@update:open="
			(open) => {
				isOpen = open;
				emit('update:open', open);
			}
		"
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
</style>
