<script setup lang="ts">
import type { EvalPlan } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTimeoutFn } from '@vueuse/core';
import { NodeConnectionTypes } from 'n8n-workflow';
import { computed, ref, watch } from 'vue';

import type { INodeUi } from '@/Interface';
import { useToast } from '@/app/composables/useToast';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useEvalApply } from '@/features/ai/evaluation.ee/composables/useEvalApply';
import { useEvaluationStore } from '@/features/ai/evaluation.ee/evaluation.store';

const SUCCESS_AUTOCLOSE_MS = 800;

import IntentStep from './wizard-steps/IntentStep.vue';
import DatasetStep from './wizard-steps/DatasetStep.vue';
import PlacementsStep from './wizard-steps/PlacementsStep.vue';
import ApplyStep from './wizard-steps/ApplyStep.vue';

type StepIndex = 0 | 1 | 2 | 3;
type ApplyState = 'pending' | 'success' | 'error';

const props = defineProps<{
	open: boolean;
	workflowId: string;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const evaluationStore = useEvaluationStore();
const evalApply = useEvalApply();
const workflowsStore = useWorkflowsStore();

const stepIndex = ref<StepIndex>(0);
const userIntent = ref('');
const datasetRows = ref<Array<Record<string, string>>>([]);
const plan = ref<EvalPlan | null>(null);
const applyState = ref<ApplyState>('pending');
const isFetchingPlan = ref(false);

/**
 * Detect the LLM-driven node to evaluate. We walk `workflow.connections`
 * looking for any source node that exposes an `ai_languageModel` slot —
 * the targets of those slots are the LLM-driven nodes (Agent, Basic LLM
 * Chain, Information Extractor, etc.).
 *
 * Walking the connection graph dodges the LangChain-node `inputs` problem:
 * those descriptors define `inputs` as an `={{ }}` expression that resolves
 * to a list at runtime, so a static `descriptor.inputs.includes(...)` check
 * silently misses every LangChain-style LLM node.
 *
 * Multi-LLM workflows pick the first match (hackathon decision); a future
 * iteration can show a chooser.
 */
const llmNode = computed<INodeUi | undefined>(() => {
	const workflow = workflowsStore.workflow;
	if (!workflow) return undefined;
	const nodesByName = new Map<string, INodeUi>(
		(workflow.nodes ?? []).map((n) => [n.name, n as INodeUi]),
	);
	for (const byType of Object.values(workflow.connections ?? {})) {
		const slots = byType?.[NodeConnectionTypes.AiLanguageModel];
		if (!slots) continue;
		for (const slot of slots) {
			if (!slot) continue;
			for (const link of slot) {
				if (!link?.node) continue;
				const target = nodesByName.get(link.node);
				if (target) return target;
			}
		}
	}
	return undefined;
});

// `useTimeoutFn` auto-cleans on unmount, so a force-close mid-success-delay
// won't fire `emit('update:open', false)` against an unmounted parent.
const { start: startSuccessAutoclose, stop: stopSuccessAutoclose } = useTimeoutFn(
	() => emit('update:open', false),
	SUCCESS_AUTOCLOSE_MS,
	{ immediate: false },
);

// Reset everything whenever the modal closes/reopens so cancelling discards state.
watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) {
			stepIndex.value = 0;
			userIntent.value = '';
			datasetRows.value = [];
			plan.value = null;
			applyState.value = 'pending';
			isFetchingPlan.value = false;
		} else {
			stopSuccessAutoclose();
		}
	},
);

// Intent is now optional — we only need an LLM node to advance from step 1.
const canAdvanceFromIntent = computed(() => llmNode.value !== undefined && !isFetchingPlan.value);
const canAdvanceFromDataset = computed(() => datasetRows.value.length > 0);
const canApply = computed(() => plan.value !== null && datasetRows.value.length > 0);

