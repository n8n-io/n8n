<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { N8nCard } from '@n8n/design-system';
import type { TestCaseExecutionRecord } from '../../evaluation.api';
import {
	computeDurationMs,
	getUserDefinedMetricNames,
	normalizeMetricValue,
	type MetricSource,
} from '../../evaluation.utils';
import { getErrorBaseKey } from '../../evaluation.constants';
import TestCaseHeader from './TestCaseHeader.vue';
import TestCaseMetricRow from './TestCaseMetricRow.vue';

const props = defineProps<{
	testCase: TestCaseExecutionRecord;
	index: number;
	metricSources?: Record<string, MetricSource>;
}>();

const emit = defineEmits<{
	view: [TestCaseExecutionRecord];
	cancel: [TestCaseExecutionRecord];
	rerun: [TestCaseExecutionRecord];
}>();

const locale = useI18n();

const status = computed(() => props.testCase.status);

const tokens = computed(() => {
	const value = props.testCase.metrics?.totalTokens;
	return typeof value === 'number' ? value : undefined;
});

const durationMs = computed(() => {
	const fromMetric = props.testCase.metrics?.executionTime;
	if (typeof fromMetric === 'number') return fromMetric;
	return computeDurationMs(props.testCase.runAt ?? undefined, props.testCase.updatedAt);
});

const isOpaque = computed(() => status.value === 'new' || status.value === 'cancelled');
const isErrored = computed(() => status.value === 'error' || status.value === 'warning');
const showRows = computed(() => status.value === 'success' || isErrored.value);

const errorMessage = computed(() => {
	const code = props.testCase.errorCode;
	const key = code ? getErrorBaseKey(code) : '';
	if (key) return locale.baseText(key as BaseTextKey);
	return locale.baseText('evaluation.runDetail.error.unknownError');
});

const errorTitle = computed(() => locale.baseText('evaluation.runDetail.testCase.failed'));

const rows = computed(() => {
	if (status.value !== 'success') return [];
	return getUserDefinedMetricNames(props.testCase.metrics).map((name) => {
		const source = props.metricSources?.[name];
		return {
			name,
			value: normalizeMetricValue(props.testCase.metrics?.[name]),
			category: source?.category,
			sourceNodeName: source?.nodeName,
		};
	});
});
</script>

<template>
	<N8nCard
		:class="[$style.card, { [$style.opaque]: isOpaque }]"
		:style="{ '--card--padding': 'var(--spacing--md)' }"
		data-test-id="test-case-card"
		:data-status="status"
	>
		<template #header>
			<TestCaseHeader
				:index="index"
				:status="status"
				:tokens="tokens"
				:duration-ms="durationMs"
				:execution-id="testCase.executionId"
				@view="emit('view', testCase)"
				@cancel="emit('cancel', testCase)"
				@rerun="emit('rerun', testCase)"
			/>
		</template>

		<Transition name="tc-rows-fade-in" appear>
			<div v-if="showRows" :class="$style.rowList">
				<TestCaseMetricRow
					v-if="isErrored"
					key="__error__"
					:name="errorTitle"
					:value="undefined"
					errored
					:error-message="errorMessage"
				/>
				<TestCaseMetricRow
					v-for="row in rows"
					v-else
					:key="row.name"
					:name="row.name"
					:value="row.value"
					:category="row.category"
					:source-node-name="row.sourceNodeName"
				/>
			</div>
		</Transition>
	</N8nCard>
</template>

<style module lang="scss">
.card {
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--xs);
	transition: opacity var(--animation--duration--snappy) var(--animation--easing);
}

.opaque {
	opacity: 0.5;
}

.rowList {
	display: flex;
	flex-direction: column;
	gap: 0;
}

// Vue's `<Transition name="tc-rows-fade-in">` auto-applies these class
// names to the slot's root element. They must stay un-hashed (CSS Modules
// would rename them) — `:global` does that without needing a second
// `<style>` block. Keeps the local `-4px` translate (rows fade in from
// above): the DS `fade-in` mixin's `+8px` is tuned for full-component
// entrances and feels too eager at the per-row scale.
:global {
	.tc-rows-fade-in-enter-active,
	.tc-rows-fade-in-appear-active {
		animation: tc-rows-fade-in var(--animation--duration--snappy) var(--animation--easing);
	}

	.tc-rows-fade-in-leave-active {
		animation: tc-rows-fade-in var(--animation--duration--snappy) var(--easing--ease-in) reverse;
	}

	@media (prefers-reduced-motion: reduce) {
		.tc-rows-fade-in-enter-active,
		.tc-rows-fade-in-appear-active,
		.tc-rows-fade-in-leave-active {
			animation: none;
		}
	}

	@keyframes tc-rows-fade-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
}
</style>
