<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ value: string; class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkMenu.RadioItem
		:value="props.value"
		:class="
			cn(
				'relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
				props.class,
			)
		"
	>
		<span class="absolute left-2 flex size-3.5 items-center justify-center">
			<ArkMenu.ItemIndicator>
				<svg viewBox="0 0 24 24" class="size-2" fill="currentColor">
					<circle cx="12" cy="12" r="10" />
				</svg>
			</ArkMenu.ItemIndicator>
		</span>
		<slot />
	</ArkMenu.RadioItem>
</template>
