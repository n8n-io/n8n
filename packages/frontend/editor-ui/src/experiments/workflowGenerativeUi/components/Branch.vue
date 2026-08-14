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
		<section :class="$style.branch">
			<h3 v-if="title" :class="$style.title">{{ title }}</h3>
			<div :class="$style.paths"><slot /></div>
		</section>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.branch {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
.title {
	margin: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
	color: var(--generative-accent, var(--text-color));
}
.paths {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(var(--spacing--5xl) * 1.5)), 1fr));
	gap: var(--spacing--sm);
	align-items: start;
	min-width: 0;

	> * {
		min-width: 0;
		padding: var(--spacing--sm);
		border: var(--border);
		border-radius: var(--radius--md);
		background: var(--generative-surface, var(--background--subtle));
	}
}
</style>
