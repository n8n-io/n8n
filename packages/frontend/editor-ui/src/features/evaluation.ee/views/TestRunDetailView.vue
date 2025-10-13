<script setup lang="ts">
import type { TestCaseExecutionRecord } from '../evaluation.api';
import type { TestTableColumn } from '../components/shared/TestTableBase.vue';
import TestTableBase from '../components/shared/TestTableBase.vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import type { BaseTextKey } from '@n8n/i18n';
import { useEvaluationStore } from '../evaluation.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { convertToDisplayDate } from '@/utils/formatters/dateFormatter';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import orderBy from 'lodash/orderBy';
import { statusDictionary, getErrorBaseKey } from '../evaluation.constants';
import { ElScrollbar } from 'element-plus';
import {
	N8nCallout,
	N8nExternalLink,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nLoading,
	N8nTableHeaderControlsButton,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import {
	applyCachedSortOrder,
	applyCachedVisibility,
	getDefaultOrderedColumns,
	getTestCasesColumns,
	getTestTableHeaders,
} from '../evaluation.utils';
import {
	useWorkflowSettingsCache,
	type UserEvaluationPreferences,
} from '@/composables/useWorkflowsCache';

export type Column =
	| {
			key: string;
			label: string;
			visible: boolean;
			numeric?: boolean;
			disabled: false;
			columnType: 'inputs' | 'outputs' | 'metrics';
	  }
	// Disabled state ensures current sort order is not lost if user resorts teh columns
	// even if some columns are disabled / not available in the current run
	| { key: string; disabled: true };

export type Header = TestTableColumn<TestCaseExecutionRecord & { index: number }>;

const router = useRouter();
const toast = useToast();
const evaluationStore = useEvaluationStore();
const workflowsStore = useWorkflowsStore();
const locale = useI18n();
const workflowsCache = useWorkflowSettingsCache();

const isLoading = ref(true);
const testCases = ref<TestCaseExecutionRecord[]>([]);
const hasFailedTestCases = ref<boolean>(false);

const runId = computed(() => router.currentRoute.value.params.runId as string);
const workflowId = computed(() => router.currentRoute.value.params.name as string);
const workflowName = computed(() => workflowsStore.getWorkflowById(workflowId.value)?.name ?? '');

const cachedUserPreferences = ref<UserEvaluationPreferences | undefined>();
const expandedRows = ref<Set<string>>(new Set());

const run = computed(() => evaluationStore.testRunsById[runId.value]);
const runErrorDetails = computed(() => {
	return run.value?.errorDetails as Record<string, string | number>;
});

const filteredTestCases = computed(() =>
	orderBy(testCases.value, (record) => record.runAt, ['asc']).map((record, index) =>
		Object.assign(record, { index: index + 1 }),
	),
);

const isAllExpanded = computed(() => expandedRows.value.size === filteredTestCases.value.length);

const testRunIndex = computed(() =>
	Object.values(
		orderBy(evaluationStore.testRunsById, (record) => new Date(record.runAt), ['asc']).filter(
			({ workflowId: wId }) => wId === workflowId.value,
		) ?? {},
	).findIndex(({ id }) => id === runId.value),
);

const formattedTime = computed(() => convertToDisplayDate(new Date(run.value?.runAt).getTime()));

const openRelatedExecution = (row: TestCaseExecutionRecord) => {
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

const inputColumns = computed(() => getTestCasesColumns(filteredTestCases.value, 'inputs'));

const orderedColumns = computed((): Column[] => {
	const defaultOrder = getDefaultOrderedColumns(run.value, filteredTestCases.value);
	const appliedCachedOrder = applyCachedSortOrder(defaultOrder, cachedUserPreferences.value?.order);

	return applyCachedVisibility(appliedCachedOrder, cachedUserPreferences.value?.visibility);
});

const columns = computed((): Header[] => [
	{
		prop: 'index',
		width: 100,
		label: locale.baseText('evaluation.runDetail.testCase'),
		sortable: true,
	} satisfies Header,
	{
		prop: 'status',
		label: locale.baseText('evaluation.listRuns.status'),
		minWidth: 125,
	} satisfies Header,
	...getTestTableHeaders(orderedColumns.value, filteredTestCases.value),
]);

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
		hasFailedTestCases.value = testCaseEvaluationExecutions?.some(
			(testCase) => testCase.status === 'error',
		);
		await evaluationStore.fetchTestRuns(run.value.workflowId);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.toast.error.fetchTestCases'));
	} finally {
		isLoading.value = false;
	}
};

