<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { N8nText, N8nButton } from '@n8n/design-system';
import N8nLink from '@n8n/design-system/components/N8nLink';
import { ref, computed, watch } from 'vue';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { EVALUATION_DATASET_TRIGGER_NODE, PLACEHOLDER_EMPTY_WORKFLOW_ID, VIEWS } from '@/constants';
import StepHeader from '../shared/StepHeader.vue';
import { useRouter } from 'vue-router';

defineEmits<{
	runTest: [];
}>();

const router = useRouter();
const locale = useI18n();
const workflowsStore = useWorkflowsStore();

const datasetTriggerExist = computed(() => {
	return workflowsStore.workflow.nodes.some(
		(node) => node.type === EVALUATION_DATASET_TRIGGER_NODE,
	);
});

const evaluationMetricNodeExist = computed(() => {
	return workflowsStore.workflow.nodes.some(
		(node) => node.type === 'n8n-nodes-base.evaluationMetrics',
	);
});

const activeStepIndex = ref(0);

// Calculate the initial active step based on the workflow state
const initializeActiveStep = () => {
	if (evaluationMetricNodeExist.value) {
		activeStepIndex.value = 3;
	} else if (datasetTriggerExist.value) {
		activeStepIndex.value = 2;
	} else {
		activeStepIndex.value = 0;
	}
};

// Run initialization on component mount
initializeActiveStep();

// Watch for changes and update active step dynamically
watch(
	() => datasetTriggerExist.value,
	(newValue) => {
		if (newValue && activeStepIndex.value < 1) {
			activeStepIndex.value = 2;
		}
	},
	{ immediate: true },
);

// Watch for changes to evaluation metric node
watch(
	() => evaluationMetricNodeExist.value,
	(newValue) => {
		if (newValue && activeStepIndex.value < 3) {
			activeStepIndex.value = 3;
		}
	},
	{ immediate: true },
);

const toggleStep = (index: number) => {
	activeStepIndex.value = index;
};

function navigateToWorkflow() {
	const routeWorkflowId =
		workflowsStore.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID
			? 'new'
			: workflowsStore.workflow.id;

	void router.push({
		name: VIEWS.WORKFLOW,
		params: { name: routeWorkflowId },
	});
}
</script>

<template>
	<div :class="$style.container" data-test-id="evaluation-setup-wizard">
		<div :class="$style.steps">
			<!-- Step 1 -->
			<div :class="[$style.step, $style.completed]">
				<StepHeader
					:step-number="1"
					title="Create a dataset and wire it up to your workflow"
					:is-completed="datasetTriggerExist"
					:is-active="activeStepIndex === 0"
					@click="toggleStep(0)"
				/>
				<div v-if="activeStepIndex === 0" :class="$style.stepContent">
					<ul :class="$style.bulletPoints">
						<li>
							<N8nText size="small" color="text-base">
								Populate a Google Sheet with one test input per row.
							</N8nText>
						</li>
						<li>
							<N8nText size="small" color="text-base">
								Add an 'Evaluation trigger' node to run once per row.
							</N8nText>
						</li>
					</ul>

					<div :class="$style.actionButton">
						<N8nButton size="small" type="secondary" @click="navigateToWorkflow()"
							>Add 'Evaluation trigger'</N8nButton
						>
					</div>
				</div>
			</div>

			<!-- Step 2 (Active) -->
			<div :class="[$style.step, activeStepIndex === 1 ? $style.active : '']">
				<StepHeader
					:step-number="2"
					title="Write outputs back to dataset"
					:is-completed="evaluationMetricNodeExist"
					:is-active="activeStepIndex === 1"
					@click="toggleStep(1)"
				/>
				<div v-if="activeStepIndex === 1" :class="$style.stepContent">
					<ul :class="$style.bulletPoints">
						<li>
							<N8nText size="small" color="text-base">
								Connect the 'Evaluation node' to the LLM or Agent node that outputs the response.
							</N8nText>
						</li>
						<li>
							<N8nText size="small" color="text-base">
								Use the 'Set outputs' operation to log each output back to Google Sheets so you can
								view them all in one place.
							</N8nText>
						</li>
					</ul>
					<div :class="$style.actionButton">
						<N8nButton size="small" type="secondary" @click="navigateToWorkflow()"
							>Add 'Evaluation node'</N8nButton
						>
					</div>
				</div>
			</div>

			<!-- Step 3 -->
			<div :class="$style.step">
				<StepHeader
					:step-number="3"
					title="Calculate a quality score"
					:is-completed="evaluationMetricNodeExist"
					:is-active="activeStepIndex === 2"
					:is-optional="true"
					@click="toggleStep(2)"
				/>
				<div v-if="activeStepIndex === 2" :class="$style.stepContent">
					<N8nText size="small" color="text-base">
						Add custom logic and nodes before the 'Evaluation node' to calculate your metrics. In
						the 'Evaluation node,' use the 'Set evaluation metrics' operation and map each metric
						you want to track.
					</N8nText>
					<div :class="$style.actionButton">
						<N8nButton size="small" type="secondary" @click="navigateToWorkflow()"
							>Back to editor</N8nButton
						>
						<N8nButton
							size="small"
							text
							style="color: var(--color-text-light)"
							@click="toggleStep(3)"
							>Skip</N8nButton
						>
					</div>
				</div>
			</div>

			<!-- Step 4 -->
			<div :class="$style.step">
				<StepHeader
					:step-number="4"
					title="Test evaluation"
					:is-completed="false"
					:is-active="activeStepIndex === 3"
					@click="toggleStep(3)"
				>
					<div
						v-if="activeStepIndex === 3"
						:class="[$style.actionButton, $style.actionButtonInline]"
					>
						<N8nButton
							size="medium"
							@click="$emit('runTest')"
							:disabled="!datasetTriggerExist || !evaluationMetricNodeExist"
							>Test evaluation</N8nButton
						>
					</div>
				</StepHeader>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	background-color: var(--color-background-light);
}

.steps {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.step {
	overflow: hidden;
}

.stepContent {
	padding: 0 0 0 calc(var(--spacing-m) + 28px);
	animation: slideDown 0.2s ease;
}

.bulletPoints {
	list-style-type: disc;
	list-style-position: inside;
	margin-bottom: var(--spacing-m);

	li {
		margin-bottom: var(--spacing-3xs);
	}
}

.actionButton {
	margin-top: var(--spacing-s);
	display: flex;
	gap: var(--spacing-s);

	button {
		font-weight: var(--font-weight-bold);
	}
}

.actionButtonInline {
	margin: 0;
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
