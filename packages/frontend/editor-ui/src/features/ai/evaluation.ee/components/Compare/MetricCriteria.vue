<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { getMetricDescriptionKey } from '../../evaluation.utils';

const props = defineProps<{
	metricKey: string;
	// The metric's custom LLM-judge prompt — the specific criteria the user
	// configured (e.g. "checks for markdown"). Omitted for preset/non-judge
	// metrics, which only show the generic description.
	prompt?: string;
}>();

const i18n = useI18n();
const expanded = ref(false);

// Characters of the custom criteria shown before it's truncated behind "Show
// more" — judging prompts are often long rubrics.
const PREVIEW_CHARS = 120;

const description = computed(() => {
	const key = getMetricDescriptionKey(props.metricKey);
	return key ? i18n.baseText(key) : '';
});

const isLong = computed(() => (props.prompt?.length ?? 0) > PREVIEW_CHARS);

const promptText = computed(() => {
	if (!props.prompt) return '';
	if (expanded.value || !isLong.value) return props.prompt;
	return `${props.prompt.slice(0, PREVIEW_CHARS).trimEnd()}…`;
});
</script>

<template>
	<div v-if="description || prompt" :class="$style.wrap" data-test-id="metric-criteria">
		<N8nText v-if="description" size="xsmall" color="text-light" :class="$style.text">
			{{ description }}
		</N8nText>
		<N8nText
			v-if="prompt"
			size="xsmall"
			color="text-light"
			:class="[$style.text, expanded ? $style.expanded : null]"
		>
			<span :class="$style.label">{{ i18n.baseText('evaluation.metric.criteria.label') }}</span>
			{{ promptText }}
			<button
				v-if="isLong"
				type="button"
				:class="$style.toggle"
				data-test-id="metric-criteria-toggle"
				@click.stop="expanded = !expanded"
			>
				{{
					expanded
						? i18n.baseText('evaluation.metric.criteria.showLess')
						: i18n.baseText('evaluation.metric.criteria.showMore')
				}}
			</button>
		</N8nText>
	</div>
</template>

<style module lang="scss">
.wrap {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	max-width: 320px;
}

.text {
	line-height: 1.3;
}

.expanded {
	white-space: pre-wrap;
	word-break: break-word;
}

.label {
	font-weight: var(--font-weight--bold);
}

.toggle {
	border: none;
	background: none;
	padding: 0;
	margin-left: var(--spacing--4xs);
	color: var(--color--primary);
	cursor: pointer;
	font: inherit;
}
</style>
