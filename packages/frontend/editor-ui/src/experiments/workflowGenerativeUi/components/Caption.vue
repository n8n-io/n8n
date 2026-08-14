<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import VisualPrimitive from './VisualPrimitive.vue';

const props = defineProps<VisualProps & { text: string }>();

const visual = computed(() => visualPropsSchema.parse(props));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<p :class="$style.caption">{{ text }}</p>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.caption {
	margin: 0;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	color: var(--generative-accent, var(--text-color--subtler));
}
</style>
