<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import VisualPrimitive from './VisualPrimitive.vue';

const props = defineProps<
	VisualProps & {
		title: string | null;
		summary: string;
	}
>();

const visual = computed(() => visualPropsSchema.parse(props));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<section :class="$style.screen">
			<header v-if="title || summary" :class="$style.header">
				<h1 v-if="title" :class="$style.title">{{ title }}</h1>
				<p :class="$style.summary">{{ summary }}</p>
			</header>
			<div :class="$style.content"><slot /></div>
		</section>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.screen {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	color: var(--text-color);
	min-width: 0;
}
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.title {
	margin: 0;
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xl);
	letter-spacing: var(--letter-spacing--tightest);
	color: var(--generative-accent, var(--text-color));
}
.summary {
	margin: 0;
	font-size: var(--font-size--md);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	max-width: calc(var(--spacing--5xl) * 3);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
</style>
