<script setup lang="ts">
import type { TestCaseExecutionRecord } from '@/api/evaluation.ee';
import type { TestTableColumn } from '@/components/Evaluations/shared/TestTableBase.vue';
import TestTableBase from '@/components/Evaluations/shared/TestTableBase.vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import type { BaseTextKey } from '@/plugins/i18n';
import { useEvaluationStore } from '@/stores/evaluation.store.ee';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { orderBy } from 'lodash-es';
import { statusDictionary } from '@/components/Evaluations/shared/statusDictionary';
// TODO: replace with n8n-api type
import { getErrorBaseKey } from '@/components/Evaluations/shared/errorCodes';

const router = useRouter();
const toast = useToast();
const evaluationStore = useEvaluationStore();
const workflowsStore = useWorkflowsStore();
const locale = useI18n();

const isLoading = ref(true);
const testCases = ref<TestCaseExecutionRecord[]>([]);

const runId = computed(() => router.currentRoute.value.params.runId as string);
const workflowId = computed(() => router.currentRoute.value.params.name as string);
const workflowName = computed(() => workflowsStore.getWorkflowById(workflowId.value)?.name ?? '');

const run = computed(() => evaluationStore.testRunsById[runId.value]);

const runErrorDetails = computed(() => {
	return run.value?.errorDetails as Record<string, string | number>;
});

const filteredTestCases = computed(() =>
	orderBy(testCases.value, (record) => record.runAt, ['asc']).map((record, index) =>
		Object.assign(record, { index: index + 1 }),
	),
);

const testRunIndex = computed(() =>
	Object.values(
		orderBy(evaluationStore.testRunsById, (record) => new Date(record.runAt), ['asc']).filter(
			({ workflowId: wId }) => wId === workflowId.value,
		) ?? {},
	).findIndex(({ id }) => id === runId.value),
);

const formattedTime = computed(() => convertToDisplayDate(new Date(run.value?.runAt).getTime()));

const handleRowClick = (row: TestCaseExecutionRecord) => {
	const executionId = row.executionId;
	if (executionId) {
		const { href } = router.resolve({
			name: VIEWS.EXECUTION_PREVIEW,
			params: {
				name: workflowId.value,
				executionId,
			},
		});
		window.open(href, '_blank');
	}
};

const columns = computed(
	(): Array<TestTableColumn<TestCaseExecutionRecord & { index: number }>> => [
		{
			prop: 'index',
			width: 250,
			label: locale.baseText('evaluation.runDetail.testCase'),
			sortable: true,
			formatter: (row: TestCaseExecutionRecord & { index: number }) => `#${row.index}`,
		},
		{
			prop: 'status',
			label: locale.baseText('evaluation.listRuns.status'),
		},
		...Object.keys(run.value?.metrics ?? {}).map((metric) => ({
			prop: `metrics.${metric}`,
			label: metric,
			sortable: true,
			filter: true,
			showHeaderTooltip: true,
			formatter: (row: TestCaseExecutionRecord) => row.metrics?.[metric]?.toFixed(2) ?? '-',
		})),
	],
);

const metrics = computed(() => run.value?.metrics ?? {});

// Temporary workaround to fetch test cases by manually getting workflow executions
const fetchExecutionTestCases = async () => {
	if (!runId.value || !workflowId.value) return;

	isLoading.value = true;
	try {
		const testRun = await evaluationStore.getTestRun({
			workflowId: workflowId.value,
			runId: runId.value,
		});
		const testCaseEvaluationExecutions = await evaluationStore.fetchTestCaseExecutions({
			workflowId: workflowId.value,
			runId: testRun.id,
		});

		testCases.value = testCaseEvaluationExecutions ?? [];
		await evaluationStore.fetchTestRuns(run.value.workflowId);
	} catch (error) {
		toast.showError(error, 'Failed to load run details');
	} finally {
		isLoading.value = false;
	}
};

onMounted(async () => {
	await fetchExecutionTestCases();
});
</script>

