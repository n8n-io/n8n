<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useEvaluationsStore } from '@/stores/evaluations.store.ee';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import EmptyState from '@/components/WorkflowEvaluation/ListEvaluation/EmptyState.vue';
import TestsList from '@/components/WorkflowEvaluation/ListEvaluation/TestsList.vue';
import type { TestExecution, TestListItem } from '@/components/WorkflowEvaluation/types';

const router = useRouter();
const evaluationsStore = useEvaluationsStore();
const isLoading = ref(false);
const toast = useToast();
const locale = useI18n();

const tests = computed<TestListItem[]>(() => {
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
	console.log('🚀 ~ getTestExecution ~ testId:', testId);
	// Mock data - replace with actual data from your API
	const mockExecutions = {
		12: {
			lastRun: 'an hour ago',
			errorRate: 0,
			metrics: { metric1: 0.12, metric2: 0.99, metric3: 0.87 },
		},
	};

	return (
		mockExecutions[12] || {
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
	void router.push({ name: VIEWS.WORKFLOW_EVALUATION_EDIT, params: { testId } });
	// Implement navigation to test details
}

function onEditTest(testId: number) {
	console.log('Editing test:', testId);
	void router.push({ name: VIEWS.WORKFLOW_EVALUATION_EDIT, params: { testId } });
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
			<EmptyState v-if="!hasTests" @create-test="onCreateTest" />
			<TestsList
				v-else
				:tests="tests"
				@create-test="onCreateTest"
				@run-test="onRunTest"
				@view-details="onViewDetails"
				@edit-test="onEditTest"
				@delete-test="onDeleteTest"
			/>
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
.loading {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}
</style>
