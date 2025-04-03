<script setup lang="ts">
import { useTestDefinitionForm } from '@/components/TestDefinition/composables/useTestDefinitionForm';
import { useDebounce } from '@/composables/useDebounce';
import { useI18n } from '@/composables/useI18n';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { NODE_PINNING_MODAL_KEY, VIEWS } from '@/constants';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { TestRunRecord } from '@/api/testDefinition.ee';
import InlineNameEdit from '@/components/InlineNameEdit.vue';
import ConfigSection from '@/components/TestDefinition/EditDefinition/sections/ConfigSection.vue';
import RunsSection from '@/components/TestDefinition/EditDefinition/sections/RunsSection.vue';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useDocumentVisibility } from '@vueuse/core';
import { N8nButton, N8nIconButton, N8nText } from '@n8n/design-system';
import type { IDataObject, IPinData } from 'n8n-workflow';

const props = defineProps<{
	testId: string;
	name: string;
}>();

const router = useRouter();
const locale = useI18n();
const { debounce } = useDebounce();
const toast = useToast();
const testDefinitionStore = useTestDefinitionStore();
const tagsStore = useAnnotationTagsStore();
const uiStore = useUIStore();
const workflowStore = useWorkflowsStore();
const telemetry = useTelemetry();

const visibility = useDocumentVisibility();
watch(visibility, async () => {
	if (visibility.value !== 'visible') return;

	await tagsStore.fetchAll({ force: true, withUsageCount: true });
	await getExamplePinnedDataForTags();
	testDefinitionStore.updateRunFieldIssues(props.testId);
});

const { state, isSaving, cancelEditing, loadTestData, updateTest, startEditing, saveChanges } =
	useTestDefinitionForm();

const isLoading = computed(() => tagsStore.isLoading);
const tagsById = computed(() => tagsStore.tagsById);
const currentWorkflowId = computed(() => props.name);
const appliedTheme = computed(() => uiStore.appliedTheme);
const workflowName = computed(() => workflowStore.workflow.name);
const hasRuns = computed(() => runs.value.length > 0);
const fieldsIssues = computed(() => testDefinitionStore.getFieldIssues(props.testId) ?? []);

const showConfig = ref(true);
const selectedMetric = ref<string>('');
const examplePinnedData = ref<IPinData>({});

void loadTestData(props.testId, props.name);

const handleUpdateTest = async () => {
	try {
		await updateTest(props.testId);
	} catch (e: unknown) {
		toast.showError(e, locale.baseText('testDefinition.edit.testSaveFailed'));
	}
};

const handleUpdateTestDebounced = debounce(handleUpdateTest, { debounceTime: 400, trailing: true });

function getFieldIssues(key: string) {
	return fieldsIssues.value.filter((issue) => issue.field === key);
}

async function openPinningModal() {
	uiStore.openModal(NODE_PINNING_MODAL_KEY);
}

async function runTest() {
	await testDefinitionStore.startTestRun(props.testId);
	await testDefinitionStore.fetchTestRuns(props.testId);
}

async function openExecutionsViewForTag() {
	const executionsRoute = router.resolve({
		name: VIEWS.WORKFLOW_EXECUTIONS,
		params: { name: currentWorkflowId.value },
		query: { tag: state.value.tags.value[0], testId: props.testId },
	});

	window.open(executionsRoute.href, '_blank');
}

const runs = computed(() =>
	Object.values(testDefinitionStore.testRunsById ?? {}).filter(
		(run) => run.testDefinitionId === props.testId,
	),
);

const isRunning = computed(() => runs.value.some((run) => run.status === 'running'));
const isRunTestEnabled = computed(() => fieldsIssues.value.length === 0 && !isRunning.value);

async function onDeleteRuns(toDelete: TestRunRecord[]) {
	await Promise.all(
		toDelete.map(async (run) => {
			await testDefinitionStore.deleteTestRun({ testDefinitionId: props.testId, runId: run.id });
		}),
	);
}

async function renameTag(newName: string) {
	await tagsStore.rename({ id: state.value.tags.value[0], name: newName });
}

async function getExamplePinnedDataForTags() {
	const exampleInput = await testDefinitionStore.fetchExampleEvaluationInput(
		props.testId,
		state.value.tags.value[0],
	);

	if (exampleInput !== null) {
		examplePinnedData.value = {
			'When called by a test run': [
				{
					json: exampleInput as IDataObject,
				},
			],
		};
	}
}

watch(() => state.value.tags, getExamplePinnedDataForTags);

const updateName = (value: string) => {
	state.value.name.value = value;
	void handleUpdateTestDebounced();
};

