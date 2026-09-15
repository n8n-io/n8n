<script setup lang="ts">
import { Checkbox as ArkCheckbox } from '@ark-ui/vue/checkbox';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

// Bare v-model at our boundary; Ark UI's own prop on Checkbox.Root is `checked`.
const checked = defineModel<boolean>({ default: false });
const props = defineProps<{ disabled?: boolean; class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkCheckbox.Root
		v-model:checked="checked"
		:disabled="props.disabled"
		:class="cn('inline-flex items-center gap-2', props.class)"
	>
		<ArkCheckbox.Control
			class="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border shadow-xs transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
		>
			<ArkCheckbox.Indicator>
				<svg
					viewBox="0 0 24 24"
					class="size-3.5"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
				>
					<path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</ArkCheckbox.Indicator>
		</ArkCheckbox.Control>
		<ArkCheckbox.Label v-if="$slots.default" class="text-sm">
			<slot />
		</ArkCheckbox.Label>
		<ArkCheckbox.HiddenInput />
	</ArkCheckbox.Root>
</template>
