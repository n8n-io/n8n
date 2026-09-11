<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
	<div :class="cn('flex items-center px-6 [.border-t]:pt-6', props.class)">
		<slot />
	</div>
</template>
