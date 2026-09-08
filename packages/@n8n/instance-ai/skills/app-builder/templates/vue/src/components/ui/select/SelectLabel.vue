<script setup lang="ts">
import type { SelectLabelProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { SelectLabel } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>();
</script>

<template>
	<SelectLabel
		data-slot="select-label"
		:class="cn('text-muted-foreground px-1.5 py-1 text-xs', props.class)"
	>
		<slot />
	</SelectLabel>
</template>
