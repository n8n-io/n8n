<script setup lang="ts">
import type { SelectContentEmits, SelectContentProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { SelectContent, SelectPortal, SelectViewport, useForwardPropsEmits } from 'reka-ui';
import { cn } from '@/lib/utils';
import { SelectScrollDownButton, SelectScrollUpButton } from '.';

defineOptions({
	inheritAttrs: false,
});

const props = withDefaults(
	defineProps<SelectContentProps & { class?: HTMLAttributes['class'] }>(),
	{
		position: 'item-aligned',
		align: 'center',
	},
);
const emits = defineEmits<SelectContentEmits>();

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
	<SelectPortal>
		<SelectContent
			data-slot="select-content"
			:data-align-trigger="position === 'item-aligned'"
			v-bind="{ ...$attrs, ...forwarded }"
			:class="
				cn(
					'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg shadow-md ring-1 duration-100 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 cn-menu-translucent relative z-50 max-h-(--reka-select-content-available-height) origin-(--reka-select-content-transform-origin) overflow-x-hidden overflow-y-auto data-[align-trigger=true]:animate-none',
					position === 'popper' &&
						'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
					props.class,
				)
			"
		>
			<SelectScrollUpButton />
			<SelectViewport
				:data-position="position"
				:class="
					cn(
						'data-[position=popper]:h-(--reka-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--reka-select-trigger-width)',
					)
				"
			>
				<slot />
			</SelectViewport>
			<SelectScrollDownButton />
		</SelectContent>
	</SelectPortal>
</template>
