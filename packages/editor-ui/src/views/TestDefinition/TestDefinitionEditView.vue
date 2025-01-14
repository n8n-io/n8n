<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NODE_PINNING_MODAL_KEY, VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { useDebounce } from '@/composables/useDebounce';
import { useTestDefinitionForm } from '@/components/TestDefinition/composables/useTestDefinitionForm';

import HeaderSection from '@/components/TestDefinition/EditDefinition/sections/HeaderSection.vue';
import RunsSection from '@/components/TestDefinition/EditDefinition/sections/RunsSection.vue';
import type { TestMetricRecord, TestRunRecord } from '@/api/testDefinition.ee';
import type { ModalState } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import ConfigSection from '@/components/TestDefinition/EditDefinition/sections/ConfigSection.vue';
import type { EditableFormState } from '@/components/TestDefinition/types';
const props = defineProps<{
	testId?: string;
}>();

const router = useRouter();
const route = useRoute();
const locale = useI18n();
const { debounce } = useDebounce();
const toast = useToast();
const testDefinitionStore = useTestDefinitionStore();
const tagsStore = useAnnotationTagsStore();
const uiStore = useUIStore();

const {
	state,
	fieldsIssues,
	isSaving,
	cancelEditing,
	loadTestData,
	createTest,
	updateTest,
	startEditing,
	saveChanges,
	handleKeydown,
	deleteMetric,
	updateMetrics,
} = useTestDefinitionForm();

const isLoading = computed(() => tagsStore.isLoading);
const allTags = computed(() => tagsStore.allTags);
const tagsById = computed(() => tagsStore.tagsById);
const testId = computed(() => props.testId ?? (route.params.testId as string));
const currentWorkflowId = computed(() => route.params.name as string);
const appliedTheme = computed(() => uiStore.appliedTheme);
const tagUsageCount = computed(
	() => tagsStore.tagsById[state.value.tags.value[0]]?.usageCount ?? 0,
);
const hasRuns = computed(() => runs.value.length > 0);
const nodePinningModal = ref<ModalState | null>(null);
const modalContentWidth = ref(0);
const showConfig = ref(true);
const selectedMetric = ref<string>('');

onMounted(async () => {
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
	void tagsStore.fetchAll({ withUsageCount: true });
	if (testId.value) {
		await loadTestData(testId.value);
	} else {
		await onSaveTest();
	}
});

async function onSaveTest() {
	try {
		let savedTest;
		if (testId.value) {
			savedTest = await updateTest(testId.value);
		} else {
			savedTest = await createTest(currentWorkflowId.value);
		}
		if (savedTest && route.name === VIEWS.NEW_TEST_DEFINITION) {
			await router.replace({
				name: VIEWS.TEST_DEFINITION_EDIT,
				params: { testId: savedTest.id },
			});
		}
	} catch (e: unknown) {
		toast.showError(e, locale.baseText('testDefinition.edit.testSaveFailed'));
	}
}

function hasIssues(key: string) {
	return fieldsIssues.value.some((issue) => issue.field === key);
}

async function onDeleteMetric(deletedMetric: Partial<TestMetricRecord>) {
	if (deletedMetric.id) {
		await deleteMetric(deletedMetric.id, testId.value);
	}
}

async function handleCreateTag(tagName: string) {
	try {
		const newTag = await tagsStore.create(tagName);
		return newTag;
	} catch (error) {
		toast.showError(error, 'Error', error.message);
		throw error;
	}
}

async function openPinningModal() {
	uiStore.openModal(NODE_PINNING_MODAL_KEY);
}

async function runTest() {
	await testDefinitionStore.startTestRun(testId.value);
	await testDefinitionStore.fetchTestRuns(testId.value);
}

const runs = computed(() =>
	Object.values(testDefinitionStore.testRunsById ?? {}).filter(
		(run) => run.testDefinitionId === testId.value,
	),
);

async function onDeleteRuns(toDelete: TestRunRecord[]) {
	await Promise.all(
		toDelete.map(async (run) => {
			await testDefinitionStore.deleteTestRun({ testDefinitionId: testId.value, runId: run.id });
		}),
	);
}

function toggleConfig() {
	showConfig.value = !showConfig.value;
}

async function refetchNodes() {
	console.log('refetchNodes');

	await workflowsStore.fetchWorkflow(currentWorkflowId.value);
}

