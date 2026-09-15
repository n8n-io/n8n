<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const model = defineModel<string | number>();
const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<input
		v-model="model"
		:class="
			cn(
				'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
				props.class,
			)
		"
	/>
</template>
