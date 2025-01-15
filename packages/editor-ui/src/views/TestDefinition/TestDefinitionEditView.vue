<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NODE_PINNING_MODAL_KEY, VIEWS } from '@/constants';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@/composables/useI18n';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { useDebounce } from '@/composables/useDebounce';
import { useTestDefinitionForm } from '@/components/TestDefinition/composables/useTestDefinitionForm';

import EvaluationHeader from '@/components/TestDefinition/EditDefinition/EvaluationHeader.vue';
import DescriptionInput from '@/components/TestDefinition/EditDefinition/DescriptionInput.vue';
import EvaluationStep from '@/components/TestDefinition/EditDefinition/EvaluationStep.vue';
import TagsInput from '@/components/TestDefinition/EditDefinition/TagsInput.vue';
import WorkflowSelector from '@/components/TestDefinition/EditDefinition/WorkflowSelector.vue';
import MetricsInput from '@/components/TestDefinition/EditDefinition/MetricsInput.vue';
import type { TestMetricRecord, TestRunRecord } from '@/api/testDefinition.ee';
import Modal from '@/components/Modal.vue';
import type { ModalState } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import TestRunsTable from '@/components/TestDefinition/ListRuns/TestRunsTable.vue';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';

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
		<div :class="$style.headerSection">
			<div :class="$style.headerMeta">
				<div :class="$style.name">
					<EvaluationHeader
						v-model="state.name"
						:class="{ 'has-issues': hasIssues('name') }"
						:start-editing="startEditing"
						:save-changes="saveChanges"
						:handle-keydown="handleKeydown"
					/>
					<div :class="$style.lastSaved">
						<template v-if="isSaving">
							{{ locale.baseText('testDefinition.edit.saving') }}
						</template>
						<template v-else> {{ locale.baseText('testDefinition.edit.saved') }} </template>
					</div>
				</div>
				<DescriptionInput
					v-model="state.description"
					:start-editing="startEditing"
					:save-changes="saveChanges"
					:handle-keydown="handleKeydown"
					:class="$style.descriptionInput"
				/>
			</div>
			<div :class="$style.controls">
				<n8n-button
					v-if="runs.length > 0"
					size="small"
					:icon="showConfig ? 'eye-slash' : 'eye'"
					data-test-id="toggle-config-button"
					:label="
						showConfig
							? locale.baseText('testDefinition.edit.hideConfig')
							: locale.baseText('testDefinition.edit.showConfig')
					"
					type="tertiary"
					@click="toggleConfig"
				/>
				<n8n-button
					v-if="state.evaluationWorkflow.value && state.tags.value.length > 0"
					:class="$style.runTestButton"
					size="small"
					data-test-id="run-test-button"
					:label="locale.baseText('testDefinition.runTest')"
					type="primary"
					@click="runTest"
				/>
				<n8n-button
					v-else
					:class="$style.runTestButton"
					size="small"
					data-test-id="run-test-button"
					:label="locale.baseText('testDefinition.edit.saveTest')"
					type="primary"
					@click="onSaveTest"
				/>
			</div>
		</div>

		<div :class="$style.content">
			<div v-if="runs.length > 0" :class="$style.runs">
				<!-- Metrics Chart -->
				<MetricsChart v-model:selectedMetric="selectedMetric" :runs="runs" :theme="appliedTheme" />
				<!-- Past Runs Table -->
				<TestRunsTable
					:class="$style.runsTable"
					:runs="runs"
					:selectable="true"
					data-test-id="past-runs-table"
					@delete-runs="onDeleteRuns"
				/>
			</div>

			<div :class="[$style.panelBlock, { [$style.hidden]: !showConfig }]">
				<div :class="$style.panelIntro">
					{{ locale.baseText('testDefinition.edit.step.intro') }}
				</div>
				<BlockArrow :class="$style.introArrow" />
				<!-- Select Executions -->
				<EvaluationStep
					:class="$style.step"
					:title="
						locale.baseText('testDefinition.edit.step.executions', {
							adjustToNumber: tagUsageCount,
						})
					"
					:description="locale.baseText('testDefinition.edit.step.executions.description')"
				>
					<template #icon><font-awesome-icon icon="history" size="lg" /></template>
					<template #cardContent>
						<TagsInput
							v-model="state.tags"
							:class="{ 'has-issues': hasIssues('tags') }"
							:all-tags="allTags"
							:tags-by-id="tagsById"
							:is-loading="isLoading"
							:start-editing="startEditing"
							:save-changes="saveChanges"
							:cancel-editing="cancelEditing"
							:create-tag="handleCreateTag"
						/>
					</template>
				</EvaluationStep>
				<div :class="$style.evaluationArrows">
					<BlockArrow />
					<BlockArrow />
				</div>

				<!-- Mocked Nodes -->
				<EvaluationStep
					:class="$style.step"
					:title="
						locale.baseText('testDefinition.edit.step.mockedNodes', {
							adjustToNumber: state.mockedNodes?.length ?? 0,
						})
					"
					:small="true"
					:expanded="true"
					:description="locale.baseText('testDefinition.edit.step.nodes.description')"
				>
					<template #icon><font-awesome-icon icon="thumbtack" size="lg" /></template>
					<template #cardContent>
						<n8n-button
							size="small"
							data-test-id="select-nodes-button"
							:label="locale.baseText('testDefinition.edit.selectNodes')"
							type="tertiary"
							@click="openPinningModal"
						/>
					</template>
				</EvaluationStep>

				<!-- Re-run Executions -->
				<EvaluationStep
					:class="$style.step"
					:title="locale.baseText('testDefinition.edit.step.reRunExecutions')"
					:small="true"
					:description="locale.baseText('testDefinition.edit.step.reRunExecutions.description')"
				>
					<template #icon><font-awesome-icon icon="redo" size="lg" /></template>
				</EvaluationStep>

				<!-- Compare Executions -->
				<EvaluationStep
					:class="$style.step"
					:title="locale.baseText('testDefinition.edit.step.compareExecutions')"
					:description="locale.baseText('testDefinition.edit.step.compareExecutions.description')"
				>
					<template #icon><font-awesome-icon icon="equals" size="lg" /></template>
					<template #cardContent>
						<WorkflowSelector
							v-model="state.evaluationWorkflow"
							:class="{ 'has-issues': hasIssues('evaluationWorkflow') }"
						/>
					</template>
				</EvaluationStep>

				<!-- Metrics -->
				<EvaluationStep
					:class="$style.step"
					:title="locale.baseText('testDefinition.edit.step.metrics')"
					:description="locale.baseText('testDefinition.edit.step.metrics.description')"
				>
					<template #icon><font-awesome-icon icon="chart-bar" size="lg" /></template>
					<template #cardContent>
						<MetricsInput
							v-model="state.metrics"
							:class="{ 'has-issues': hasIssues('metrics') }"
							@delete-metric="onDeleteMetric"
						/>
					</template>
				</EvaluationStep>
			</div>
		</div>

		<Modal ref="nodePinningModal" width="80vw" height="85vh" :name="NODE_PINNING_MODAL_KEY">
			<template #header>
				<N8nHeading size="large" :bold="true" :class="$style.runsTableHeading">{{
					locale.baseText('testDefinition.edit.selectNodes')
				}}</N8nHeading>
			</template>
			<template #content>
				<NodesPinning
					v-model="state.mockedNodes"
					:width="modalContentWidth"
					data-test-id="nodes-pinning-modal"
				/>
			</template>
		</Modal>
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