async function fetchPlan() {
	if (!llmNode.value) return;
	if (isFetchingPlan.value) return;
	isFetchingPlan.value = true;
	try {
		const fetched = await evaluationStore.fetchEvalPlan(
			props.workflowId,
			llmNode.value.name,
			userIntent.value.trim() || undefined,
		);
		if (fetched.datasetRows.length === 0) {
			toast.showMessage({
				type: 'warning',
				message: i18n.baseText('evaluation.wizard.error.emptyPlan'),
			});
			return;
		}
		plan.value = fetched;
		datasetRows.value = fetched.datasetRows;
		stepIndex.value = 1;
	} catch (error) {
		toast.showError(error, i18n.baseText('evaluation.wizard.error.fetchFailed'));
	} finally {
		isFetchingPlan.value = false;
	}
}

async function runApply() {
	if (!plan.value || !llmNode.value) return;
	stepIndex.value = 3;
	applyState.value = 'pending';

	const planForApply: EvalPlan = {
		datasetRows: datasetRows.value,
		metrics: plan.value.metrics,
	};
	try {
		await evalApply.apply(planForApply, userIntent.value.trim(), llmNode.value.name);
		applyState.value = 'success';
		startSuccessAutoclose();
	} catch (error) {
		applyState.value = 'error';
		// eslint-disable-next-line no-console
		console.error('eval-plan apply failed', error);
	}
}

function close() {
	emit('update:open', false);
}

function back() {
	if (stepIndex.value > 0) stepIndex.value = (stepIndex.value - 1) as StepIndex;
}

function nextFromDataset() {
	stepIndex.value = 2;
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="large"
		data-test-id="eval-wizard-modal"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ i18n.baseText('evaluation.wizard.title') }}</N8nDialogTitle>
			<N8nText v-if="llmNode" size="small" color="text-light">
				{{ i18n.baseText('evaluation.wizard.evaluating') }}
				<strong>{{ llmNode.name }}</strong>
			</N8nText>
		</N8nDialogHeader>

		<div :class="$style.body">
			<div v-if="!llmNode" :class="$style.empty" data-test-id="eval-wizard-no-llm-node">
				<N8nText size="large" tag="h3" bold>
					{{ i18n.baseText('evaluation.wizard.noLlmNode.title') }}
				</N8nText>
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('evaluation.wizard.noLlmNode.description') }}
				</N8nText>
			</div>
			<template v-else>
				<IntentStep v-if="stepIndex === 0" v-model="userIntent" />
				<DatasetStep v-else-if="stepIndex === 1" v-model="datasetRows" />
				<PlacementsStep v-else-if="stepIndex === 2" :metrics="plan?.metrics ?? []" />
				<ApplyStep v-else :state="applyState" />
			</template>
		</div>

		<N8nDialogFooter>
			<N8nButton
				v-if="llmNode && stepIndex > 0 && stepIndex < 3"
				variant="subtle"
				:label="i18n.baseText('evaluation.wizard.button.back')"
				data-test-id="eval-wizard-back"
				@click="back"
			/>
			<N8nButton
				v-if="!llmNode || stepIndex !== 3 || applyState !== 'pending'"
				variant="subtle"
				:label="i18n.baseText('evaluation.wizard.button.cancel')"
				data-test-id="eval-wizard-cancel"
				@click="close"
			/>
			<template v-if="llmNode">
				<N8nButton
					v-if="stepIndex === 0"
					:label="i18n.baseText('evaluation.wizard.button.next')"
					:loading="isFetchingPlan"
					:disabled="!canAdvanceFromIntent"
					data-test-id="eval-wizard-next"
					@click="fetchPlan"
				/>
				<N8nButton
					v-else-if="stepIndex === 1"
					:label="i18n.baseText('evaluation.wizard.button.next')"
					:disabled="!canAdvanceFromDataset"
					data-test-id="eval-wizard-next"
					@click="nextFromDataset"
				/>
				<N8nButton
					v-else-if="stepIndex === 2"
					:label="i18n.baseText('evaluation.wizard.button.apply')"
					:disabled="!canApply"
					data-test-id="eval-wizard-apply"
					@click="runApply"
				/>
			</template>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.body {
	margin-top: var(--spacing--sm);
	min-height: 280px;
	max-height: 60vh;
	overflow-y: auto;
}

.empty {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--lg) 0;
	text-align: center;
}
</style>
