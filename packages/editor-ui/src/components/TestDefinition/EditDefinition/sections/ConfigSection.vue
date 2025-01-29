<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import EvaluationStep from '@/components/TestDefinition/EditDefinition/EvaluationStep.vue';
import WorkflowSelector from '@/components/TestDefinition/EditDefinition/WorkflowSelector.vue';
import MetricsInput from '@/components/TestDefinition/EditDefinition/MetricsInput.vue';
import type { TestMetricRecord } from '@/api/testDefinition.ee';
import type { EditableFormState, EvaluationFormState } from '@/components/TestDefinition/types';
import type { ITag, ModalState } from '@/Interface';
import { NODE_PINNING_MODAL_KEY } from '@/constants';
import { ref, computed } from 'vue';
import { useMessage } from '@/composables/useMessage';
import type { IPinData } from 'n8n-workflow';
import BlockArrow from '@/components/TestDefinition/EditDefinition/BlockArrow.vue';

const props = defineProps<{
	showConfig: boolean;
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
	deleteMetric: [metric: Partial<TestMetricRecord>];
	openExecutionsViewForTag: [];
	renameTag: [tag: string];
}>();

const locale = useI18n();
const changedFieldsKeys = ref<string[]>([]);
const activeTooltip = ref<string | null>(null);
const tooltipPosition = ref<{
	x: number;
	y: number;
	width: number;
	height: number;
	right: number;
} | null>(null);
const tags = defineModel<EvaluationFormState['tags']>('tags', { required: true });

