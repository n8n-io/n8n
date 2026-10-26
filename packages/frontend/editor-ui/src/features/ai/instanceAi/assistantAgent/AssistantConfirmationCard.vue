<script setup lang="ts">
/**
 * An n8n Assistant confirmation in the agents chat of the Assistant agent. The
 * card emits the Assistant confirm body as the resume data, and the chat resumes
 * the suspended tool call with it.
 */
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
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';

import { useApprovalCardLabels } from '@/app/composables/useApprovalCardLabels';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

import { buildAlwaysAllowKey } from '../alwaysAllow';
import { formatApprovalDetails, formatApprovalTitle } from '../approvalDetails';
import DomainAccessApproval from '../components/DomainAccessApproval.vue';
import InstanceAiMcpConnectCard from '../components/InstanceAiMcpConnectCard.vue';
import InstanceAiQuestions, { type QuestionAnswer } from '../components/InstanceAiQuestions.vue';
import type { AssistantConfirmationInput } from './assistantConfirmation';

const props = defineProps<{
	input: AssistantConfirmationInput;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	submit: [resumeData: InstanceAiConfirmRequest];
}>();

const i18n = useI18n();
const approvalLabels = useApprovalCardLabels();
const submitted = ref(false);
// Bumped when the chat refuses an answer. The inner cards remount, so they drop
// their own answered state too.
const attempt = ref(0);
const textValue = ref('');

const isInactive = computed(() => props.disabled || submitted.value);

function reopen() {
	submitted.value = false;
	attempt.value += 1;
}

/** The same order as the current Assistant confirmation panel. */
const variant = computed(() => {
	const { input } = props;
	if (input.inputType === 'questions' && input.questions?.length) return 'questions';
	// Cards that need the current Assistant thread. They come to this chat later.
	if (
		input.setupRequests?.length ||
		input.credentialRequests?.length ||
		(input.inputType === 'resource-decision' && input.resourceDecision) ||
		input.channelConfig
	) {
		return 'unsupported';
	}
	if (input.mcpConnectRequest) return 'mcp-connect';
	if (input.inputType === 'text') return 'text';
	if (input.inputType === 'continue') return 'continue';
	if (input.testListener) return 'test-listener';
	if (input.domainAccess) return 'domain-access';
	if (input.webSearch) return 'web-search';
	if (input.credentialDestination) return 'credential-destination';
	return 'approval';
});

function submit(body: InstanceAiConfirmRequest) {
	if (isInactive.value) return;
	submitted.value = true;
	emit('submit', body);
	// The chat removes a card as soon as it takes the answer. A busy chat refuses the
	// answer and keeps the card, so the card takes the answer back. After a failed
	// send, the chat renders the card again as a new instance.
	void nextTick(reopen);
}

function onQuestionsSubmit(answers: QuestionAnswer[]) {
	submit({
		kind: 'questions',
		answers: answers.map(({ questionId, selectedOptions, customText, skipped }) => ({
			questionId,
			selectedOptions,
			...(customText !== undefined ? { customText } : {}),
			...(skipped !== undefined ? { skipped } : {}),
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

// The backend pushes these events for the armed workflow, so the card settles
// without a click. `approved` only means "not cancelled": the tool reads the
// outcome from durable state.
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
	if (targetApproval || !toolName) return i18n.baseText('agents.chat.approval.title');
	return formatApprovalTitle({ toolName, args, resourceName });
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

/** The same rule as the current panel: never for destructive or cross-target actions, or unscoped keys. */
const canAlwaysAllow = computed(() => {
	const { toolName, args, severity, targetApproval, credentialDestination, workflowId } =
		props.input;
	if (!toolName || severity === 'destructive' || targetApproval || credentialDestination) {
		return false;
	}
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
	<div :key="attempt">
		<InstanceAiQuestions
			v-if="variant === 'questions'"
			:questions="input.questions ?? []"
			:intro-message="input.introMessage"
			:disabled="isInactive"
			data-test-id="assistant-agent-questions"
			@submit="onQuestionsSubmit"
		/>
		<N8nCard
			v-else-if="variant === 'unsupported'"
			:class="$style.card"
			data-test-id="assistant-agent-unsupported-card"
		>
			<N8nText v-if="input.message" tag="div">{{ input.message }}</N8nText>
			<N8nText tag="div" size="small" color="text-light">
				{{ i18n.baseText('instanceAi.assistantAgent.unsupportedCard') }}
			</N8nText>
		</N8nCard>
		<InstanceAiMcpConnectCard
			v-else-if="variant === 'mcp-connect' && input.mcpConnectRequest"
			:servers="input.mcpConnectRequest.servers"
			:read-only="isInactive"
			data-test-id="assistant-agent-mcp-connect"
			@resolve="onMcpConnectResolve"
		/>
		<N8nCard
			v-else-if="variant === 'test-listener' && input.testListener"
			:class="$style.card"
			data-test-id="assistant-agent-test-listener"
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
					data-test-id="assistant-agent-test-listener-cancel"
					size="medium"
					variant="outline"
					:disabled="isInactive"
					@click="settleTestListener(false)"
				>
					{{ i18n.baseText('instanceAi.testListener.cancel') }}
				</N8nButton>
				<N8nButton
					data-test-id="assistant-agent-test-listener-sent"
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
					data-test-id="assistant-agent-text-input"
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
					data-test-id="assistant-agent-text-submit"
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
					data-test-id="assistant-agent-continue"
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
			data-test-id="assistant-agent-credential-destination"
			@select="onCredentialDestinationSelect"
		/>
		<!-- A plain approval, and the fallback for a payload that fails validation. -->
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
			data-test-id="assistant-agent-approval"
			@select="onApprovalSelect"
		/>
	</div>
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
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
}
</style>
