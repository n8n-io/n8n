<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useEvaluationsStore } from '@/stores/evaluations.store.ee';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';

interface TestMetrics {
	metric1: number | null;
	metric2: number | null;
	metric3: number | null;
}

interface TestExecution {
	lastRun: string | null;
	errorRate: number | null;
	metrics: TestMetrics;
}

const router = useRouter();
const evaluationsStore = useEvaluationsStore();
const isLoading = ref(false);
const toast = useToast();
const locale = useI18n();

// Computed properties for test data
const tests = computed(() => {
	return evaluationsStore.allTestDefinitions.map((test) => ({
		id: test.id,
		name: test.name,
		tagName: test.annotationTagId ? getTagName(test.annotationTagId) : '',
		testCases: 0, // This should come from the API
		execution: getTestExecution(test.id),
	}));
});

const hasTests = computed(() => tests.value.length > 0);

// Mock function to get tag name - replace with actual tag lookup
function getTagName(tagId: string) {
	const tags = {
		tag1: 'marketing',
		tag2: 'SupportOps',
	};
	return tags[tagId] || '';
}

// Mock function to get test execution data - replace with actual API call
function getTestExecution(testId: number): TestExecution {
	// Mock data - replace with actual data from your API
	const mockExecutions = {
		12: {
			lastRun: 'an hour ago',
			errorRate: 0,
			metrics: { metric1: 0.12, metric2: 0.99, metric3: 0.87 },
		},
	};

	return (
		mockExecutions[testId] || {
			lastRun: null,
			errorRate: null,
			metrics: { metric1: null, metric2: null, metric3: null },
		}
	);
}

// Action handlers
function onCreateTest() {
	void router.push({ name: VIEWS.NEW_WORKFLOW_EVALUATION });
}

function onRunTest(testId: number) {
	console.log('Running test:', testId);
	// Implement test run logic
}

function onViewDetails(testId: number) {
	console.log('Viewing details for test:', testId);
	// Implement navigation to test details
}

function onEditTest(testId: number) {
	console.log('Editing test:', testId);
	// Implement edit navigation
}

async function onDeleteTest(testId: number) {
	console.log('Deleting test:', testId);
	// Implement delete logic
	await evaluationsStore.deleteById(testId);

	toast.showMessage({
		title: locale.baseText('generic.deleted'),
		type: 'success',
	});
}

// Load initial data
async function loadTests() {
	isLoading.value = true;
	try {
		await evaluationsStore.fetchAll();
	} finally {
		isLoading.value = false;
	}
}

// Load tests on mount
void loadTests();
</script>

<template>
	<div :class="$style.container">
		<div v-if="isLoading" :class="$style.loading">
			<n8n-loading :loading="true" :rows="3" />
		</div>

		<template v-else>
			<!-- Empty State -->
			<template v-if="!hasTests">
				<div :class="$style.header">
					<h1>Tests</h1>
					<n8n-button type="primary" label="Create new test" @click="onCreateTest" />
				</div>
				<n8n-action-box
					v-if="!hasTests"
					heading="Get confidence your workflow is working as expected"
					description="Tests run your workflow and compare the results to expected ones. Create your first test from a past execution. More info"
					button-text="Choose Execution(s)"
					@click:button="onCreateTest"
				/>
			</template>

			<!-- Tests List -->
			<div v-else :class="$style.testsList">
				<div :class="$style.testsHeader">
					<n8n-button size="small" type="tertiary" label="Create new test" @click="onCreateTest" />
				</div>

				<!-- Test Items -->
				<div v-for="test in tests" :key="test.id" :class="$style.testItem">
					<div :class="$style.testInfo">
						<div :class="$style.testName">
							{{ test.name }}
							<n8n-tag v-if="test.tagName" :text="test.tagName" />
						</div>
						<div :class="$style.testCases">
							{{ test.testCases }} test case(s)
							<n8n-loading v-if="!test.execution.lastRun" :loading="true" :rows="1" />
							<span v-else>Ran {{ test.execution.lastRun }}</span>
						</div>
					</div>

					<div :class="$style.metrics">
						<div :class="$style.metric">Error rate: {{ test.execution.errorRate ?? '-' }}</div>
						<div :class="$style.metric">Metric 1: {{ test.execution.metrics.metric1 ?? '-' }}</div>
						<div :class="$style.metric">Metric 2: {{ test.execution.metrics.metric2 ?? '-' }}</div>
						<div :class="$style.metric">Metric 3: {{ test.execution.metrics.metric3 ?? '-' }}</div>
					</div>

					<div :class="$style.actions">
						<n8n-icon-button icon="play" type="tertiary" size="small" @click="onRunTest(test.id)" />
						<n8n-icon-button
							icon="list"
							type="tertiary"
							size="small"
							@click="onViewDetails(test.id)"
						/>
						<n8n-icon-button icon="pen" type="tertiary" size="small" @click="onEditTest(test.id)" />
						<n8n-icon-button
							icon="trash"
							type="tertiary"
							size="small"
							@click="onDeleteTest(test.id)"
						/>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.container {
	padding: var(--spacing-xl) var(--spacing-l);
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: var(--spacing-xl);

	h1 {
		margin: 0;
	}
}

.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}

.testsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.testsHeader {
	margin-bottom: var(--spacing-m);
}

.testItem {
	display: flex;
	align-items: center;
	padding: var(--spacing-s) var(--spacing-m);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-light);

	&:hover {
		background-color: var(--color-background-base);
	}
}

.testInfo {
	flex: 1;
	min-width: 0;
}

.testName {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	font-weight: var(--font-weight-bold);
	margin-bottom: var(--spacing-4xs);
}

.testCases {
	color: var(--color-text-base);
	font-size: var(--font-size-2xs);
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.metrics {
	display: flex;
	gap: var(--spacing-l);
	margin: 0 var(--spacing-l);
}

.metric {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	white-space: nowrap;
}

.actions {
	display: flex;
	gap: var(--spacing-4xs);
}
</style>
