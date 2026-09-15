<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkMenu.TriggerItem
		:class="
			cn(
				'flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
				props.class,
			)
		"
	>
		<slot />
		<svg
			viewBox="0 0 24 24"
			class="ml-auto size-4"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<path d="m9 6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</ArkMenu.TriggerItem>
</template>
