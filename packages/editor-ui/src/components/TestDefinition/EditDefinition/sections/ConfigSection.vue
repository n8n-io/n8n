<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import EvaluationStep from '@/components/TestDefinition/EditDefinition/EvaluationStep.vue';
import TagsInput from '@/components/TestDefinition/EditDefinition/TagsInput.vue';
import WorkflowSelector from '@/components/TestDefinition/EditDefinition/WorkflowSelector.vue';
import MetricsInput from '@/components/TestDefinition/EditDefinition/MetricsInput.vue';
import type { TestMetricRecord } from '@/api/testDefinition.ee';
import type { EditableFormState, EvaluationFormState } from '@/components/TestDefinition/types';
import type { ITag, ModalState } from '@/Interface';
import { NODE_PINNING_MODAL_KEY } from '@/constants';
import { ref } from 'vue';

defineProps<{
	showConfig: boolean;
	tagUsageCount: number;
	allTags: ITag[];
	tagsById: Record<string, ITag>;
	isLoading: boolean;
	getFieldIssues: (key: string) => Array<{ field: string; message: string }>;
	startEditing: (field: keyof EditableFormState) => void;
	saveChanges: (field: keyof EditableFormState) => void;
	cancelEditing: (field: keyof EditableFormState) => void;
	createTag?: (name: string) => Promise<ITag>;
}>();

const changedFieldsKeys = ref<string[]>([]);
const tags = defineModel<EvaluationFormState['tags']>('tags', { required: true });
const evaluationWorkflow = defineModel<EvaluationFormState['evaluationWorkflow']>(
	'evaluationWorkflow',
	{ required: true },
);
const metrics = defineModel<EvaluationFormState['metrics']>('metrics', { required: true });
const mockedNodes = defineModel<EvaluationFormState['mockedNodes']>('mockedNodes', {
	required: true,
});

const nodePinningModal = ref<ModalState | null>(null);
const emit = defineEmits<{
	openPinningModal: [];
	deleteMetric: [metric: Partial<TestMetricRecord>];
}>();

const locale = useI18n();

function updateChangedFieldsKeys(key: string) {
	changedFieldsKeys.value.push(key);
}

function showFieldIssues(fieldKey: string) {
	return changedFieldsKeys.value.includes(fieldKey);
}
</script>

<template>
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
			:issues="getFieldIssues('tags')"
			:show-issues="showFieldIssues('tags')"
		>
			<template #icon><font-awesome-icon icon="history" size="lg" /></template>
			<template #cardContent>
				<TagsInput
					v-model="tags"
					:class="{ 'has-issues': getFieldIssues('tags') }"
					:all-tags="allTags"
					:tags-by-id="tagsById"
					:is-loading="isLoading"
					:start-editing="startEditing"
					:save-changes="saveChanges"
					:cancel-editing="cancelEditing"
					:create-tag="createTag"
					@update:model-value="updateChangedFieldsKeys('tags')"
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
					adjustToNumber: mockedNodes?.length ?? 0,
				})
			"
			:small="true"
			:expanded="true"
			:description="locale.baseText('testDefinition.edit.step.nodes.description')"
			:issues="getFieldIssues('mockedNodes')"
			:show-issues="showFieldIssues('mockedNodes')"
		>
			<template #icon><font-awesome-icon icon="thumbtack" size="lg" /></template>
			<template #cardContent>
				<n8n-button
					size="small"
					data-test-id="select-nodes-button"
					:label="locale.baseText('testDefinition.edit.selectNodes')"
					type="tertiary"
					@click="$emit('openPinningModal')"
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
			:issues="getFieldIssues('evaluationWorkflow')"
			:show-issues="showFieldIssues('evaluationWorkflow')"
		>
			<template #icon><font-awesome-icon icon="equals" size="lg" /></template>
			<template #cardContent>
				<WorkflowSelector
					v-model="evaluationWorkflow"
					:class="{ 'has-issues': getFieldIssues('evaluationWorkflow').length > 0 }"
					@update:model-value="updateChangedFieldsKeys('evaluationWorkflow')"
				/>
			</template>
		</EvaluationStep>

		<!-- Metrics -->
		<EvaluationStep
			:class="$style.step"
			:title="locale.baseText('testDefinition.edit.step.metrics')"
			:description="locale.baseText('testDefinition.edit.step.metrics.description')"
			:issues="getFieldIssues('metrics')"
			:show-issues="showFieldIssues('metrics')"
		>
			<template #icon><font-awesome-icon icon="chart-bar" size="lg" /></template>
			<template #cardContent>
				<MetricsInput
					v-model="metrics"
					:class="{ 'has-issues': getFieldIssues('metrics').length > 0 }"
					@delete-metric="(metric) => emit('deleteMetric', metric)"
					@update:model-value="updateChangedFieldsKeys('metrics')"
				/>
			</template>
		</EvaluationStep>

		<Modal ref="nodePinningModal" width="80vw" height="85vh" :name="NODE_PINNING_MODAL_KEY">
			<template #header>
				<N8nHeading size="large" :bold="true" :class="$style.runsTableHeading">{{
					locale.baseText('testDefinition.edit.selectNodes')
				}}</N8nHeading>
			</template>
			<template #content>
				<NodesPinning v-model="mockedNodes" data-test-id="nodes-pinning-modal" />
			</template>
		</Modal>
	</div>
</template>

<style module lang="scss">
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
	--arrow-height: 23rem;
	display: flex;
	justify-content: space-between;
	width: 100%;
	max-width: 80%;
	margin: 0 auto;
	margin-bottom: -100%;
	z-index: 0;
}
</style>