async function loadCachedUserPreferences() {
	cachedUserPreferences.value = await workflowsCache.getEvaluationPreferences(workflowId.value);
}

async function saveCachedUserPreferences() {
	if (cachedUserPreferences.value) {
		await workflowsCache.saveEvaluationPreferences(workflowId.value, cachedUserPreferences.value);
	}
}

async function handleColumnVisibilityUpdate(columnKey: string, visibility: boolean) {
	cachedUserPreferences.value ??= { order: [], visibility: {} };
	cachedUserPreferences.value.visibility[columnKey] = visibility;
	await saveCachedUserPreferences();
}

async function handleColumnOrderUpdate(newOrder: string[]) {
	cachedUserPreferences.value ??= { order: [], visibility: {} };
	cachedUserPreferences.value.order = newOrder;
	await saveCachedUserPreferences();
}

function toggleRowExpansion(row: { id: string }) {
	if (expandedRows.value.has(row.id)) {
		expandedRows.value.delete(row.id);
	} else {
		expandedRows.value.add(row.id);
	}
}

function toggleAllExpansion() {
	if (isAllExpanded.value) {
		// Collapse all
		expandedRows.value.clear();
	} else {
		// Expand all
		expandedRows.value = new Set(filteredTestCases.value.map((row) => row.id));
	}
}

onMounted(async () => {
	await fetchExecutionTestCases();
	await loadCachedUserPreferences();
});
</script>

<template>
	<div :class="$style.container" data-test-id="test-definition-run-detail">
		<div :class="$style.header">
			<button :class="$style.backButton" @click="router.back()">
				<N8nIcon icon="arrow-left" />
				<N8nHeading size="large" :bold="true">{{
					locale.baseText('evaluation.listRuns.runListHeader', {
						interpolate: {
							name: workflowName,
						},
					})
				}}</N8nHeading>
			</button>
			<span :class="$style.headerSeparator">/</span>
			<N8nHeading size="large" :bold="true">
				{{
					locale.baseText('evaluation.listRuns.testCasesListHeader', {
						interpolate: {
							index: testRunIndex + 1,
						},
					})
				}}
			</N8nHeading>
		</div>
		<N8nCallout v-if="run?.status === 'error'" theme="danger" icon="triangle-alert" class="mb-s">
			<N8nText size="small" :class="$style.capitalized">
				{{
					locale.baseText(
						`${getErrorBaseKey(run?.errorCode)}` as BaseTextKey,
						runErrorDetails ? { interpolate: runErrorDetails } : {},
					) ?? locale.baseText(`${getErrorBaseKey('UNKNOWN_ERROR')}` as BaseTextKey)
				}}
			</N8nText>
		</N8nCallout>

		<ElScrollbar always :class="$style.scrollableSummary" class="mb-m">
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
						v-if="run?.status === 'completed' && hasFailedTestCases"
						size="medium"
						color="warning"
					>
						{{ locale.baseText(`evaluation.runDetail.error.partialCasesFailed`) }}
					</N8nText>
					<N8nText
						v-else
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
		</ElScrollbar>

		<div :class="['mb-s', $style.runsHeader]">
			<div>
				<N8nHeading size="large" :bold="true"
					>{{
						locale.baseText('evaluation.listRuns.allTestCases', {
							interpolate: {
								count: filteredTestCases.length,
							},
						})
					}}
				</N8nHeading>
			</div>
			<div :class="$style.runsHeaderButtons">
				<N8nIconButton
					:icon="isAllExpanded ? 'chevrons-down-up' : 'chevrons-up-down'"
					type="secondary"
					size="medium"
					@click="toggleAllExpansion"
				/>
				<N8nTableHeaderControlsButton
					size="medium"
					icon-size="small"
					:columns="orderedColumns"
					@update:column-visibility="handleColumnVisibilityUpdate"
					@update:column-order="handleColumnOrderUpdate"
				/>
			</div>
		</div>

		<N8nCallout
			v-if="
				!isLoading &&
				!inputColumns.length &&
				run?.status === 'completed' &&
				run?.finalResult === 'success'
			"
			theme="secondary"
			icon="info"
			class="mb-s"
		>
			<N8nText size="small" :class="$style.capitalized">
				{{ locale.baseText('evaluation.runDetail.notice.useSetInputs') }}
			</N8nText>
		</N8nCallout>

		<div v-if="isLoading" :class="$style.loading">
			<N8nLoading :loading="true" :rows="5" />
		</div>

		<TestTableBase
			v-else
			:data="filteredTestCases"
			:columns="columns"
			:default-sort="{ prop: 'id', order: 'descending' }"
			:expanded-rows="expandedRows"
			@row-click="toggleRowExpansion"
		>
			<template #id="{ row }">
				<div style="display: flex; justify-content: space-between; gap: 10px">
					{{ row.id }}
				</div>
			</template>
			<template #index="{ row }">
				<div>
					<N8nExternalLink
						v-if="row.executionId"
						class="open-execution-link"
						@click.stop.prevent="openRelatedExecution(row)"
					>
						#{{ row.index }}
					</N8nExternalLink>
					<span v-else :class="$style.deletedExecutionRowIndex">#{{ row.index }}</span>
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
							<N8nText color="danger" :class="$style.capitalized">
								{{
									locale.baseText(`${getErrorBaseKey(row.errorCode)}` as BaseTextKey) || row.status
								}}
							</N8nText>
						</N8nTooltip>
					</template>
					<template v-else>
						<N8nText :class="$style.capitalized">
							{{ row.status }}
						</N8nText>
					</template>
				</div>
			</template>
		</TestTableBase>
	</div>
