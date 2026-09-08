<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

const props = defineProps<{
	class?: HTMLAttributes['class'];
}>();
</script>

<template>
	<div data-slot="card-content" :class="cn('px-4 group-data-[size=sm]/card:px-3', props.class)">
		<slot />
	</div>
</template>
