<script setup lang="ts">
import type { Extension } from '@codemirror/state';
import { ExpressionOutput } from '@n8n/expression-editor';
import type { Segment } from '@n8n/expression-editor';
import { useTemplateRef } from 'vue';

import RunDataHtml from '@/features/ndv/runData/components/RunDataHtml.vue';
import RunDataMarkdown from '@/features/ndv/runData/components/RunDataMarkdown.vue';

withDefaults(
	defineProps<{
		segments: Segment[];
		extensions?: Extension[];
		render?: 'text' | 'html' | 'markdown';
	}>(),
	{
		extensions: () => [],
		render: 'text',
	},
);

const output = useTemplateRef('output');

defineExpose({ getValue: () => output.value?.getValue() ?? '=' });
</script>

<template>
	<ExpressionOutput ref="output" :segments="segments" :extensions="extensions" :render="render">
		<template #html="{ value, attrs }">
			<RunDataHtml data-test-id="expression-output" v-bind="attrs" :input-html="value" />
		</template>
		<template #markdown="{ value, attrs }">
			<RunDataMarkdown data-test-id="expression-output" v-bind="attrs" :input-markdown="value" />
		</template>
	</ExpressionOutput>
</template>

<style lang="scss">
.__html-display {
	border: 2px solid var(--border-color);
	padding: var(--spacing--xs);
	border-width: var(--border-width);
	border-style: var(--input--border-style, var(--border-style));
	border-color: var(--input--border-color, var(--border-color));
	border-radius: var(--input--radius, var(--radius));
}
</style>