</template>

<style lang="scss" scoped>
/**
	When hovering over link in row, ensure hover background is removed from row
 */
:global(tr:hover:has(.open-execution-link:hover)) {
	--color-table-row-hover-background: transparent;
}
</style>

<style module lang="scss">
.container {
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
	padding: var(--spacing--lg) 0;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--lg);

	.timestamp {
		color: var(--color--text);
		font-size: var(--font-size--sm);
	}
}

.backButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;
	color: var(--color--text);
	transition: color 0.1s ease-in-out;

	&:hover {
		color: var(--color--primary);
	}
}

.headerSeparator {
	font-size: var(--font-size--xl);
	color: var(--color--text--tint-1);
}

.summary {
	margin-bottom: var(--spacing--md);

	.summaryStats {
		display: flex;
		gap: var(--spacing--lg);
	}
}
.stat {
	display: flex;
	flex-direction: column;
}

.controls {
	display: flex;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.downloadButton {
	margin-bottom: var(--spacing--sm);
}

.runsHeader {
	display: flex;

	> div:first-child {
		flex: 1;
	}
}

.runsHeaderButtons {
	display: flex;
	gap: var(--spacing--xs);
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}

.scrollableSummary {
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: 5px;
	background-color: var(--color--background--light-3);

	:global(.el-scrollbar__bar) {
		opacity: 1;
	}
	:global(.el-scrollbar__thumb) {
		background-color: var(--color--foreground);
		&:hover {
			background-color: var(--color--foreground--shade-1);
		}
	}
}

.summaryCard {
	height: 100px;
	box-sizing: border-box;
	padding: var(--spacing--sm);
	border-right: var(--border-width) var(--border-style) var(--color--foreground);
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

.capitalized {
	text-transform: none;
}
.capitalized::first-letter {
	text-transform: uppercase;
}

.summaryCardTitle {
	display: inline;
	width: fit-content;
	max-width: 100%;
	flex-shrink: 0;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
	color: var(--color--text);
}

.summaryCardContentLargeNumber {
	font-size: 32px;
	line-height: 1;
}

.alertText {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	max-width: 100%;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: normal;
	word-break: break-word;
	color: var(--color--text--danger);
	font-size: var(--font-size--2xs);
	line-height: 1.25;
}

.deletedExecutionRowIndex {
	color: var(--color--text);
	font-weight: var(--font-weight--regular);
}
</style>
