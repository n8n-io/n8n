<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import VisualPrimitive from './VisualPrimitive.vue';

const props = defineProps<
	VisualProps & {
		title?: string | null;
	}
>();

const visual = computed(() => visualPropsSchema.parse(props));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<section :class="$style.timeline">
			<h2 v-if="title" :class="$style.title">{{ title }}</h2>
			<div :class="$style.content"><slot /></div>
		</section>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.timeline {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
}
.title {
	margin: 0;
	color: var(--generative-accent, var(--text-color));
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-left: var(--spacing--sm);
	border-left: var(--focus--border-width) solid var(--border-color--strong);
	min-width: 0;
}
</style>
