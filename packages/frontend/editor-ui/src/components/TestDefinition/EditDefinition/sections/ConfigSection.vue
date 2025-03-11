<script setup lang="ts">
import type { TestMetricRecord } from '@/api/testDefinition.ee';
import BlockArrow from '@/components/TestDefinition/EditDefinition/BlockArrow.vue';
import EvaluationStep from '@/components/TestDefinition/EditDefinition/EvaluationStep.vue';
import MetricsInput from '@/components/TestDefinition/EditDefinition/MetricsInput.vue';
import WorkflowSelector from '@/components/TestDefinition/EditDefinition/WorkflowSelector.vue';
import type { EditableFormState, EvaluationFormState } from '@/components/TestDefinition/types';
import { useI18n } from '@/composables/useI18n';
import { useMessage } from '@/composables/useMessage';
import { NODE_PINNING_MODAL_KEY } from '@/constants';
import type { ITag, ModalState } from '@/Interface';
import { N8nButton, N8nTag, N8nText } from '@n8n/design-system';
import type { IPinData } from 'n8n-workflow';
import { computed, ref } from 'vue';

const props = defineProps<{
	tagsById: Record<string, ITag>;
	isLoading: boolean;
	examplePinnedData?: IPinData;
	sampleWorkflowName?: string;
	hasRuns: boolean;
	getFieldIssues: (key: string) => Array<{ field: string; message: string }>;
	startEditing: (field: keyof EditableFormState) => void;
	saveChanges: (field: keyof EditableFormState) => void;
	cancelEditing: (field: keyof EditableFormState) => void;
}>();
const emit = defineEmits<{
	openPinningModal: [];
	deleteMetric: [metric: TestMetricRecord];
	openExecutionsViewForTag: [];
	renameTag: [tag: string];
	evaluationWorkflowCreated: [workflowId: string];
}>();

const locale = useI18n();
const tags = defineModel<EvaluationFormState['tags']>('tags', { required: true });

const renameTag = async () => {
	const { prompt } = useMessage();

	const result = await prompt(locale.baseText('testDefinition.edit.step.tag.placeholder'), {
		inputValue: props.tagsById[tags.value.value[0]]?.name,
		inputPlaceholder: locale.baseText('testDefinition.edit.step.tag.placeholder'),
		inputValidator: (value) => {
			if (!value) {
				return locale.baseText('testDefinition.edit.step.tag.validation.required');
			}

			if (value.length > 21) {
				return locale.baseText('testDefinition.edit.step.tag.validation.tooLong');
			}

			return true;
		},
	});

	if (result?.action === 'confirm') {
		emit('renameTag', result.value);
	}
};

const evaluationWorkflow = defineModel<EvaluationFormState['evaluationWorkflow']>(
	'evaluationWorkflow',
	{ required: true },
);
const metrics = defineModel<EvaluationFormState['metrics']>('metrics', { required: true });
const mockedNodes = defineModel<EvaluationFormState['mockedNodes']>('mockedNodes', {
	required: true,
});

const nodePinningModal = ref<ModalState | null>(null);

const selectedTag = computed(() => props.tagsById[tags.value.value[0]] ?? {});

function openExecutionsView() {
	emit('openExecutionsViewForTag');
}
</script>