// Debounced watchers for auto-saving
watch(
	() => state.value.metrics,
	debounce(async () => await updateMetrics(testId.value), { debounceTime: 400 }),
	{ deep: true },
);

watch(
	() => [
		state.value.description,
		state.value.name,
		state.value.tags,
		state.value.evaluationWorkflow,
		state.value.mockedNodes,
	],
	debounce(onSaveTest, { debounceTime: 400 }),
	{ deep: true },
);
</script>

<template>
	<div :class="[$style.container, { [$style.noRuns]: !hasRuns }]">
		<HeaderSection
			v-model:name="state.name"
			v-model:description="state.description"
			v-model:evaluationWorkflow="state.evaluationWorkflow"
			v-model:tags="state.tags"
			:has-runs="hasRuns"
			:is-saving="isSaving"
			:has-issues="hasIssues"
			:start-editing="(field) => startEditing(field)"
			:save-changes="(field) => saveChanges(field)"
			:handle-keydown="(event, field) => handleKeydown(event, field)"
			:on-save-test="onSaveTest"
			:run-test="runTest"
			:show-config="showConfig"
			:toggle-config="toggleConfig"
		/>

		<div :class="$style.content">
			<RunsSection
				v-if="runs.length > 0"
				v-model:selectedMetric="selectedMetric"
				:runs="runs"
				:test-id="testId"
				:applied-theme="appliedTheme"
				@delete-runs="onDeleteRuns"
			/>

			<ConfigSection
				v-model:tags="state.tags"
				v-model:evaluationWorkflow="state.evaluationWorkflow"
				v-model:metrics="state.metrics"
				v-model:mockedNodes="state.mockedNodes"
				:cancel-editing="(field: keyof EditableFormState) => cancelEditing(field)"
				:show-config="showConfig"
				:tag-usage-count="tagUsageCount"
				:all-tags="allTags"
				:tags-by-id="tagsById"
				:is-loading="isLoading"
				:has-issues="hasIssues"
				:start-editing="(field) => startEditing(field)"
				:save-changes="(field) => saveChanges(field)"
				:create-tag="handleCreateTag"
				@open-pinning-modal="openPinningModal"
				@delete-metric="onDeleteMetric"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	--evaluation-edit-panel-width: 24rem;
	--metrics-chart-height: 10rem;
	height: 100%;
	display: flex;
	flex-direction: column;

	@media (min-height: 56rem) {
		--metrics-chart-height: 16rem;
	}

	@include mixins.breakpoint('lg-and-up') {
		--evaluation-edit-panel-width: 30rem;
	}
}

.content {
	display: flex;
	overflow-y: hidden;
	position: relative;

	.noRuns & {
		justify-content: center;
		overflow-y: auto;
	}
}

.headerSection {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	background-color: var(--color-background-light);
	width: 100%;
}

.headerMeta {
	max-width: 50%;
}

.name {
	display: flex;
	align-items: center;

	.lastSaved {
		font-size: var(--font-size-s);
		color: var(--color-text-light);
	}
}

.descriptionInput {
	margin-top: var(--spacing-2xs);
}

.runs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
	flex: 1;
	padding-top: var(--spacing-3xs);
	overflow: auto;

	@media (min-height: 56rem) {
		margin-top: var(--spacing-2xl);
	}
}

.panelBlock {
	width: var(--evaluation-edit-panel-width);
	display: grid;
	height: 100%;
	overflow-y: auto;
	flex-shrink: 0;
	padding-bottom: var(--spacing-l);
	margin-left: var(--spacing-2xl);
	transition: width 0.2s ease;

	&.hidden {
		margin-left: 0;
		width: 0;
		overflow: hidden;
		flex-shrink: 1;
	}

	.noRuns & {
		overflow-y: initial;
	}
}

.panelIntro {
	font-size: var(--font-size-m);
	color: var(--color-text-dark);

	justify-self: center;
	position: relative;
	display: block;
}

.step {
	position: relative;

	&:not(:first-child) {
		margin-top: var(--spacing-m);
	}
}

.introArrow {
	--arrow-height: 1.5rem;
	margin-bottom: -1rem;
	justify-self: center;
}

.evaluationArrows {
	--arrow-height: 22rem;
	display: flex;
	justify-content: space-between;
	width: 100%;
	max-width: 80%;
	margin: 0 auto;
	margin-bottom: -100%;
	z-index: 0;
}

.controls {
	display: flex;
	gap: var(--spacing-s);
}
</style>
