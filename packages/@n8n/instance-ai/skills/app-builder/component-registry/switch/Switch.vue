<script setup lang="ts">
import { Switch as ArkSwitch } from '@ark-ui/vue/switch';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

// Bare v-model at our boundary; Ark UI's own prop on Switch.Root is `checked`.
const checked = defineModel<boolean>({ default: false });
const props = defineProps<{ disabled?: boolean; class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkSwitch.Root
		v-model:checked="checked"
		:disabled="props.disabled"
		:class="cn('inline-flex items-center gap-2', props.class)"
	>
		<ArkSwitch.Control
			class="inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-input transition-colors data-[state=checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
		>
			<ArkSwitch.Thumb
				class="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-background shadow-xs transition-transform data-[state=checked]:translate-x-[18px]"
			/>
		</ArkSwitch.Control>
		<ArkSwitch.Label v-if="$slots.default" class="text-sm">
			<slot />
		</ArkSwitch.Label>
		<ArkSwitch.HiddenInput />
	</ArkSwitch.Root>
</template>