<template>
	<div>
		<div :class="$style.editForm">
			<template v-if="!hasRuns">
				<N8nText tag="div" color="text-dark" size="large" class="text-center">
					{{ locale.baseText('testDefinition.edit.step.intro') }}
				</N8nText>
				<BlockArrow class="mt-5xs mb-5xs" />
			</template>

			<!-- Select Executions -->
			<EvaluationStep
				:issues="getFieldIssues('tags')"
				:tooltip="locale.baseText('testDefinition.edit.step.executions.tooltip')"
				:external-tooltip="!hasRuns"
			>
				<template #title>
					{{
						locale.baseText('testDefinition.edit.step.executions', {
							adjustToNumber: selectedTag?.usageCount ?? 0,
						})
					}}
				</template>
				<template #cardContent>
					<div :class="$style.tagInputTag">
						<i18n-t keypath="testDefinition.edit.step.tag">
							<template #tag>
								<N8nTag :text="selectedTag.name" :clickable="true" @click="renameTag">
									<template #tag>
										{{ selectedTag.name }} <font-awesome-icon icon="pen" size="sm" />
									</template>
								</N8nTag>
							</template>
						</i18n-t>
					</div>
					<N8nButton
						label="Select executions"
						type="tertiary"
						size="small"
						@click="openExecutionsView"
					/>
				</template>
			</EvaluationStep>
			<div :class="$style.nestedSteps">
				<BlockArrow class="mt-5xs mb-5xs" />
				<div style="display: flex; flex-direction: column">
					<BlockArrow class="mt-5xs mb-5xs ml-auto mr-2xl" />
					<!-- Mocked Nodes -->
					<EvaluationStep
						:issues="getFieldIssues('mockedNodes')"
						:tooltip="locale.baseText('testDefinition.edit.step.nodes.tooltip')"
						:external-tooltip="!hasRuns"
					>
						<template #title>
							{{
								locale.baseText('testDefinition.edit.step.mockedNodes', {
									adjustToNumber: mockedNodes?.length ?? 0,
								})
							}}
							<N8nText>({{ locale.baseText('generic.optional') }})</N8nText>
						</template>
						<template #cardContent>
							<N8nButton
								size="small"
								data-test-id="select-nodes-button"
								:label="locale.baseText('testDefinition.edit.selectNodes')"
								type="tertiary"
								@click="$emit('openPinningModal')"
							/>
						</template>
					</EvaluationStep>

					<BlockArrow class="mt-5xs mb-5xs ml-auto mr-2xl" />
					<!-- Re-run Executions -->
					<EvaluationStep
						:title="locale.baseText('testDefinition.edit.step.reRunExecutions')"
						:tooltip="locale.baseText('testDefinition.edit.step.reRunExecutions.tooltip')"
						:external-tooltip="!hasRuns"
					/>
					<BlockArrow class="mt-5xs mb-5xs ml-auto mr-2xl" />
				</div>
			</div>

			<!-- Compare Executions -->
			<EvaluationStep
				:title="locale.baseText('testDefinition.edit.step.compareExecutions')"
				:description="locale.baseText('testDefinition.edit.workflowSelectorLabel')"
				:issues="getFieldIssues('evaluationWorkflow')"
				:tooltip="locale.baseText('testDefinition.edit.step.compareExecutions.tooltip')"
				:external-tooltip="!hasRuns"
			>
				<template #cardContent>
					<WorkflowSelector
						v-model="evaluationWorkflow"
						:example-pinned-data="examplePinnedData"
						:class="{ 'has-issues': getFieldIssues('evaluationWorkflow').length > 0 }"
						:sample-workflow-name="sampleWorkflowName"
						@workflow-created="$emit('evaluationWorkflowCreated', $event)"
					/>
				</template>
			</EvaluationStep>

			<BlockArrow class="mt-5xs mb-5xs" />
			<!-- Metrics -->
			<EvaluationStep
				:title="locale.baseText('testDefinition.edit.step.metrics')"
				:issues="getFieldIssues('metrics')"
				:description="locale.baseText('testDefinition.edit.step.metrics.description')"
				:tooltip="locale.baseText('testDefinition.edit.step.metrics.tooltip')"
				:external-tooltip="!hasRuns"
			>
				<template #cardContent>
					<MetricsInput
						v-model="metrics"
						:class="{ 'has-issues': getFieldIssues('metrics').length > 0 }"
						class="mt-xs"
						@delete-metric="(metric) => emit('deleteMetric', metric)"
					/>
				</template>
			</EvaluationStep>
		</div>
		<Modal ref="nodePinningModal" width="80vw" height="85vh" :name="NODE_PINNING_MODAL_KEY">
			<template #header>
				<N8nHeading size="large" :bold="true">
					{{ locale.baseText('testDefinition.edit.selectNodes') }}
				</N8nHeading>
				<br />
				<N8nText>
					{{ locale.baseText('testDefinition.edit.modal.description') }}
				</N8nText>
			</template>
			<template #content>
				<NodesPinning v-model="mockedNodes" data-test-id="nodes-pinning-modal" />
			</template>
		</Modal>
	</div>
</template>

<style module lang="scss">
.nestedSteps {
	display: grid;
	grid-template-columns: 20% 1fr;
}

.tagInputTag {
	display: flex;
	gap: var(--spacing-3xs);
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	margin-bottom: var(--spacing-xs);
}
</style>
