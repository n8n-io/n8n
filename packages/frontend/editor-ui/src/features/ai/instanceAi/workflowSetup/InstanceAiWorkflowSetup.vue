<script lang="ts" setup>
import { computed, onMounted, ref, toRef } from 'vue';
import type { InstanceAiCredentialFlow, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useInstanceAiStore } from '../instanceAi.store';
import WorkflowSetupWizard from './components/WorkflowSetupWizard.vue';
import WorkflowSetupStatus from './components/WorkflowSetupStatus.vue';
import { useWorkflowSetupBootstrap } from './composables/useWorkflowSetupBootstrap';
import { useWorkflowSetupCards } from './composables/useWorkflowSetupCards';
import { useWorkflowSetupSelections } from './composables/useWorkflowSetupSelections';
import { useWorkflowSetupApply } from './composables/useWorkflowSetupApply';

const props = defineProps<{
	requestId: string;
	setupRequests: InstanceAiWorkflowSetupNode[];
	workflowId: string;
	message: string;
	projectId?: string;
	credentialFlow?: InstanceAiCredentialFlow;
}>();

const telemetry = useTelemetry();
const rootStore = useRootStore();
const store = useInstanceAiStore();

const requestIdRef = toRef(props, 'requestId');
const workflowIdRef = toRef(props, 'workflowId');
const setupRequestsRef = toRef(props, 'setupRequests');

const { cards } = useWorkflowSetupCards(setupRequestsRef);
const bootstrap = useWorkflowSetupBootstrap();
const applyMachine = useWorkflowSetupApply({
	requestId: requestIdRef,
	workflowId: workflowIdRef,
	store,
});

const currentStepIndex = ref(0);

const activeCard = computed(() => cards.value[currentStepIndex.value]);

const selections = useWorkflowSetupSelections({ cards, activeCard });

function trackSetupInput() {
	const tc = store.findToolCallByRequestId(props.requestId);
	const inputThreadId = tc?.confirmation?.inputThreadId ?? '';
	const provided: Array<{ label: string; options: string[]; option_chosen: string }> = [];
	const skipped: Array<{ label: string; options: string[] }> = [];
	for (const card of cards.value) {
		if (selections.isCardComplete(card)) {
			provided.push({
				label: card.credentialType,
				options: [],
				option_chosen:
					selections.selections.value[card.targetNodeName]?.[card.credentialType] ?? '',
			});
		} else {
			skipped.push({ label: card.credentialType, options: [] });
		}
	}
	telemetry.track('User finished providing input', {
		thread_id: store.currentThreadId,
		input_thread_id: inputThreadId,
		instance_id: rootStore.instanceId,
		type: 'setup',
		provided_inputs: provided,
		skipped_inputs: skipped,
		num_tasks: cards.value.length,
	});
}

onMounted(async () => {
	await bootstrap.bootstrap();
	if (props.setupRequests.length > 0 && cards.value.length === 0) {
		await applyMachine.apply({});
	}
});

function handleApply() {
	trackSetupInput();
	void applyMachine.apply(selections.buildNodeCredentials());
}

function handleDefer() {
	trackSetupInput();
	void applyMachine.defer();
}
</script>

<template>
	<div data-test-id="instance-ai-workflow-setup">
		<div v-if="!bootstrap.isReady.value && !applyMachine.terminalState.value" />

		<WorkflowSetupStatus
			v-else-if="applyMachine.terminalState.value"
			:state="applyMachine.terminalState.value"
			:credential-flow="credentialFlow"
		/>

		<WorkflowSetupWizard
			v-else-if="cards.length"
			v-model:current-step-index="currentStepIndex"
			:cards="cards"
			:selections="selections.selections.value"
			:set-selection="selections.setSelection"
			:is-card-complete="selections.isCardComplete"
			:project-id="projectId"
			:credential-flow="credentialFlow"
			@apply="handleApply"
			@defer="handleDefer"
		/>
	</div>
</template>
