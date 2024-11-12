<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useEvaluationsStore } from '@/stores/evaluations.store.ee';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import EmptyState from '@/components/WorkflowEvaluation/ListEvaluation/EmptyState.vue';
import TestsList from '@/components/WorkflowEvaluation/ListEvaluation/TestsList.vue';
import type { TestExecution, TestListItem } from '@/components/WorkflowEvaluation/types';
import { useAnnotationTagsStore } from '@/stores/tags.store';

const router = useRouter();
const tagsStore = useAnnotationTagsStore();
const evaluationsStore = useEvaluationsStore();
const isLoading = ref(false);
const toast = useToast();
const locale = useI18n();

const tests = computed<TestListItem[]>(() => {
	return evaluationsStore.allTestDefinitions.map((test) => ({
		id: test.id,
		name: test.name,
		tagName: test.annotationTagId ? getTagName(test.annotationTagId) : '',
		testCases: 0, // TODO: This should come from the API
		execution: getTestExecution(test.id),
	}));
});
const hasTests = computed(() => tests.value.length > 0);
const allTags = computed(() => tagsStore.allTags);

function getTagName(tagId: string) {
	const matchingTag = allTags.value.find((t) => t.id === tagId);

	return matchingTag?.name ?? '';
}

// TODO: Replace with actual API call once implemented
function getTestExecution(_testId: number): TestExecution {
	const mockExecutions = {
		lastRun: 'an hour ago',
		errorRate: 0,
		metrics: { metric1: 0.12, metric2: 0.99, metric3: 0.87 },
	};

	return (
		mockExecutions || {
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

function onRunTest(_testId: number) {
	// TODO: Implement test run logic
	toast.showMessage({
		title: locale.baseText('workflowEvaluation.notImplemented'),
		type: 'warning',
	});
}

function onViewDetails(_testId: number) {
	// TODO: Implement test details view
	toast.showMessage({
		title: locale.baseText('workflowEvaluation.notImplemented'),
		type: 'warning',
	});
}

function onEditTest(testId: number) {
	void router.push({ name: VIEWS.WORKFLOW_EVALUATION_EDIT, params: { testId } });
}

async function onDeleteTest(testId: number) {
	await evaluationsStore.deleteById(testId);

	toast.showMessage({
		title: locale.baseText('workflowEvaluation.list.testDeleted'),
		type: 'success',
	});
}

// Load initial data
async function loadInitialData() {
	isLoading.value = true;
	try {
		await tagsStore.fetchAll();
		await evaluationsStore.fetchAll();
	} finally {
		isLoading.value = false;
	}
}

onMounted(() => {
	if (!evaluationsStore.isFeatureEnabled) {
		toast.showMessage({
			title: locale.baseText('workflowEvaluation.notImplemented'),
			type: 'warning',
		});

		void router.push({
			name: VIEWS.WORKFLOW,
			params: { name: router.currentRoute.value.params.name },
		});
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
