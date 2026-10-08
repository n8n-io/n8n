<script setup lang="ts">
/**
 * Renders an n8n Assistant confirmation inside the Agents chat. Each card
 * emits the Assistant confirm body (`InstanceAiConfirmRequest`) as the resume
 * data; the Agents chat resumes the suspended tool call with it.
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import type { InstanceAiConfirmRequest } from '@n8n/api-types';
import {
	N8nApprovalCard,
	N8nButton,
	N8nCard,
	N8nInput,
	N8nText,
	type ApprovalOption,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useApprovalCardLabels } from '@/app/composables/useApprovalCardLabels';
import { buildAlwaysAllowKey } from '../../alwaysAllow';
import { formatApprovalDetails, formatApprovalTitle } from '../../approvalDetails';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import type { AssistantConfirmationInput } from '@/features/ai/shared/agentsChat/assistantConfirmation';
import InstanceAiQuestions, { type QuestionAnswer } from '../InstanceAiQuestions.vue';
import PlanReviewPanel from '../PlanReviewPanel.vue';
import DomainAccessApproval from '../DomainAccessApproval.vue';
import GatewayResourceDecision from '../GatewayResourceDecision.vue';
import InstanceAiChannelSetup from '../InstanceAiChannelSetup.vue';
import InstanceAiCredentialSetup from '../InstanceAiCredentialSetup.vue';
import InstanceAiMcpConnectCard from '../InstanceAiMcpConnectCard.vue';
import AutomationProposalCard from '../automation/AutomationProposalCard.vue';
import InstanceAiWorkflowSetup from '../../workflowSetup/InstanceAiWorkflowSetup.vue';
import { useOptionalThread } from '../../instanceAi.store';
import { resolvePlanTasksFromConfirmation } from '../../planReview.utils';

const props = defineProps<{
	input: AssistantConfirmationInput;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [resumeData: InstanceAiConfirmRequest];
}>();

const i18n = useI18n();
const approvalLabels = useApprovalCardLabels();
// Read-only: the project fallback for cards whose payload has no projectId.
const thread = useOptionalThread();
const submitted = ref(false);
const textValue = ref('');

const isInactive = computed(() => props.disabled || submitted.value);

/** Same dispatch order as the legacy `InstanceAiConfirmationPanel`. */
const variant = computed(() => {
	const { input } = props;
	if (input.inputType === 'questions' && input.questions?.length) return 'questions';
	if (input.inputType === 'plan-review') return 'plan-review';
	if (input.mcpConnectRequest) return 'mcp-connect';
	if (input.setupRequests?.length) return 'workflow-setup';
	if (input.credentialRequests?.length) return 'credential-setup';
	if (input.inputType === 'text') return 'text';
	if (input.inputType === 'continue') return 'continue';
	if (input.testListener) return 'test-listener';
	if (input.inputType === 'resource-decision' && input.resourceDecision) {
		return 'resource-decision';
	}
	if (input.channelConfig) return 'channel-config';
	if (input.domainAccess) return 'domain-access';
	if (input.webSearch) return 'web-search';
	if (input.credentialDestination) return 'credential-destination';
	if (input.automationProposal) return 'automation-proposal';
	return 'approval';
});

// Threads are project-bound: a payload without projectId uses the thread's project.
const projectId = computed(() => props.input.projectId ?? thread?.projectId);

const plannedTasks = computed(() =>
	resolvePlanTasksFromConfirmation(props.input, props.input.args),
);

function submit(body: InstanceAiConfirmRequest) {
	if (isInactive.value) return;
	submitted.value = true;
	emit('submit', body);
}

function onQuestionsSubmit(answers: QuestionAnswer[]) {
	submit({
		kind: 'questions',
		answers: answers.map(({ questionId, selectedOptions, customText, skipped }) => ({
			questionId,
			selectedOptions,
			...(customText !== undefined && { customText }),
			...(skipped !== undefined && { skipped }),
		})),
	});
}

