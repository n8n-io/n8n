<script setup lang="ts">
import type { BaseTextKey } from '@n8n/i18n';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nSpinner,
	N8nText,
	useMessage,
} from '@n8n/design-system';
import type { BadgeTheme } from '@n8n/design-system';
import { computed, onMounted, reactive, ref } from 'vue';
import { CodeDiff } from 'v-code-diff';

import { MODAL_CONFIRM } from '@/app/constants';
import type {
	WorkflowTestNodeResult,
	WorkflowTestRunResult,
	WorkflowTestSummary,
} from '@/features/workflow-tests/workflowTests.api';
import { useWorkflowTestsStore } from '@/features/workflow-tests/workflowTests.store';

const props = defineProps<{ workflowId: string }>();

const locale = useI18n();
const toast = useToast();
const message = useMessage();
const testsStore = useWorkflowTestsStore();

const isLoading = ref(false);
const isRunningAll = ref(false);
/** Expand/collapse state per test id, following the TestCaseResultCard pattern. */
const expandedTestIds = reactive(new Set<string>());

const tests = computed<WorkflowTestSummary[]>(
	() => testsStore.testsByWorkflowId[props.workflowId] ?? [],
);

const TEST_STATUS_LABEL_KEY: Record<WorkflowTestRunResult['status'], BaseTextKey> = {
	passed: 'workflowTests.status.passed',
	failed: 'workflowTests.status.failed',
	error: 'workflowTests.status.error',
};

const TEST_STATUS_BADGE_THEME: Record<WorkflowTestRunResult['status'], BadgeTheme> = {
	passed: 'success',
	failed: 'danger',
	error: 'danger',
};

const NODE_STATUS_LABEL_KEY: Record<WorkflowTestNodeResult['status'], BaseTextKey> = {
	passed: 'workflowTests.status.passed',
	failed: 'workflowTests.status.failed',
	'not-executed': 'workflowTests.status.notExecuted',
};

function resultFor(testId: string): WorkflowTestRunResult | undefined {
	return testsStore.resultsByTestId[testId];
}

function isRunning(testId: string): boolean {
	return testsStore.runningTestIds.has(testId);
}

/** Non-passed node results are the only ones worth expanding a card to inspect. */
function failedNodeResults(testId: string): WorkflowTestNodeResult[] {
	return (resultFor(testId)?.nodeResults ?? []).filter((node) => node.status !== 'passed');
}

function canExpand(testId: string): boolean {
	const result = resultFor(testId);
	if (!result) return false;
	return result.status !== 'passed';
}

function isExpanded(testId: string): boolean {
	return expandedTestIds.has(testId);
}

function toggleExpanded(testId: string): void {
	if (expandedTestIds.has(testId)) {
		expandedTestIds.delete(testId);
	} else {
		expandedTestIds.add(testId);
	}
}

async function fetchTests(): Promise<void> {
	isLoading.value = true;
	try {
		await testsStore.fetchTests(props.workflowId);
	} catch (error) {
		toast.showError(error, locale.baseText('workflowTests.fetch.error'));
	} finally {
		isLoading.value = false;
	}
}

async function runTest(testId: string): Promise<void> {
	try {
		await testsStore.runTest(testId);
	} catch (error) {
		toast.showError(error, locale.baseText('workflowTests.run.error'));
	}
}

async function runAllTests(): Promise<void> {
	isRunningAll.value = true;
	try {
		// Sequential on purpose: tests replay executions against the live workflow, so
		// running them concurrently would let them race each other.
		for (const test of tests.value) {
			await runTest(test.id);
		}
	} finally {
		isRunningAll.value = false;
	}
}

