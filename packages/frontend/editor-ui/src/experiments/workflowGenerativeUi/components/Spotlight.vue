<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import VisualPrimitive from './VisualPrimitive.vue';

const props = defineProps<
	VisualProps & {
		label?: string | null;
	}
>();

const visual = computed(() => visualPropsSchema.parse(props));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<section :class="$style.spotlight">
			<p v-if="label" :class="$style.label">{{ label }}</p>
			<div :class="$style.content"><slot /></div>
		</section>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.spotlight {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--md);
	background: var(--generative-surface, var(--background--surface));
	border: var(--border);
	border-color: var(--generative-accent, var(--border-color--strong));
	border-radius: var(--generative-radius, var(--radius--lg));
	box-shadow: var(--shadow--sm);
}
.label {
	margin: 0;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
	color: var(--generative-accent, var(--text-color--subtle));
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
</style>
