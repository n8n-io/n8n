<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';

import type { TestCaseExecutionRecord } from '../../evaluation.api';
import { casePassed, formatMetricAverage, type ResultCheck } from '../../evaluation.utils';

const props = defineProps<{
	checks: ResultCheck[];
	runMetrics?: Record<string, number> | null;
	cases: TestCaseExecutionRecord[];
}>();

const locale = useI18n();

// One short summary per check: AI-judged → average %, pass/fail → "X of N passed".
const summaries = computed(() =>
	props.checks.map((check) => {
		if (check.isAiJudged) {
			return {
				key: check.key,
				text: locale.baseText('evaluations.wizardSidepanel.step3.summary.avg', {
					interpolate: {
						name: check.label,
						score: formatMetricAverage(props.runMetrics?.[check.key], { category: 'aiBased' }),
					},
				}),
			};
		}
		const passed = props.cases.filter((c) => casePassed(c.metrics?.[check.key])).length;
		return {
			key: check.key,
			text: locale.baseText('evaluations.wizardSidepanel.step3.summary.passed', {
				interpolate: { name: check.label, passed, total: props.cases.length },
			}),
		};
	}),
);
</script>

<template>
	<div :class="$style.summary" data-test-id="evaluations-wizard-sidepanel-results-summary">
		<N8nText
			v-for="(summary, index) in summaries"
			:key="summary.key"
			size="small"
			color="text-base"
			:class="$style.item"
		>
			<span v-if="index > 0" :class="$style.separator" aria-hidden="true">·</span>
			{{ summary.text }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.summary {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs) var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--subtle);
}

.item {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.separator {
	color: var(--color--text--tint-2);
}
</style>