const renameTag = async () => {
	const { prompt } = useMessage();

	const result = await prompt('Enter new tag name', {
		inputValue: props.tagsById[tags.value.value[0]]?.name,
		inputPlaceholder: 'Enter new tag name',
		inputValidator: (value) => {
			if (!value) {
				return 'Tag name is required';
			}

			if (value.length > 21) {
				return 'Tag name is too long';
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

const selectedTag = computed(() => {
	return props.tagsById[tags.value.value[0]] ?? {};
});

function openExecutionsView() {
	emit('openExecutionsViewForTag');
}

function updateChangedFieldsKeys(key: string) {
	changedFieldsKeys.value.push(key);
}

function showFieldIssues(fieldKey: string) {
	return changedFieldsKeys.value.includes(fieldKey);
}

function showTooltip(event: MouseEvent, tooltip: string) {
	const container = event.target as HTMLElement;
	const containerRect = container.getBoundingClientRect();

	activeTooltip.value = tooltip;
	tooltipPosition.value = {
		x: containerRect.right,
		y: containerRect.top,
		width: containerRect.width,
		height: containerRect.height,
		right: window.innerWidth,
	};
}

function hideTooltip() {
	activeTooltip.value = null;
	tooltipPosition.value = null;
}
</script>

<template>
	<div :class="[$style.panelBlock, { [$style.hidden]: !showConfig }]">
		<div :class="$style.panelIntro">
			{{ locale.baseText('testDefinition.edit.step.intro') }}
		</div>
		<!-- Select Executions -->
		<EvaluationStep
			:class="[$style.step, $style.reducedSpacing]"
			:issues="getFieldIssues('tags')"
			:show-issues="showFieldIssues('tags')"
			:tooltip="
				hasRuns ? locale.baseText('testDefinition.edit.step.executions.tooltip') : undefined
			"
			@mouseenter="
				showTooltip($event, locale.baseText('testDefinition.edit.step.executions.tooltip'))
			"
			@mouseleave="hideTooltip"
		>
			<template #containerPrefix>
				<BlockArrow :class="[$style.middle, $style.diagramArrow, $style.sm]" />
			</template>
			<template #title>
				1. Fetch {{ selectedTag?.usageCount }} past executions tagged
				<N8nTag :class="$style.tagInputTag" :text="selectedTag.name" :clickable="false" />
			</template>
			<template #icon><font-awesome-icon icon="history" size="lg" /></template>
			<template #cardContent>
				<div :class="$style.tagInputContainer">
					<div :class="$style.tagInputControls">
						<n8n-button label="Rename tag" type="tertiary" size="small" @click="renameTag" />
						<n8n-button
							label="Select executions"
							type="tertiary"
							size="small"
							@click="openExecutionsView"
						/>
					</div>
				</div>
			</template>
		</EvaluationStep>
		<!-- Mocked Nodes -->
		<EvaluationStep
			:class="$style.step"
			:title="
				locale.baseText('testDefinition.edit.step.mockedNodes', {
					adjustToNumber: mockedNodes?.length ?? 0,
				})
			"
			:small="true"
			:issues="getFieldIssues('mockedNodes')"
			:show-issues="showFieldIssues('mockedNodes')"
			:tooltip="hasRuns ? locale.baseText('testDefinition.edit.step.nodes.tooltip') : undefined"
			@mouseenter="showTooltip($event, locale.baseText('testDefinition.edit.step.nodes.tooltip'))"
			@mouseleave="hideTooltip"
		>
			<template #containerPrefix>
				<BlockArrow :class="[$style.diagramArrow, $style.right]" hoverable />
			</template>
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
			:tooltip="
				hasRuns ? locale.baseText('testDefinition.edit.step.reRunExecutions.tooltip') : undefined
			"
			@mouseenter="
				showTooltip($event, locale.baseText('testDefinition.edit.step.reRunExecutions.tooltip'))
			"
			@mouseleave="hideTooltip"
		>
			<template #containerPrefix>
				<BlockArrow :class="[$style.right, $style.diagramArrow]" hoverable />
			</template>
			<template #icon><font-awesome-icon icon="redo" size="lg" /></template>
		</EvaluationStep>

		<!-- Compare Executions -->
		<EvaluationStep
			:class="$style.step"
			:title="locale.baseText('testDefinition.edit.step.compareExecutions')"
			:issues="getFieldIssues('evaluationWorkflow')"
			:show-issues="showFieldIssues('evaluationWorkflow')"
			:tooltip="
				hasRuns ? locale.baseText('testDefinition.edit.step.compareExecutions.tooltip') : undefined
			"
			@mouseenter="
				showTooltip($event, locale.baseText('testDefinition.edit.step.compareExecutions.tooltip'))
			"
			@mouseleave="hideTooltip"
		>
			<template #containerPrefix>
				<BlockArrow hoverable :class="[$style.right, $style.diagramArrow]" />
				<BlockArrow hoverable :class="[$style.left, $style.diagramArrow, $style.lg]" />
			</template>
			<template #icon><font-awesome-icon icon="equals" size="lg" /></template>
			<template #cardContent>
				<WorkflowSelector
					v-model="evaluationWorkflow"
					:example-pinned-data="examplePinnedData"
					:class="{ 'has-issues': getFieldIssues('evaluationWorkflow').length > 0 }"
					:sample-workflow-name="sampleWorkflowName"
					@update:model-value="updateChangedFieldsKeys('evaluationWorkflow')"
				/>
			</template>
		</EvaluationStep>

		<!-- Metrics -->
		<EvaluationStep
			:class="$style.step"
			:title="locale.baseText('testDefinition.edit.step.metrics')"
			:issues="getFieldIssues('metrics')"
			:show-issues="showFieldIssues('metrics')"
			:description="locale.baseText('testDefinition.edit.step.metrics.description')"
			:tooltip="hasRuns ? locale.baseText('testDefinition.edit.step.metrics.tooltip') : undefined"
			@mouseenter="showTooltip($event, locale.baseText('testDefinition.edit.step.metrics.tooltip'))"
			@mouseleave="hideTooltip"
		>
			<template #containerPrefix>
				<BlockArrow hoverable :class="[$style.middle, $style.diagramArrow]" />
			</template>
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
				<N8nHeading size="large" :bold="true">{{
					locale.baseText('testDefinition.edit.selectNodes')
				}}</N8nHeading>
				<br />
				<N8nText :class="$style.modalDescription">{{
					locale.baseText('testDefinition.edit.modal.description')
				}}</N8nText>
			</template>
			<template #content>
				<NodesPinning v-model="mockedNodes" data-test-id="nodes-pinning-modal" />
			</template>
		</Modal>

		<div
			v-if="tooltipPosition && !hasRuns"
			:class="$style.customTooltip"
			:style="{
				left: `${tooltipPosition.x}px`,
				top: `${tooltipPosition.y}px`,
				width: `${tooltipPosition.right - tooltipPosition.x}px`,
				height: `${tooltipPosition.height}px`,
			}"
		>
			{{ activeTooltip }}
		</div>
	</div>
</template>

<style module lang="scss">
.panelBlock {
	width: var(--evaluation-edit-panel-width);
	display: grid;
	height: 100%;
	overflow-y: auto;
	overflow-x: visible;
	flex-shrink: 0;
	padding-bottom: var(--spacing-l);
	margin-left: var(--spacing-2xl);
	transition: width 0.2s ease;
	position: relative;
	gap: var(--spacing-xl);

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

.customTooltip {
	position: fixed;
	z-index: 1000;
	padding: var(--spacing-xs);
	max-width: 25rem;
	display: flex;
	align-items: center;
	font-size: var(--font-size-xs);
	color: var(--color-text-light);
	line-height: 1rem;
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

	&:not(.reducedSpacing) {
		margin-top: var(--spacing-m);
	}
}

.diagramArrow {
	--arrow-height: 5rem;
	position: absolute;
	bottom: 100%;
	left: var(--spacing-2xl);
	z-index: 0;
	// increase hover radius of the arrow
	&.right {
		left: unset;
		right: var(--spacing-2xl);
	}
	&.middle {
		left: 50%;
		transform: translateX(-50%);
	}

	&.sm {
		--arrow-height: 1.5rem;
	}

	&.lg {
		--arrow-height: 22rem;
	}
}

.tagInputContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.tagInputTag {
	width: fit-content;
}
.tagInputControls {
	display: flex;
	gap: var(--spacing-2xs);
}
</style>
