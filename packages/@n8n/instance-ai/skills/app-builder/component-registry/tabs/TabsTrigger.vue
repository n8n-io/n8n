<script setup lang="ts">
import { Tabs as ArkTabs } from '@ark-ui/vue/tabs';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ value: string; class?: HTMLAttributes['class'] }>();
</script>

<template>
	<ArkTabs.Trigger
		:value="props.value"
		:class="
			cn(
				'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:shadow-sm',
				props.class,
			)
		"
	>
		<slot />
	</ArkTabs.Trigger>
</template>