<template>
	<div :class="$style.container" data-test-id="test-definition-run-detail">
		<div :class="$style.header">
			<button :class="$style.backButton" @click="router.back()">
				<font-awesome-icon icon="arrow-left" />
				<n8n-heading size="large" :bold="true">{{
					locale.baseText('evaluation.listRuns.runListHeader', {
						interpolate: {
							name: workflowName,
						},
					})
				}}</n8n-heading>
			</button>
			<span :class="$style.headerSeparator">/</span>
			<n8n-heading size="large" :bold="true">
				{{
					locale.baseText('evaluation.listRuns.testCasesListHeader', {
						interpolate: {
							index: testRunIndex + 1,
						},
					})
				}}
			</n8n-heading>
		</div>
		<n8n-callout
			v-if="run?.status === 'error'"
			theme="danger"
			icon="exclamation-triangle"
			class="mb-s"
		>
			<N8nText size="small">
				{{
					locale.baseText(
						`${getErrorBaseKey(run?.errorCode)}` as BaseTextKey,
						runErrorDetails ? { interpolate: runErrorDetails } : {},
					) ?? locale.baseText(`${getErrorBaseKey('UNKNOWN_ERROR')}` as BaseTextKey)
				}}
			</N8nText>
		</n8n-callout>

		<el-scrollbar always :class="$style.scrollableSummary" class="mb-m">
			<div style="display: flex">
				<div :class="$style.summaryCard">
					<N8nText size="small" :class="$style.summaryCardTitle">
						{{ locale.baseText('evaluation.runDetail.totalCases') }}
					</N8nText>
					<N8nText size="xlarge" :class="$style.summaryCardContentLargeNumber" bold>{{
						testCases.length
					}}</N8nText>
				</div>

				<div :class="$style.summaryCard">
					<N8nText size="small" :class="$style.summaryCardTitle">
						{{ locale.baseText('evaluation.runDetail.ranAt') }}
					</N8nText>
					<div>
						<N8nText size="medium"> {{ formattedTime.date }} {{ formattedTime.time }} </N8nText>
					</div>
				</div>

				<div :class="$style.summaryCard">
					<N8nText size="small" :class="$style.summaryCardTitle">
						{{ locale.baseText('evaluation.listRuns.status') }}
					</N8nText>
					<N8nText
						:color="statusDictionary[run?.status]?.color"
						size="medium"
						:class="run?.status.toLowerCase()"
						style="text-transform: capitalize"
					>
						{{ run?.status }}
					</N8nText>
				</div>

				<div v-for="(value, key) in metrics" :key="key" :class="$style.summaryCard">
					<N8nTooltip :content="key" placement="top">
						<N8nText
							size="small"
							:class="$style.summaryCardTitle"
							style="text-overflow: ellipsis; overflow: hidden"
						>
							{{ key }}
						</N8nText>
					</N8nTooltip>

					<N8nText size="xlarge" :class="$style.summaryCardContentLargeNumber" bold>{{
						value.toFixed(2)
					}}</N8nText>
				</div>
			</div>
		</el-scrollbar>
		<div v-if="isLoading" :class="$style.loading">
			<n8n-loading :loading="true" :rows="5" />
		</div>

		<TestTableBase
			v-else
			:data="filteredTestCases"
			@row-click="handleRowClick"
			:columns="columns"
			:default-sort="{ prop: 'id', order: 'descending' }"
		>
			<template #id="{ row }">
				<div style="display: flex; justify-content: space-between; gap: 10px">
					{{ row.id }}
				</div>
			</template>
			<template #status="{ row }">
				<div style="display: inline-flex; gap: 12px; align-items: center; max-width: 100%">
					<N8nIcon
						:icon="statusDictionary[row.status].icon"
						:color="statusDictionary[row.status].color"
					/>
					<template v-if="row.status === 'error'">
						<N8nTooltip placement="top" :show-after="300">
							<template #content>
								{{
									locale.baseText(`${getErrorBaseKey(row.errorCode)}` as BaseTextKey) || row.status
								}}
							</template>
							<p :class="$style.alertText">
								{{
									locale.baseText(`${getErrorBaseKey(row.errorCode)}` as BaseTextKey) || row.status
								}}
							</p>
						</N8nTooltip>
					</template>
					<template v-else>
						<N8nText style="text-transform: capitalize">
							{{ row.status }}
						</N8nText>
					</template>
				</div>
			</template>
		</TestTableBase>
	</div>
</template>

<style module lang="scss">
.container {
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
	margin: auto;
	padding: var(--spacing-l) var(--spacing-2xl) 0;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	margin-bottom: var(--spacing-l);

	.timestamp {
		color: var(--color-text-base);
		font-size: var(--font-size-s);
	}
}

.backButton {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color-text-base);
	transition: color 0.1s ease-in-out;

	&:hover {
		color: var(--color-primary);
	}
}

.headerSeparator {
	font-size: var(--font-size-xl);
	color: var(--color-text-light);
}

.summary {
	margin-bottom: var(--spacing-m);

	.summaryStats {
		display: flex;
		gap: var(--spacing-l);
	}
}
.stat {
	display: flex;
	flex-direction: column;
}

.controls {
	display: flex;
	gap: var(--spacing-s);
	margin-bottom: var(--spacing-s);
}

.downloadButton {
	margin-bottom: var(--spacing-s);
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}

.scrollableSummary {
	border: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	border-radius: 5px;
	background-color: var(--color-background-xlight);

	:global(.el-scrollbar__bar) {
		opacity: 1;
	}
	:global(.el-scrollbar__thumb) {
		background-color: var(--color-foreground-base);
		&:hover {
			background-color: var(--color-foreground-dark);
		}
	}
}

.summaryCard {
	height: 100px;
	box-sizing: border-box;
	padding: var(--spacing-s);
	border-right: var(--border-width-base) var(--border-style-base) var(--color-foreground-base);
	flex-basis: 169px;
	flex-shrink: 0;
	max-width: 170px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;

	&:first-child {
		border-top-left-radius: inherit;
		border-bottom-left-radius: inherit;
	}
}

.summaryCardTitle {
	display: inline;
	width: fit-content;
	max-width: 100%;
	flex-shrink: 0;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
	color: var(--color-text-base);
}

.summaryCardContentLargeNumber {
	font-size: 32px;
	line-height: 1;
}

.alertText {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	max-width: 100%;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: normal;
	word-break: break-word;
	color: var(--color-text-danger);
	font-size: var(--font-size-2xs);
	line-height: 1.25;
}
</style>
