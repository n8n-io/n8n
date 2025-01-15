<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import EmptyState from '@/components/TestDefinition/ListDefinition/EmptyState.vue';
import TestsList from '@/components/TestDefinition/ListDefinition/TestsList.vue';
import type { TestExecution, TestListItem } from '@/components/TestDefinition/types';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import type { TestDefinitionRecord } from '@/api/testDefinition.ee';

const router = useRouter();
const tagsStore = useAnnotationTagsStore();
const testDefinitionStore = useTestDefinitionStore();
const isLoading = ref(false);
const toast = useToast();
const locale = useI18n();

const tests = computed<TestListItem[]>(() => {
	return (
		testDefinitionStore.allTestDefinitionsByWorkflowId[
			router.currentRoute.value.params.name as string
		] ?? []
	)
		.filter((test): test is TestDefinitionRecord => test.id !== undefined)
		.sort((a, b) => new Date(b?.updatedAt ?? '').getTime() - new Date(a?.updatedAt ?? '').getTime())
		.map((test) => ({
			id: test.id,
			name: test.name ?? '',
			tagName: test.annotationTagId ? getTagName(test.annotationTagId) : '',
			testCases: testDefinitionStore.testRunsByTestId[test.id]?.length ?? 0,
			execution: getTestExecution(test.id),
		}));
});

const hasTests = computed(() => tests.value.length > 0);
const allTags = computed(() => tagsStore.allTags);

function getTagName(tagId: string) {
	const matchingTag = allTags.value.find((t) => t.id === tagId);

	return matchingTag?.name ?? '';
}

function getTestExecution(testId: string): TestExecution {
	const lastRun = testDefinitionStore.lastRunByTestId[testId];
	if (!lastRun) {
		return {
			id: null,
			lastRun: null,
			errorRate: 0,
			metrics: {},
			status: 'new',
		};
	}

	const mockExecutions = {
		id: lastRun.id,
		lastRun: lastRun.updatedAt ?? '',
		errorRate: 0,
		metrics: lastRun.metrics ?? {},
		status: lastRun.status ?? 'running',
	};

	return mockExecutions;
}

// Action handlers
function onCreateTest() {
	void router.push({ name: VIEWS.NEW_TEST_DEFINITION });
}

async function onRunTest(testId: string) {
	try {
		const result = await testDefinitionStore.startTestRun(testId);
		if (result.success) {
			toast.showMessage({
				title: locale.baseText('testDefinition.list.testStarted'),
				type: 'success',
			});

			// Optionally fetch the updated test runs
			await testDefinitionStore.fetchTestRuns(testId);
		} else {
			throw new Error('Test run failed to start');
		}
	} catch (error) {
		toast.showError(error, locale.baseText('testDefinition.list.testStartError'));
	}
}

async function onCancelTestRun(testId: string, testRunId: string | null) {
	try {
		// FIXME: testRunId might be null for a short period of time between user clicking start and the test run being created and fetched. Just ignore it for now.
		if (!testRunId) {
			throw new Error('Failed to cancel test run');
		}

		const result = await testDefinitionStore.cancelTestRun(testId, testRunId);
		if (result.success) {
			toast.showMessage({
				title: locale.baseText('testDefinition.list.testCancelled'),
				type: 'success',
			});

			// Optionally fetch the updated test runs
			await testDefinitionStore.fetchTestRuns(testId);
		} else {
			throw new Error('Failed to cancel test run');
		}
	} catch (error) {
		toast.showError(error, locale.baseText('testDefinition.list.testStartError'));
	}
}

async function onViewDetails(testId: string) {
	void router.push({ name: VIEWS.TEST_DEFINITION_RUNS, params: { testId } });
}

function onEditTest(testId: number) {
	void router.push({ name: VIEWS.TEST_DEFINITION_EDIT, params: { testId } });
}

async function onDeleteTest(testId: string) {
	await testDefinitionStore.deleteById(testId);

	toast.showMessage({
		title: locale.baseText('testDefinition.list.testDeleted'),
		type: 'success',
	});
}

// Load initial data
async function loadInitialData() {
	if (!isLoading.value) {
		// Add guard to prevent multiple loading states
		isLoading.value = true;
		try {
			await Promise.all([
				tagsStore.fetchAll(),
				testDefinitionStore.fetchAll({
					workflowId: router.currentRoute.value.params.name as string,
				}),
			]);
			isLoading.value = false;
		} catch (error) {
			toast.showError(error, locale.baseText('testDefinition.list.loadError'));
		} finally {
			isLoading.value = false;
		}
	}
}

onMounted(() => {
	if (!testDefinitionStore.isFeatureEnabled) {
		toast.showMessage({
			title: locale.baseText('testDefinition.notImplemented'),
			type: 'warning',
		});

		void router.push({
			name: VIEWS.WORKFLOW,
			params: { name: router.currentRoute.value.params.name },
		});
		return; // Add early return to prevent loading if feature is disabled
	}

	void loadInitialData();
});
</script>

<template>
	<div :class="$style.container">
		<div v-if="isLoading" :class="$style.loading">
			<n8n-loading :loading="true" :rows="3" />
		</div>

		<template v-else>
			<EmptyState
				v-if="!hasTests"
				data-test-id="test-definition-empty-state"
				@create-test="onCreateTest"
			/>
			<TestsList
				v-else
				:tests="tests"
				@create-test="onCreateTest"
				@run-test="onRunTest"
				@view-details="onViewDetails"
				@edit-test="onEditTest"
				@delete-test="onDeleteTest"
				@cancel-test-run="onCancelTestRun"
			/>
		</template>
	</div>
</template>
<style module lang="scss">
.container {
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
	margin: auto;
}
.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}
</style>