function onTextSubmit() {
	const value = textValue.value.trim();
	if (!value) return;
	submit({ kind: 'approval', approved: true, userInput: value });
}

function onMcpConnectResolve({
	approved,
	connectedSlugs,
}: {
	approved: boolean;
	connectedSlugs: string[];
}) {
	submit({ kind: 'mcpConnect', approved, connectedSlugs });
}

// --- Credential destination ---

const credentialDestinationTitle = computed(() => {
	const destination = props.input.credentialDestination;
	if (!destination) return '';
	return i18n.baseText('instanceAi.confirmation.credentialDestination.title', {
		interpolate: { origin: destination.origin },
	});
});

const credentialDestinationDescription = computed(() => {
	const destination = props.input.credentialDestination;
	if (!destination) return '';
	const [nodeName] = destination.nodeNames;
	if (destination.nodeNames.length === 1 && nodeName) {
		return i18n.baseText('instanceAi.confirmation.credentialDestination.description', {
			interpolate: { nodeName },
		});
	}
	return i18n.baseText('instanceAi.confirmation.credentialDestination.descriptionMultiple', {
		interpolate: { nodeNames: destination.nodeNames.join(', ') },
	});
});

const credentialDestinationOptions = computed<ApprovalOption[]>(() => [
	{
		key: 'allow-once',
		icon: 'check',
		label: i18n.baseText('instanceAi.confirmation.credentialDestination.approve'),
	},
	{
		key: 'deny',
		icon: 'ban',
		label: i18n.baseText('instanceAi.confirmation.credentialDestination.deny'),
	},
]);

function onCredentialDestinationSelect(key: string) {
	const destination = props.input.credentialDestination;
	if (!destination || (key !== 'allow-once' && key !== 'deny')) return;
	submit({
		kind: 'credentialDestination',
		approved: key === 'allow-once',
		origin: destination.origin,
	});
}

// --- Test listener ---

function settleTestListener(approved: boolean, executionId?: string) {
	submit({ kind: 'approval', approved, ...(executionId ? { userInput: executionId } : {}) });
}

