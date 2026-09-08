<script setup lang="ts">
import type { SelectSeparatorProps } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { reactiveOmit } from '@vueuse/core';
import { SelectSeparator } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<SelectSeparatorProps & { class?: HTMLAttributes['class'] }>();

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
	<SelectSeparator
		data-slot="select-separator"
		v-bind="delegatedProps"
		:class="cn('bg-border -mx-1 my-1 h-px pointer-events-none', props.class)"
	/>
</template>
