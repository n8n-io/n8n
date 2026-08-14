<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import VisualPrimitive from './VisualPrimitive.vue';

const props = defineProps<
	VisualProps & {
		title: string;
		subtitle?: string | null;
	}
>();

const visual = computed(() => visualPropsSchema.parse(props));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<header :class="$style.hero">
			<h2 :class="$style.title">{{ title }}</h2>
			<p v-if="subtitle" :class="$style.subtitle">{{ subtitle }}</p>
		</header>
		<div v-if="$slots.default" :class="$style.content"><slot /></div>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.hero {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.title {
	margin: 0;
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xl);
	letter-spacing: var(--letter-spacing--tightest);
	color: var(--generative-accent, var(--text-color));
}
.subtitle {
	margin: 0;
	font-size: var(--font-size--md);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
</style>