function formatDeadline(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// The backend pushes these events for the armed workflow. Settle the card from
// them, so the Assistant reads the outcome without a click. `approved` only
// means "not cancelled": the tool reads the outcome from durable state.
if (props.input.testListener) {
	const removePushListener = usePushConnectionStore().addEventListener((event) => {
		if (event.type !== 'testWebhookReceived' && event.type !== 'testWebhookDeleted') return;
		if (props.input.testListener?.workflowId !== event.data.workflowId) return;
		settleTestListener(
			true,
			event.type === 'testWebhookReceived' ? event.data.executionId : undefined,
		);
	});
	onBeforeUnmount(removePushListener);
}

// --- Plain approval ---

const approvalTitle = computed(() => {
	const { targetApproval, toolName, args, resourceName } = props.input;
	if (!targetApproval) {
		const title = formatApprovalTitle({ toolName, args, resourceName });
		if (title) return title;
	}
	return i18n.baseText('agents.chat.approval.title');
});

const approvalDescription = computed(() => {
	const { targetApproval, approvalDetails, message } = props.input;
	if (targetApproval) {
		return i18n.baseText('agents.chat.approval.description', {
			interpolate: { toolName: targetApproval.displayName ?? targetApproval.toolName },
		});
	}
	return approvalDetails ? formatApprovalDetails(approvalDetails) : message;
});

/** Same rule as the legacy panel: never for destructive or cross-target actions, or unscoped keys. */
const canAlwaysAllow = computed(() => {
	const { toolName, args, severity, targetApproval, credentialDestination, workflowId } =
		props.input;
	if (!toolName || severity === 'destructive' || targetApproval || credentialDestination) {
		return false;
	}
	// A capability answer has no session scope, so "Always allow" would approve only once.
	if (props.input.capability === true) return false;
	return buildAlwaysAllowKey(toolName, args ?? {}, workflowId) !== null;
});

function onApprovalSelect(key: string) {
	if (key === 'always-allow' && canAlwaysAllow.value) {
		// The tool stores a thread grant, so later matching calls skip the card.
		submit({ kind: 'approval', approved: true, scope: 'session' });
		return;
	}
	if (key === 'allow-once' || key === 'deny') {
		submit({ kind: 'approval', approved: key === 'allow-once' });
	}
}
</script>

<template>
	<InstanceAiQuestions
		v-if="variant === 'questions'"
		:questions="input.questions ?? []"
		:intro-message="input.introMessage"
		:disabled="isInactive"
		data-test-id="instance-ai-agents-chat-questions"
		@submit="onQuestionsSubmit"
	/>

	<PlanReviewPanel
		v-else-if="variant === 'plan-review'"
		:planned-tasks="plannedTasks"
		:message="input.introMessage"
		:disabled="isInactive"
		data-test-id="instance-ai-agents-chat-plan-review"
		@approve="submit({ kind: 'approval', approved: true })"
		@deny="submit({ kind: 'planDeny' })"
	/>

	<InstanceAiMcpConnectCard
		v-else-if="variant === 'mcp-connect' && input.mcpConnectRequest"
		:servers="input.mcpConnectRequest.servers"
		:read-only="isInactive"
		data-test-id="instance-ai-agents-chat-mcp-connect"
		@resolve="onMcpConnectResolve"
	/>

	<!-- The setup cards keep their own submitted state; the Agents chat removes
	     them once the resume is sent. -->
	<InstanceAiWorkflowSetup
		v-else-if="variant === 'workflow-setup' && input.setupRequests"
		:request-id="input.requestId"
		:setup-requests="input.setupRequests"
		:project-id="projectId"
		:credential-flow="input.credentialFlow"
		:workflow-id="input.workflowId"
		:submit="submit"
	/>

	<InstanceAiCredentialSetup
		v-else-if="variant === 'credential-setup' && input.credentialRequests"
		:request-id="input.requestId"
		:credential-requests="input.credentialRequests"
		:message="input.message"
		:project-id="projectId"
		:credential-flow="input.credentialFlow"
		:require-user-selection="input.requireUserSelection"
		:submit="submit"
	/>

	<GatewayResourceDecision
		v-else-if="variant === 'resource-decision' && input.resourceDecision"
		data-test-id="instance-ai-agents-chat-resource-decision"
		:request-id="input.requestId"
		:resource="input.resourceDecision.resource"
		:description="input.resourceDecision.description"
		:options="input.resourceDecision.options"
		:submit="submit"
	/>

	<InstanceAiChannelSetup
		v-else-if="variant === 'channel-config' && input.channelConfig"
		:request-id="input.requestId"
		:integration-type="input.channelConfig.integrationType"
		:agent-id="input.channelConfig.agentId"
		:project-id="projectId ?? ''"
		:submit="submit"
	/>

	<N8nCard
		v-else-if="variant === 'test-listener' && input.testListener"
		:class="$style.card"
		data-test-id="instance-ai-agents-chat-test-listener"
	>
		<N8nText tag="div">{{ input.message }}</N8nText>
		<div
			v-for="trigger in input.testListener.triggers"
			:key="trigger.nodeName"
			:class="$style.testListenerUrl"
		>
			<N8nText tag="span" size="small" bold>{{ trigger.method }}</N8nText>
			<N8nText tag="code" size="small">{{ trigger.url }}</N8nText>
		</div>
		<N8nText tag="div" size="small" color="text-light">
			{{
				i18n.baseText('instanceAi.testListener.deadline', {
					interpolate: { time: formatDeadline(input.testListener.deadlineAt) },
				})
			}}
		</N8nText>
		<div :class="[$style.row, $style.end]">
			<N8nButton
				data-test-id="instance-ai-agents-chat-test-listener-cancel"
				size="medium"
				variant="outline"
				:disabled="isInactive"
				@click="settleTestListener(false)"
			>
				{{ i18n.baseText('instanceAi.testListener.cancel') }}
			</N8nButton>
			<N8nButton
				data-test-id="instance-ai-agents-chat-test-listener-sent"
				size="medium"
				variant="solid"
				:disabled="isInactive"
				@click="settleTestListener(true)"
			>
				{{ i18n.baseText('instanceAi.testListener.sent') }}
			</N8nButton>
		</div>
	</N8nCard>

	<DomainAccessApproval
		v-else-if="variant === 'domain-access' && input.domainAccess"
		:request-id="input.requestId"
		:url="input.domainAccess.url"
		:host="input.domainAccess.host"
		:severity="input.severity"
		:submit="submit"
	/>

	<DomainAccessApproval
		v-else-if="variant === 'web-search' && input.webSearch"
		:request-id="input.requestId"
		:query="input.webSearch.query"
		:severity="input.severity"
		:submit="submit"
	/>

	<N8nCard v-else-if="variant === 'text'" :class="$style.card">
		<N8nText tag="div">{{ input.message }}</N8nText>
		<div :class="$style.row">
			<N8nInput
				v-model="textValue"
				type="text"
				size="small"
				:disabled="isInactive"
				:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
				@keydown.enter="onTextSubmit"
			/>
			<N8nButton
				v-if="!textValue.trim()"
				size="medium"
				variant="outline"
				:disabled="isInactive"
				@click="submit({ kind: 'approval', approved: false })"
			>
				{{ i18n.baseText('instanceAi.askUser.skip') }}
			</N8nButton>
			<N8nButton
				size="medium"
				variant="solid"
				:disabled="isInactive || !textValue.trim()"
				@click="onTextSubmit"
			>
				{{ i18n.baseText('instanceAi.askUser.submit') }}
			</N8nButton>
		</div>
	</N8nCard>

	<N8nCard v-else-if="variant === 'continue'" :class="$style.card">
		<N8nText tag="div">{{ input.message }}</N8nText>
		<div :class="[$style.row, $style.end]">
			<N8nButton
				size="medium"
				variant="solid"
				:disabled="isInactive"
				@click="submit({ kind: 'approval', approved: true })"
			>
				{{ i18n.baseText('instanceAi.confirmation.continue') }}
			</N8nButton>
		</div>
	</N8nCard>

	<N8nApprovalCard
		v-else-if="variant === 'credential-destination' && input.credentialDestination"
		:title="credentialDestinationTitle"
		:labels="approvalLabels"
		:description="credentialDestinationDescription"
		:options="credentialDestinationOptions"
		:disabled="isInactive"
		data-test-id="instance-ai-agents-chat-credential-destination"
		@select="onCredentialDestinationSelect"
	/>

	<AutomationProposalCard
		v-else-if="variant === 'automation-proposal' && input.automationProposal"
		:proposal="input.automationProposal"
		:disabled="isInactive"
		@submit="submit"
	/>

	<!-- Plain approval, and the fallback for payloads that fail validation -->
	<N8nApprovalCard
		v-else
		:title="approvalTitle"
		:labels="approvalLabels"
		:description="approvalDescription"
		:description-label="i18n.baseText('instanceAi.confirmation.details')"
		:args="input.targetApproval?.args"
		:destructive="input.severity === 'destructive'"
		:supports-session-approval="canAlwaysAllow"
		:disabled="isInactive"
		data-test-id="instance-ai-agents-chat-approval"
		@select="onApprovalSelect"
	/>
</template>

<style lang="scss" module>
.card {
	border: 0;
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.end {
	justify-content: flex-end;
}

.testListenerUrl {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
	word-break: break-all;
	user-select: all;
}
</style>