const updateDescription = (value: string) => {
	state.value.description.value = value;
	void handleUpdateTestDebounced();
};

function onEvaluationWorkflowCreated(workflowId: string) {
	telemetry.track('User created evaluation workflow from test', {
		test_id: props.testId,
		subworkflow_id: workflowId,
	});
}
</script>

<template>
	<div v-if="!isLoading" :class="[$style.container]">
		<div :class="$style.header">
			<div style="display: flex; align-items: center">
				<N8nIconButton
					icon="arrow-left"
					type="tertiary"
					text
					@click="router.push({ name: VIEWS.TEST_DEFINITION, params: { testId } })"
				></N8nIconButton>
				<InlineNameEdit
					:model-value="state.name.value"
					max-height="none"
					type="Test name"
					@update:model-value="updateName"
				>
					<N8nText bold size="xlarge" color="text-dark">{{ state.name.value }}</N8nText>
				</InlineNameEdit>
			</div>
			<div style="display: flex; align-items: center; gap: 10px">
				<N8nText v-if="hasRuns" color="text-light" size="small">
					{{
						isSaving
							? locale.baseText('testDefinition.edit.saving')
							: locale.baseText('testDefinition.edit.saved')
					}}
				</N8nText>
				<N8nTooltip :disabled="isRunTestEnabled" :placement="'left'">
					<N8nButton
						:disabled="!isRunTestEnabled"
						:class="$style.runTestButton"
						size="small"
						data-test-id="run-test-button"
						:label="locale.baseText('testDefinition.runTest')"
						type="primary"
						@click="runTest"
					/>
					<template #content>
						<template v-if="fieldsIssues.length > 0">
							<div>{{ locale.baseText('testDefinition.completeConfig') }}</div>
							<div v-for="issue in fieldsIssues" :key="issue.field">- {{ issue.message }}</div>
						</template>
						<template v-if="isRunning">
							{{ locale.baseText('testDefinition.testIsRunning') }}
						</template>
					</template>
				</N8nTooltip>
			</div>
		</div>
		<div :class="$style.wrapper">
			<div :class="$style.description">
				<InlineNameEdit
					:model-value="state.description.value"
					placeholder="Add a description..."
					:required="false"
					:autosize="{ minRows: 1, maxRows: 3 }"
					input-type="textarea"
					:maxlength="260"
					max-height="none"
					type="Test description"
					@update:model-value="updateDescription"
				>
					<N8nText size="medium" color="text-base">{{ state.description.value }}</N8nText>
				</InlineNameEdit>
			</div>

			<div :class="{ [$style.content]: true, [$style.contentWithRuns]: hasRuns }">
				<RunsSection
					v-if="hasRuns"
					v-model:selectedMetric="selectedMetric"
					:class="$style.runs"
					:runs="runs"
					:test-id="testId"
					:applied-theme="appliedTheme"
					@delete-runs="onDeleteRuns"
				/>

				<ConfigSection
					v-if="showConfig"
					v-model:tags="state.tags"
					v-model:evaluationWorkflow="state.evaluationWorkflow"
					v-model:mockedNodes="state.mockedNodes"
					:class="$style.config"
					:cancel-editing="cancelEditing"
					:tags-by-id="tagsById"
					:is-loading="isLoading"
					:get-field-issues="getFieldIssues"
					:start-editing="startEditing"
					:save-changes="saveChanges"
					:has-runs="hasRuns"
					:example-pinned-data="examplePinnedData"
					:sample-workflow-name="workflowName"
					@rename-tag="renameTag"
					@update:evaluation-workflow="handleUpdateTestDebounced"
					@update:mocked-nodes="handleUpdateTestDebounced"
					@open-pinning-modal="openPinningModal"
					@open-executions-view-for-tag="openExecutionsViewForTag"
					@evaluation-workflow-created="onEvaluationWorkflowCreated($event)"
				/>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.content {
	display: flex;
	justify-content: center;
	gap: var(--spacing-m);
	padding-bottom: var(--spacing-m);
}

.config {
	width: 480px;

	.contentWithRuns & {
		width: 400px;
	}
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing-m) var(--spacing-l);
	padding-left: 27px;
	padding-bottom: 8px;
	position: sticky;
	top: 0;
	left: 0;
	background-color: var(--color-background-light);
	z-index: 2;
}

.wrapper {
	padding: 0 var(--spacing-l);
	padding-left: 58px;
}

.description {
	max-width: 600px;
	margin-bottom: 20px;
}

.arrowBack {
	--button-hover-background-color: transparent;
	border: 0;
}
</style>
