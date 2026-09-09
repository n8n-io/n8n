<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<div :class="cn('px-2 py-1.5 text-sm font-medium', props.class)">
		<slot />
	</div>
</template>
