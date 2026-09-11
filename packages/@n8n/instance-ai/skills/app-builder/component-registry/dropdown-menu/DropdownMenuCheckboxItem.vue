<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const checked = defineModel<boolean>('checked', { default: false });
const props = defineProps<{ value: string; class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkMenu.CheckboxItem
		:value="props.value"
		v-model:checked="checked"
		:class="
			cn(
				'relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
				props.class,
			)
		"
	>
		<span class="absolute left-2 flex size-3.5 items-center justify-center">
			<ArkMenu.ItemIndicator>
				<svg
					viewBox="0 0 24 24"
					class="size-3.5"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
				>
					<path d="M5 12l5 5L20 7" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</ArkMenu.ItemIndicator>
		</span>
		<slot />
	</ArkMenu.CheckboxItem>
</template>