async function deleteTest(test: WorkflowTestSummary): Promise<void> {
	const confirmed = await message.confirm(
		locale.baseText('workflowTests.row.delete.confirm.message'),
		locale.baseText('workflowTests.row.delete.confirm.title', { interpolate: { name: test.name } }),
		{
			type: 'warning',
			confirmButtonText: locale.baseText('workflowTests.row.delete'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;

	try {
		await testsStore.deleteTest(test.id, props.workflowId);
	} catch (error) {
		toast.showError(error, locale.baseText('workflowTests.delete.error'));
	}
}

onMounted(fetchTests);
</script>

<template>
	<div :class="$style.view">
		<header :class="$style.header">
			<div :class="$style.headerText">
				<N8nText tag="h2" size="large" bold>{{
					locale.baseText('workflowTests.list.title')
				}}</N8nText>
				<N8nText size="small" color="text-light">
					{{ locale.baseText('workflowTests.list.description') }}
				</N8nText>
			</div>
			<N8nButton
				v-if="tests.length > 0"
				variant="solid"
				size="small"
				:loading="isRunningAll"
				:disabled="isRunningAll"
				data-test-id="workflow-tests-run-all"
				@click="runAllTests"
			>
				{{ locale.baseText('workflowTests.list.runAll') }}
			</N8nButton>
		</header>

		<div v-if="!isLoading && tests.length === 0" :class="$style.empty">
			<N8nText tag="h3" size="medium" bold>
				{{ locale.baseText('workflowTests.list.empty.title') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ locale.baseText('workflowTests.list.empty.description') }}
			</N8nText>
		</div>

		<div v-else :class="$style.list">
			<div
				v-for="test in tests"
				:key="test.id"
				:class="$style.card"
				:data-test-id="`workflow-test-card-${test.id}`"
			>
				<div :class="$style.cardHeader">
					<div :class="$style.cardTitle">
						<N8nText size="medium" color="text-dark" bold>{{ test.name }}</N8nText>
						<N8nText size="small" color="text-light">
							{{
								locale.baseText('workflowTests.row.source', {
									interpolate: { id: test.sourceExecutionId },
								})
							}}
						</N8nText>
						<div :class="$style.counts">
							<N8nText size="small" color="text-light">
								{{
									locale.baseText('workflowTests.row.mockedNodes', {
										interpolate: { count: test.mockedNodeNames.length },
									})
								}}
							</N8nText>
							<N8nText size="small" color="text-light">
								{{
									locale.baseText('workflowTests.row.assertedNodes', {
										interpolate: { count: test.assertedNodeNames.length },
									})
								}}
							</N8nText>
						</div>
					</div>

					<div :class="$style.cardActions">
						<N8nSpinner v-if="isRunning(test.id)" size="small" />
						<N8nBadge
							v-else-if="resultFor(test.id)"
							:theme="TEST_STATUS_BADGE_THEME[resultFor(test.id)!.status]"
						>
							{{ locale.baseText(TEST_STATUS_LABEL_KEY[resultFor(test.id)!.status]) }}
						</N8nBadge>

						<N8nButton
							variant="subtle"
							size="small"
							:disabled="isRunning(test.id) || isRunningAll"
							:data-test-id="`workflow-test-run-${test.id}`"
							@click="runTest(test.id)"
						>
							{{ locale.baseText('workflowTests.row.run') }}
						</N8nButton>
						<N8nButton
							variant="subtle"
							size="small"
							:disabled="isRunning(test.id) || isRunningAll"
							:data-test-id="`workflow-test-delete-${test.id}`"
							@click="deleteTest(test)"
						>
							{{ locale.baseText('workflowTests.row.delete') }}
						</N8nButton>

						<button
							v-if="canExpand(test.id)"
							type="button"
							:class="$style.chevron"
							:aria-expanded="isExpanded(test.id)"
							:data-test-id="`workflow-test-toggle-${test.id}`"
							@click="toggleExpanded(test.id)"
						>
							<N8nIcon
								:icon="isExpanded(test.id) ? 'chevron-up' : 'chevron-down'"
								size="small"
								color="text-base"
							/>
						</button>
					</div>
				</div>

				<div v-if="isExpanded(test.id) && canExpand(test.id)" :class="$style.details">
					<N8nCallout
						v-if="resultFor(test.id)?.status === 'error'"
						theme="danger"
						data-test-id="workflow-test-error-callout"
					>
						{{ resultFor(test.id)?.errorMessage }}
					</N8nCallout>

					<div
						v-for="node in failedNodeResults(test.id)"
						:key="node.nodeName"
						:class="$style.nodeResult"
					>
						<div :class="$style.nodeResultHeader">
							<N8nText size="small" color="text-dark" bold>{{ node.nodeName }}</N8nText>
							<N8nText size="small" color="text-light">
								{{ locale.baseText(NODE_STATUS_LABEL_KEY[node.status]) }}
							</N8nText>
						</div>
						<div :class="$style.diffLabels">
							<N8nText size="small" color="text-light" bold>
								{{ locale.baseText('workflowTests.diff.expected') }}
							</N8nText>
							<N8nText size="small" color="text-light" bold>
								{{ locale.baseText('workflowTests.diff.actual') }}
							</N8nText>
						</div>
						<CodeDiff
							:old-string="node.expected ?? ''"
							:new-string="node.actual ?? ''"
							language="json"
							output-format="line-by-line"
							hide-header
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--lg);
	overflow-y: auto;
	height: 100%;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.empty {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	align-items: center;
	text-align: center;
	padding: var(--spacing--2xl) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	padding: var(--spacing--sm) var(--spacing--md);
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.cardTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.counts {
	display: flex;
	gap: var(--spacing--sm);
}

.cardActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-shrink: 0;
}

.chevron {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	padding: 0;
	background: none;
	border: none;
	border-radius: var(--radius--sm);
	cursor: pointer;

	&:hover {
		background-color: var(--background--subtle);
	}
}

.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	border-top: var(--border);
	padding-top: var(--spacing--sm);
}

.nodeResult {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.nodeResultHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.diffLabels {
	display: flex;
	justify-content: space-between;
	padding: 0 var(--spacing--2xs);
}
</style>
