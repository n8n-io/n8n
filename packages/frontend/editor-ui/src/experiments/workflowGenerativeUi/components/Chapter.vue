<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import { signpostLabels, type SignpostRole } from '../signposts';
import VisualPrimitive from './VisualPrimitive.vue';

const props = defineProps<
	VisualProps & {
		title: string;
		caption?: string | null;
		signpost?: SignpostRole | null;
	}
>();

const visual = computed(() => visualPropsSchema.parse(props));

const signpostLabel = computed(() => (props.signpost ? signpostLabels[props.signpost] : null));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<section :class="$style.chapter">
			<header :class="$style.header">
				<span
					v-if="signpostLabel"
					:class="$style.signpost"
					data-test-id="chapter-signpost"
					:data-role="signpost"
					>{{ signpostLabel }}</span
				>
				<h3 :class="$style.title">{{ title }}</h3>
				<p v-if="caption" :class="$style.caption">{{ caption }}</p>
			</header>
			<div v-if="$slots.default" :class="$style.content"><slot /></div>
		</section>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.chapter {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.signpost {
	align-self: flex-start;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
	background: var(--background--subtle);
	border-radius: var(--radius--full);
}
.title {
	margin: 0;
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xl);
	color: var(--generative-accent, var(--text-color));
}
.caption {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	color: var(--text-color--subtle);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
</style>
