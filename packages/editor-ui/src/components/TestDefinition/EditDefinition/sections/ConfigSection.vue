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
import type { IPinData } from 'n8n-workflow';
import { computed, ref } from 'vue';

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
	deleteMetric: [metric: TestMetricRecord];
	openExecutionsViewForTag: [];
	renameTag: [tag: string];
	evaluationWorkflowCreated: [workflowId: string];
}>();

const locale = useI18n();
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

const selectedTag = computed(() => {
	return props.tagsById[tags.value.value[0]] ?? {};
});

function openExecutionsView() {
	emit('openExecutionsViewForTag');
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
	<div :class="[$style.container, { [$style.hidden]: !showConfig }]">
		<div :class="$style.editForm">
			<div :class="$style.panelIntro">
				{{ locale.baseText('testDefinition.edit.step.intro') }}
			</div>
			<!-- Select Executions -->
			<EvaluationStep
				:class="[$style.step, $style.reducedSpacing]"
				:issues="getFieldIssues('tags')"
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
					{{
						locale.baseText('testDefinition.edit.step.executions', {
							adjustToNumber: selectedTag?.usageCount ?? 0,
						})
					}}
				</template>
				<template #cardContent>
					<div :class="$style.tagInputContainer">
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
						<div :class="$style.tagInputControls">
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
				:tooltip="hasRuns ? locale.baseText('testDefinition.edit.step.nodes.tooltip') : undefined"
				@mouseenter="showTooltip($event, locale.baseText('testDefinition.edit.step.nodes.tooltip'))"
				@mouseleave="hideTooltip"
			>
				<template #containerPrefix>
					<BlockArrow :class="[$style.diagramArrow, $style.right]" />
				</template>
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
					<BlockArrow :class="[$style.right, $style.diagramArrow]" />
				</template>
			</EvaluationStep>

			<!-- Compare Executions -->
			<EvaluationStep
				:class="$style.step"
				:title="locale.baseText('testDefinition.edit.step.compareExecutions')"
				:description="locale.baseText('testDefinition.edit.workflowSelectorLabel')"
				:issues="getFieldIssues('evaluationWorkflow')"
				:tooltip="
					hasRuns
						? locale.baseText('testDefinition.edit.step.compareExecutions.tooltip')
						: undefined
				"
				@mouseenter="
					showTooltip($event, locale.baseText('testDefinition.edit.step.compareExecutions.tooltip'))
				"
				@mouseleave="hideTooltip"
			>
				<template #containerPrefix>
					<BlockArrow :class="[$style.right, $style.diagramArrow]" />
					<BlockArrow :class="[$style.left, $style.diagramArrow, $style.lg]" />
				</template>
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

			<!-- Metrics -->
			<EvaluationStep
				:class="$style.step"
				:title="locale.baseText('testDefinition.edit.step.metrics')"
				:issues="getFieldIssues('metrics')"
				:description="locale.baseText('testDefinition.edit.step.metrics.description')"
				:tooltip="hasRuns ? locale.baseText('testDefinition.edit.step.metrics.tooltip') : undefined"
				@mouseenter="
					showTooltip($event, locale.baseText('testDefinition.edit.step.metrics.tooltip'))
				"
				@mouseleave="hideTooltip"
			>
				<template #containerPrefix>
					<BlockArrow :class="[$style.middle, $style.diagramArrow]" />
				</template>
				<template #cardContent>
					<MetricsInput
						v-model="metrics"
						:class="{ 'has-issues': getFieldIssues('metrics').length > 0 }"
						@delete-metric="(metric) => emit('deleteMetric', metric)"
					/>
				</template>
			</EvaluationStep>
		</div>
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
.container {
	overflow-y: auto;
	overflow-x: visible;
	width: auto;
	margin-left: var(--spacing-2xl);
}

.editForm {
	width: var(--evaluation-edit-panel-width);
	display: grid;
	height: fit-content;
	flex-shrink: 0;
	padding-bottom: var(--spacing-l);
	transition: width 0.2s ease;
	position: relative;
	gap: var(--spacing-l);
	margin: 0 auto;

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

.diagramArrow {
	--arrow-height: 4rem;
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
		--arrow-height: 14rem;
	}
}

.tagInputContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.tagInputTag {
	display: flex;
	gap: var(--spacing-3xs);
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
}
.tagInputControls {
	display: flex;
	gap: var(--spacing-2xs);
}
</style>
