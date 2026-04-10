<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nButton, N8nCallout, N8nIcon, N8nText } from '@n8n/design-system';
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';

import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import TriggerExecuteButton from '@/features/setupPanel/components/TriggerExecuteButton.vue';
import WebhookUrlPreview from '@/features/setupPanel/components/WebhookUrlPreview.vue';
import SetupCardSection from '@/features/setupPanel/components/cards/SetupCardSection.vue';
import SetupCardBody from '@/features/setupPanel/components/cards/SetupCardBody.vue';

import type {
	NodeSetupState,
	CredentialSelectedPayload,
	CredentialDeselectedPayload,
} from '@/features/setupPanel/setupPanel.types';
import type { INodeUi } from '@/Interface';
import type { INodeProperties } from 'n8n-workflow';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useTriggerExecution } from '@/features/setupPanel/composables/useTriggerExecution';
import { useWebhookUrls } from '@/features/setupPanel/composables/useWebhookUrls';

const props = defineProps<{
	state: NodeSetupState;
	stepIndex: number;
	totalCards: number;
	firstTriggerName: string | null;
}>();

const emit = defineEmits<{
	goToNext: [];
	goToPrev: [];
	continueCurrent: [];
	stepExecuted: [];
	credentialSelected: [payload: CredentialSelectedPayload];
	credentialDeselected: [payload: CredentialDeselectedPayload];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const credentialsStore = useCredentialsStore();
const nodeHelpers = useNodeHelpers();

// Sticky parameter tracking — prevents inputs from flickering mid-edit
const shownParameters = ref<INodeProperties[]>([]);

const nodeType = computed(() =>
	nodeTypesStore.getNodeType(props.state.node.type, props.state.node.typeVersion),
);

const hasCredential = computed(() => !!props.state.credentialType);

const executableNode = computed<INodeUi | null>(() => {
	if (nodeTypesStore.isToolNode(props.state.node.type)) return null;
	if (props.state.isTrigger) {
		if (!props.firstTriggerName) return null;
		return props.state.node.name === props.firstTriggerName ? props.state.node : null;
	}
	if (!nodeHelpers.isNodeExecutable(props.state.node, true, [])) return null;
	return props.state.node;
});

const {
	isExecuting,
	isButtonDisabled,
	label: executeLabel,
	buttonIcon: executeButtonIcon,
	tooltipItems: executeTooltipItems,
	execute,
	isInListeningState,
	listeningHint,
} = useTriggerExecution(executableNode, { telemetrySource: 'aiWorkflowBuilder' });

const { webhookUrls } = useWebhookUrls(executableNode);

const isActive = computed(() => isExecuting.value || isInListeningState.value);

const isTestingCredential = computed(() => {
	const id = props.state.selectedCredentialId;
	return !!id && credentialsStore.isCredentialTestPending(id);
});

const hasShownParameters = computed(() => {
	const issueParamNames = Object.keys(props.state.parameterIssues);
	const additionalParamNames = props.state.additionalParameterNames ?? [];
	return issueParamNames.length > 0 || additionalParamNames.length > 0;
});

const isTriggerOnly = computed(
	() => props.state.isTrigger && !hasCredential.value && !hasShownParameters.value,
);

const useCredentialIcon = computed(
	() => hasCredential.value && !hasShownParameters.value && !isTriggerOnly.value,
);

const isComplete = computed(() => props.state.isComplete);
const isExecutable = computed(() => executableNode.value !== null);
const showExecuteButton = computed(() => {
	if (nodeType.value?.name === CHAT_TRIGGER_NODE_TYPE && isInListeningState.value) return false;
	return isExecutable.value;
});
const isLastCard = computed(() => props.stepIndex === props.totalCards - 1);
const showArrows = computed(() => props.totalCards > 1);
const isPrevDisabled = computed(() => props.stepIndex === 0);
const isNextDisabled = computed(() => isLastCard.value);

const showContinue = computed(
	() => !isExecutable.value && props.totalCards > 1 && !isLastCard.value,
);

const isContinueDisabled = computed(() => hasCredential.value && !props.state.selectedCredentialId);

const showTriggerCallout = computed(() => props.state.isTrigger && isInListeningState.value);

// Notify parent when step execution finishes (for auto-advance / wizard dismissal).
// Emit when the node ran successfully OR was not reached (e.g. on an inactive branch).
// Only skip when the node actually errored.
// Uses isActive (executing OR listening) because for non-schedule/non-manual triggers
// isExecuting stays false throughout the listening lifecycle.
watch(isActive, (active, wasActive) => {
	if (wasActive && !active) {
		const runData = workflowsStore.getWorkflowResultDataByNodeName(props.state.node.name);
		const lastRun = runData?.[runData.length - 1];
		if (!lastRun?.error) {
			emit('stepExecuted');
		}
	}
});
</script>

<template>
	<div data-test-id="builder-setup-card" :class="[$style.card, { [$style.completed]: isComplete }]">
		<!-- Header -->
		<header :class="$style.header">
			<CredentialIcon
				v-if="useCredentialIcon"
				:credential-type-name="state.credentialType!"
				:size="16"
			/>
			<NodeIcon v-else :node-type="nodeType" :size="16" />
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ state.node.name }}
			</N8nText>
			<N8nText
				v-if="isComplete"
				data-test-id="builder-setup-card-check"
				:class="$style.completeLabel"
				size="medium"
				color="success"
			>
				<N8nIcon icon="check" size="large" />
				{{ i18n.baseText('generic.complete') }}
			</N8nText>
		</header>

		<!-- Trigger listening callout -->
		<N8nCallout
			v-if="showTriggerCallout"
			:class="$style.callout"
			data-test-id="trigger-listening-callout"
			theme="secondary"
		>
			{{ listeningHint }}
		</N8nCallout>

		<!-- Webhook URL preview -->
		<WebhookUrlPreview
			v-if="state.isTrigger && isInListeningState && webhookUrls.length > 0"
			:class="$style.callout"
			:urls="webhookUrls"
		/>

		<!-- Content -->
		<SetupCardSection v-if="!isTriggerOnly" :state="state">
			<div :class="$style.content">
				<SetupCardBody
					:state="state"
					:sticky-parameters="shownParameters"
					:is-wizard="true"
					@credential-selected="(p) => emit('credentialSelected', p)"
					@credential-deselected="(p) => emit('credentialDeselected', p)"
					@parameters-discovered="(params) => shownParameters.push(...params)"
				/>
			</div>
		</SetupCardSection>

		<!-- Footer -->
		<footer :class="$style.footer">
			<div :class="$style.footerNav">
				<N8nButton
					v-if="showArrows"
					variant="ghost"
					size="xsmall"
					icon-only
					:disabled="isPrevDisabled"
					data-test-id="wizard-card-footer-prev"
					aria-label="Previous step"
					@click="emit('goToPrev')"
				>
					<N8nIcon icon="chevron-left" size="xsmall" />
				</N8nButton>
				<N8nText size="small" color="text-light"> {{ stepIndex + 1 }} of {{ totalCards }} </N8nText>
				<N8nButton
					v-if="showArrows"
					variant="ghost"
					size="xsmall"
					icon-only
					:disabled="isNextDisabled"
					data-test-id="wizard-card-footer-next"
					aria-label="Next step"
					@click="emit('goToNext')"
				>
					<N8nIcon icon="chevron-right" size="xsmall" />
				</N8nButton>
			</div>

			<div :class="$style.footerActions">
				<N8nButton
					v-if="showContinue"
					data-test-id="builder-setup-card-continue"
					type="primary"
					size="small"
					:class="$style.actionButton"
					:disabled="isContinueDisabled"
					:label="i18n.baseText('aiAssistant.builder.setupWizard.continue' as BaseTextKey)"
					@click="emit('continueCurrent')"
				/>

				<TriggerExecuteButton
					v-if="showExecuteButton"
					:label="executeLabel"
					:icon="executeButtonIcon"
					:disabled="isButtonDisabled || isTestingCredential"
					:loading="isExecuting"
					:tooltip-items="executeTooltipItems"
					@click="execute"
				/>
			</div>
		</footer>
	</div>
</template>

<style module lang="scss">
.card {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0;
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);

	&.completed {
		border-color: var(--color--success);
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--sm) 0;
}

.title {
	flex: 1;
}

.completeLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.callout {
	margin: 0 var(--spacing--sm);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--sm);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	border-top: var(--border);
	padding: var(--spacing--xs) var(--spacing--sm);
}

.footerNav {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--4xs);
}

.footerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.actionButton {
	--button--font-size: var(--font-size--2xs);
}
</style>
