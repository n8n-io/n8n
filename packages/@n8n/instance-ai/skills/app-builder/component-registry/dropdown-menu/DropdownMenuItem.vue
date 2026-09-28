<script setup lang="ts">
import { Menu as ArkMenu } from '@ark-ui/vue/menu';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ value: string; disabled?: boolean; class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkMenu.Item
		:value="props.value"
		:disabled="props.disabled"
		:class="
			cn(
				'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
				props.class,
			)
		"
	>
		<slot />
	</ArkMenu.Item>
</template>
