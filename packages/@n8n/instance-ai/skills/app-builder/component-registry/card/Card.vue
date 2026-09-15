<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<div
		:class="
			cn(
				'flex flex-col gap-6 rounded-xl border border-border bg-card py-6 text-card-foreground shadow-xs',
				props.class,
			)
		"
	>
		<slot />
	</div>
</template>
