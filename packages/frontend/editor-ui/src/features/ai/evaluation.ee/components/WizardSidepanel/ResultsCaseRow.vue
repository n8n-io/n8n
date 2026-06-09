<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nIcon, N8nText } from '@n8n/design-system';

import type { TestCaseExecutionRecord } from '../../evaluation.api';
import type { ExpectedField } from '../../evaluation.constants';
import {
	formatDuration,
	formatTokens,
	stringifyValue,
	type ResultCheck,
} from '../../evaluation.utils';
import CheckScore from './CheckScore.vue';

const props = defineProps<{
	caseIndex: number;
	testCase: TestCaseExecutionRecord;
	checks: ResultCheck[];
	expectedFields: ExpectedField[];
	// The expected-output values from the dataset's `expectedAnswer`/`expectedTools`
	// columns, keyed by field name. Sourced from the wizard store, which holds the
	// Step-2 entry and is rehydrated from the data table on open. (The test-case
	// record's `inputs` comes from the Set Inputs node and never carries these.)
	expectedValues: Record<string, string>;
	aiAnswer: string;
	runMetrics?: Record<string, number> | null;
}>();

const locale = useI18n();
const expanded = ref(false);

const caseLabel = computed(() =>
	locale.baseText('evaluations.wizardSidepanel.step3.caseLabel', {
		interpolate: { index: props.caseIndex },
	}),
);

const expectedEntries = computed(() =>
	props.expectedFields.map((field) => ({
		name: field.name,
		label: locale.baseText(field.labelKey as BaseTextKey),
		// The dataset's expected value (via the store); the case's own `inputs` is a
		// last-resort fallback should a Set Inputs node ever echo the column.
		value:
			props.expectedValues[field.name] || stringifyValue(props.testCase.inputs?.[field.name]) || '',
	})),
);

const operationalMeta = computed(() => {
	const tokens = props.testCase.metrics?.totalTokens ?? props.runMetrics?.totalTokens;
	const time = props.testCase.metrics?.executionTime ?? props.runMetrics?.executionTime;
	return locale.baseText('evaluations.wizardSidepanel.step3.outputMeta', {
		interpolate: { tokens: formatTokens(tokens, { withUnit: false }), time: formatDuration(time) },
	});
});
</script>

<template>
	<div :class="$style.row" :data-test-id="`evaluations-wizard-sidepanel-case-${caseIndex}`">
		<button
			type="button"
			:class="$style.head"
			:aria-expanded="expanded"
			:data-test-id="`evaluations-wizard-sidepanel-case-toggle-${caseIndex}`"
			@click="expanded = !expanded"
		>
			<N8nText size="small" bold color="text-dark" :class="$style.caseLabel">
				{{ caseLabel }}
			</N8nText>
			<span :class="$style.scores">
				<span v-for="check in checks" :key="check.key" :class="$style.score">
					<N8nText size="xsmall" color="text-base">{{ check.label }}</N8nText>
					<CheckScore :check="check" :test-case="testCase" />
				</span>
			</span>
			<N8nIcon
				icon="chevron-down"
				size="small"
				:class="[$style.caret, expanded ? $style.caretOpen : null]"
			/>
		</button>

		<div
			v-if="expanded"
			:class="$style.detail"
			:data-test-id="`evaluations-wizard-sidepanel-case-detail-${caseIndex}`"
		>
			<div v-for="field in expectedEntries" :key="`expected-${field.name}`" :class="$style.field">
				<N8nText size="xsmall" color="text-base">{{ field.label }}</N8nText>
				<N8nText size="small" color="text-dark" :class="$style.fieldValue">
					{{ field.value || '–' }}
				</N8nText>
			</div>

			<div :class="$style.field">
				<N8nText size="xsmall" color="text-base">
					{{ locale.baseText('evaluations.wizardSidepanel.step3.aiAnswer') }}
				</N8nText>
				<N8nText size="small" color="text-dark" :class="$style.fieldValue">
					{{ aiAnswer || '–' }}
				</N8nText>
			</div>

			<div :class="$style.checkScores">
				<div v-for="check in checks" :key="`score-${check.key}`" :class="$style.checkScoreRow">
					<span :class="$style.checkLabel">
						<span
							:class="$style.checkIcon"
							:style="
								check.iconBg || check.iconFg
									? { backgroundColor: check.iconBg, color: check.iconFg }
									: undefined
							"
						>
							<N8nIcon :icon="check.icon" size="xsmall" />
						</span>
						<N8nText size="small" color="text-dark">{{ check.label }}</N8nText>
					</span>
					<CheckScore :check="check" :test-case="testCase" />
				</div>
			</div>

			<N8nText size="xsmall" color="text-light">{{ operationalMeta }}</N8nText>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: hidden;
}

.head {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--sm);
	background: transparent;
	border: none;
	cursor: pointer;
	text-align: left;

	&:hover,
	&:focus-visible {
		background-color: var(--background--subtle);
	}
}

.caseLabel {
	flex-shrink: 0;
}

.scores {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs) var(--spacing--xs);
	flex: 1 1 auto;
	min-width: 0;
}

.score {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.caret {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transition: transform var(--duration--snappy) ease;
}

.caretOpen {
	transform: rotate(180deg);
}

.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-top: var(--border);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.fieldValue {
	white-space: pre-wrap;
	word-break: break-word;
}

.checkScores {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.checkScoreRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.checkLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.checkIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 20px;
	height: 20px;
	border-radius: var(--radius--2xs);
	background-color: var(--background--subtle);
	color: var(--color--text--tint-1);
}
</style>
