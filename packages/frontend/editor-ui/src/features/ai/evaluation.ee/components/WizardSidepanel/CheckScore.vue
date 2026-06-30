<script setup lang="ts">
import { computed } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';

import type { TestCaseExecutionRecord } from '../../evaluation.api';
import { casePassed, formatMetricAverage, type ResultCheck } from '../../evaluation.utils';

// Renders a single check's result for a case: AI-judged checks show the
// out-of-5 score, pass/fail checks show a ✓/✗ marker (pass = a perfect score).
const props = defineProps<{
	check: ResultCheck;
	testCase: TestCaseExecutionRecord;
}>();

const value = computed(() => props.testCase.metrics?.[props.check.key]);
const scoreText = computed(() => formatMetricAverage(value.value, { category: 'aiBased' }));
const passed = computed(() => casePassed(value.value));
</script>

<template>
	<N8nText v-if="check.isAiJudged" size="xsmall" bold color="text-dark">{{ scoreText }}</N8nText>
	<N8nIcon
		v-else
		:icon="passed ? 'check' : 'x'"
		size="xsmall"
		:class="passed ? $style.passIcon : $style.failIcon"
	/>
</template>

<style module lang="scss">
.passIcon {
	color: var(--color--success);
}

.failIcon {
	color: var(--color--danger);
}
</style>
