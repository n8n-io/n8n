<script lang="ts" setup>
import {
	N8nApprovalCard,
	N8nButton,
	N8nCard,
	N8nInput,
	N8nText,
	type ApprovalOption,
} from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { InstanceAiConfirmation, InstanceAiConfirmRequest } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useApprovalCardLabels } from '@/app/composables/useApprovalCardLabels';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { redactTelemetryProperties } from '@n8n/telemetry';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useThread, type PendingConfirmationItem } from '../instanceAi.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { isPendingItemFloating } from '../confirmationKinds';
import { formatApprovalDetails } from '../approvalDetails';
import { useToolLabel } from '../toolLabels';
import DomainAccessApproval from './DomainAccessApproval.vue';
import GatewayResourceDecision from './GatewayResourceDecision.vue';
import InstanceAiChannelSetup from './InstanceAiChannelSetup.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';
import type { QuestionAnswer } from './InstanceAiQuestions.vue';
import InstanceAiQuestions from './InstanceAiQuestions.vue';
import InstanceAiWorkflowSetup from '../workflowSetup/InstanceAiWorkflowSetup.vue';

interface Props {
	/**
	 * Where this panel is mounted. The component renders different subsets of
	 * `pendingConfirmations` depending on this:
	 * - `inline`: full-form confirmations rendered in the chat flow (text, setup,
	 *   credential, gateway resource-decision, continue). Plan review is filtered
	 *   out of `pendingConfirmations` and renders in the timeline instead.
	 * - `floating`: questions, single-click approvals, and domain/web-search
	 *   access, which replace the chat input slot. Only the oldest pending item
	 *   is rendered at a time — no stacking.
	 */
	kind: 'inline' | 'floating';
}

const props = defineProps<Props>();

const thread = useThread();
const i18n = useI18n();
const approvalLabels = useApprovalCardLabels();
const rootStore = useRootStore();
const settingsStore = useInstanceAiSettingsStore();
const telemetry = useTelemetry();
const { getToolLabel } = useToolLabel();

function getConfirmationType(conf: InstanceAiConfirmation): string {
	if (conf.testListener) return 'test-listener';
	if (conf.credentialDestination) return 'credential-destination';
	if (conf.inputType) return conf.inputType;
	if (conf.setupRequests?.length) return 'setup';
	if (conf.credentialRequests?.length) return 'credential-setup';
	if (conf.channelConfig) return 'channel-config';
	return 'approval';
}

function trackInputCompleted(
	conf: InstanceAiConfirmation,
	providedInputs: Array<{
		label: string;
		question?: string;
		input_type?: string;
		options: string[];
		option_chosen: string | string[];
	}>,
	skippedInputs: Array<{
		label: string;
		question?: string;
		input_type?: string;
		options: string[];
	}>,
	extra?: Record<string, unknown>,
): void {
	const eventProps = {
		thread_id: thread.id,
		input_thread_id: conf.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		action_source: thread.resolveActionSource(),
		type: getConfirmationType(conf),
		provided_inputs: providedInputs,
		skipped_inputs: skippedInputs,
		...extra,
	};
	// The inputs carry free text — what the user typed into a question card, and
	// the agent's own description of the action it wants to take. This event
	// reaches RudderStack *and* PostHog from the browser, so the backend
	// redactor never sees it. The `*_id` keys are exempted by the scrubber.
	telemetry.track('User finished providing input', redactTelemetryProperties(eventProps));
}

interface StandaloneChunk {
	type: 'standalone';
	item: PendingConfirmationItem;
}

interface FloatingChunk {
	type: 'floating';
	item: PendingConfirmationItem;
}

type ConfirmationChunk = FloatingChunk | StandaloneChunk;

/**
 * Filter pending confirmations to those that belong in this panel mount.
 *
 * - `inline`: every non-floating item (plan/text/setup/etc.) in chronological
 *   order — these forms coexist comfortably in the chat flow.
 * - `floating`: only the **oldest** floating item. We intentionally do not
 *   stack: the floating panel replaces the chat input, and stacking would
 *   shove the input far up the screen. The user must resolve the visible
 *   card before the next one appears.
 */
const chunks = computed((): ConfirmationChunk[] => {
	if (props.kind === 'inline') {
		const result: ConfirmationChunk[] = [];
		for (const item of thread.pendingConfirmations) {
			if (isPendingItemFloating(item)) continue;
			result.push({ type: 'standalone', item });
		}
		return result;
	}

	for (const item of thread.pendingConfirmations) {
		if (!isPendingItemFloating(item)) continue;
		return [{ type: 'floating', item }];
	}
	return [];
});

const approvalTitleKeys = new Map<string, BaseTextKey>(
	(
		[
			'instanceAi.tools.workflows.delete.imperative',
			'instanceAi.tools.workflows.delete.imperativeWithResource',
			'instanceAi.tools.workflows.unarchive.imperative',
			'instanceAi.tools.workflows.unarchive.imperativeWithResource',
			'instanceAi.tools.workflows.publish.imperative',
			'instanceAi.tools.workflows.publish.imperativeWithResource',
			'instanceAi.tools.workflows.unpublish.imperative',
			'instanceAi.tools.workflows.unpublish.imperativeWithResource',
			'instanceAi.tools.workflows.update-version.imperative',
			'instanceAi.tools.workflows.update-version.imperativeWithResource',
			'instanceAi.tools.workflows.restore-version.imperative',
			'instanceAi.tools.workflows.restore-version.imperativeWithResource',
			'instanceAi.tools.nodes.execute.imperativeWithResource',
			'instanceAi.tools.executions.run.imperative',
			'instanceAi.tools.executions.run.imperativeWithResource',
			'instanceAi.tools.executions.listen.imperative',
			'instanceAi.tools.executions.listen.imperativeWithResource',
			'instanceAi.tools.credentials.delete.imperative',
			'instanceAi.tools.data-tables.create.imperative',
			'instanceAi.tools.data-tables.create.imperativeWithResource',
			'instanceAi.tools.data-tables.delete.imperative',
			'instanceAi.tools.data-tables.delete.imperativeWithResource',
			'instanceAi.tools.data-tables.add-column.imperative',
			'instanceAi.tools.data-tables.add-column.imperativeWithResource',
			'instanceAi.tools.data-tables.delete-column.imperative',
			'instanceAi.tools.data-tables.delete-column.imperativeWithResource',
			'instanceAi.tools.data-tables.rename-column.imperative',
			'instanceAi.tools.data-tables.rename-column.imperativeWithResource',
			'instanceAi.tools.data-tables.insert-rows.imperative',
			'instanceAi.tools.data-tables.insert-rows.imperativeWithResource',
			'instanceAi.tools.data-tables.update-rows.imperative',
			'instanceAi.tools.data-tables.update-rows.imperativeWithResource',
			'instanceAi.tools.data-tables.delete-rows.imperative',
			'instanceAi.tools.data-tables.delete-rows.imperativeWithResource',
			'instanceAi.tools.workspace.tag-workflow.imperative',
			'instanceAi.tools.workspace.cleanup-test-executions.imperative',
			'instanceAi.tools.workspace.create-folder.imperative',
			'instanceAi.tools.workspace.delete-folder.imperative',
			'instanceAi.tools.workspace.move-workflow-to-folder.imperative',
			'instanceAi.tools.build-workflow.imperative',
			'instanceAi.tools.build-workflow.imperativeWithResource',
			'instanceAi.tools.build-workflow-with-agent.imperative',
		] satisfies BaseTextKey[]
	).map((key) => [key, key]),
);

function isDestructive(item: PendingConfirmationItem): boolean {
	return item.toolCall.confirmation.severity === 'destructive';
}

/**
 * Title for the floating approval. We resolve a short imperative phrase
 * (e.g. "archive workflow") via i18n keyed by the tool name and optional
 * action — `instanceAi.tools.{tool}.{action}.imperative`. When that key
 * exists we render the unified "Allow n8n Assistant to {action}?" prompt;
 * otherwise we fall back to the tool's display label. Doing the lookup on
 * the frontend keeps the action phrase translatable without sending
 * English strings over the wire.
 *
 * When the tool names the resource it acts on, the title carries that name
 * ("Assistant wants to edit CRM Lead enrichment") and the phrase comes from
 * the `.imperativeWithResource` key, which is written to precede a name.
 */
function buildApprovalTitle(item: PendingConfirmationItem): string {
	const credentialDestination = item.toolCall.confirmation.credentialDestination;
	if (credentialDestination) {
		return i18n.baseText('instanceAi.confirmation.credentialDestination.title', {
			interpolate: { origin: credentialDestination.origin },
		});
	}
	if (item.toolCall.confirmation.targetApproval) {
		return i18n.baseText('agents.chat.approval.title');
	}
	const { toolName, args } = item.toolCall;
	const action = typeof args?.action === 'string' ? args.action : undefined;
	const keyBase = action
		? `instanceAi.tools.${toolName}.${action}`
		: `instanceAi.tools.${toolName}`;
	const resourceName = item.toolCall.confirmation.resourceName;
	if (resourceName) {
		const namedKey = approvalTitleKeys.get(`${keyBase}.imperativeWithResource`);
		if (namedKey) {
			const namedPhrase = i18n.baseText(namedKey);
			return i18n.baseText('instanceAi.confirmation.resourcePrompt', {
				interpolate: { action: namedPhrase, name: resourceName },
			});
		}
	}
	const imperativeKey = approvalTitleKeys.get(`${keyBase}.imperative`);
	if (imperativeKey) {
		const phrase = i18n.baseText(imperativeKey);
		return i18n.baseText('instanceAi.confirmation.allowPrompt', {
			interpolate: { action: phrase },
		});
	}
	return getToolLabel(toolName, args);
}

/** Show the full change summary. Resource names and values can contain question marks, so never trim at one. */
function buildApprovalSubtitle(item: PendingConfirmationItem): string {
	const credentialDestination = item.toolCall.confirmation.credentialDestination;
	if (credentialDestination) {
		const [nodeName] = credentialDestination.nodeNames;
		if (credentialDestination.nodeNames.length === 1 && nodeName) {
			return i18n.baseText('instanceAi.confirmation.credentialDestination.description', {
				interpolate: { nodeName },
			});
		}
		return i18n.baseText('instanceAi.confirmation.credentialDestination.descriptionMultiple', {
			interpolate: { nodeNames: credentialDestination.nodeNames.join(', ') },
		});
	}
	const targetApproval = item.toolCall.confirmation.targetApproval;
	if (targetApproval) {
		return i18n.baseText('agents.chat.approval.description', {
			interpolate: { toolName: targetApproval.displayName ?? targetApproval.toolName },
		});
	}
	const details = item.toolCall.confirmation.approvalDetails;
	return details ? formatApprovalDetails(details) : (item.toolCall.confirmation.message ?? '');
}

function canAlwaysAllow(item: PendingConfirmationItem): boolean {
	const conf = item.toolCall.confirmation;
	// Workflow edits must be scoped to a workflow ID — never offer a session grant
	// that would collapse to a blanket tool key.
	return (
		!isDestructive(item) &&
		!conf.targetApproval &&
		!conf.credentialDestination &&
		thread.canAlwaysAllow(item.toolCall.toolName, item.toolCall.args ?? {}, conf.workflowId)
	);
}

function credentialDestinationOptions(item: PendingConfirmationItem): ApprovalOption[] | undefined {
	if (!item.toolCall.confirmation.credentialDestination) return undefined;
	return [
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
	];
}

function handleApprovalSelect(item: PendingConfirmationItem, key: string) {
	switch (key) {
		case 'always-allow':
			void handleAlwaysAllow(item);
			return;
		case 'allow-once':
			void handleConfirm(item, true);
			return;
		case 'deny':
			void handleConfirm(item, false);
	}
}

// Text input state per requestId
const textInputValues = ref<Record<string, string>>({});

// In-flight guard so a double-click or repeated Enter while the first POST
// is still pending doesn't fire a second request for the same requestId.
// `resolvedConfirmationIds` is only updated *after* the await, so we need
// our own synchronous lock for the window in between.
const inFlightConfirmations = new Set<string>();

async function handleConfirm(item: PendingConfirmationItem, approved: boolean) {
	const conf = item.toolCall.confirmation;
	if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
	if (inFlightConfirmations.has(conf.requestId)) return;
	inFlightConfirmations.add(conf.requestId);
	try {
		// Await the POST first so a network failure leaves the card visible and
		// the backend's wait state intact — matches the auto-approve watcher
		// behaviour. `confirmAction` already surfaces a toast on failure.
		const credentialDestination = conf.credentialDestination;
		const payload: InstanceAiConfirmRequest = credentialDestination
			? {
					kind: 'credentialDestination',
					approved,
					origin: credentialDestination.origin,
				}
			: { kind: 'approval', approved };
		const ok = await thread.confirmAction(conf.requestId, payload);
		if (!ok) return;
		const alwaysAllowAvailable = canAlwaysAllow(item);
		trackInputCompleted(
			conf,
			[
				{
					label: conf.message,
					options: alwaysAllowAvailable
						? ['approve', 'deny', 'approve_always']
						: ['approve', 'deny'],
					option_chosen: approved ? 'approve' : 'deny',
				},
			],
			[],
		);
		thread.resolveConfirmation(conf.requestId, approved ? 'approved' : 'denied');
	} finally {
		inFlightConfirmations.delete(conf.requestId);
	}
}

async function handleAlwaysAllow(item: PendingConfirmationItem) {
	const conf = item.toolCall.confirmation;
	if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
	if (inFlightConfirmations.has(conf.requestId)) return;
	inFlightConfirmations.add(conf.requestId);
	try {
		// Confirm with the backend before granting the session-allow key — a
		// failed POST would otherwise hide the card while the backend keeps
		// waiting, AND seed an auto-approve key the watcher would use to
		// silently approve later matching confirmations.
		const ok = await thread.confirmAction(conf.requestId, {
			kind: 'approval',
			approved: true,
			scope: 'session',
		});
		if (!ok) return;
		thread.addAlwaysAllowKey(item.toolCall.toolName, item.toolCall.args ?? {}, conf.workflowId);
		trackInputCompleted(
			conf,
			[
				{
					label: conf.message,
					options: ['approve', 'deny', 'approve_always'],
					option_chosen: 'approve_always',
				},
			],
			[],
		);
		thread.resolveConfirmation(conf.requestId, 'approved');
	} finally {
		inFlightConfirmations.delete(conf.requestId);
	}
}

function handleTextSubmit(conf: InstanceAiConfirmation) {
	const value = (textInputValues.value[conf.requestId] ?? '').trim();
	if (!value) return;
	trackInputCompleted(
		conf,
		[
			{
				label: conf.message,
				question: conf.message,
				input_type: 'text',
				options: [],
				option_chosen: value,
			},
		],
		[],
	);
	thread.resolveConfirmation(conf.requestId, 'approved');
	void thread.confirmAction(conf.requestId, { kind: 'approval', approved: true, userInput: value });
}

function handleTextSkip(conf: InstanceAiConfirmation) {
	trackInputCompleted(
		conf,
		[],
		[{ label: conf.message, question: conf.message, input_type: 'text', options: [] }],
	);
	thread.resolveConfirmation(conf.requestId, 'deferred');
	void thread.confirmAction(conf.requestId, { kind: 'approval', approved: false });
}

async function settleTestListener(
	conf: InstanceAiConfirmation,
	outcome: { approved: boolean; executionId?: string; fromPush?: boolean },
) {
	if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
	if (inFlightConfirmations.has(conf.requestId)) return;
	inFlightConfirmations.add(conf.requestId);
	try {
		const { approved, executionId } = outcome;
		// Await the POST first: a failed request keeps the card visible so the user can
		// retry or cancel while the tool waits. `confirmAction` shows a toast on failure.
		const ok = await thread.confirmAction(conf.requestId, {
			kind: 'approval',
			approved,
			...(executionId ? { userInput: executionId } : {}),
		});
		if (!ok) return;
		// A push event settles the card without a user choice, so it records no input.
		if (!outcome.fromPush) {
			trackInputCompleted(
				conf,
				[
					{
						label: conf.message,
						options: ['sent', 'cancel'],
						option_chosen: approved ? 'sent' : 'cancel',
					},
				],
				[],
			);
		}
		thread.resolveConfirmation(conf.requestId, approved ? 'approved' : 'denied');
	} finally {
		inFlightConfirmations.delete(conf.requestId);
	}
}

// The backend pushes `testWebhookReceived` / `testWebhookDeleted` for the armed
// workflow. Settle the card from them so the assistant reads the outcome without
// a click. `approved: true` only means "not cancelled by the user": the tool reads
// received / timed out from durable state (executions, registration), so a
// deletion push at the deadline still resolves as timed out.
const removePushListener = usePushConnectionStore().addEventListener((event) => {
	if (event.type !== 'testWebhookReceived' && event.type !== 'testWebhookDeleted') return;
	for (const item of thread.pendingConfirmations) {
		const conf = item.toolCall.confirmation;
		if (conf?.testListener?.workflowId !== event.data.workflowId) continue;
		void settleTestListener(conf, {
			approved: true,
			executionId: event.type === 'testWebhookReceived' ? event.data.executionId : undefined,
			fromPush: true,
		});
	}
});
onBeforeUnmount(removePushListener);

function formatDeadline(iso: string): string {
	return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function handleContinue(conf: InstanceAiConfirmation) {
	if (thread.resolvedConfirmationIds.has(conf.requestId)) return;
	trackInputCompleted(
		conf,
		[{ label: conf.message, options: ['continue'], option_chosen: 'continue' }],
		[],
	);
	thread.resolveConfirmation(conf.requestId, 'approved');
	void thread.confirmAction(conf.requestId, { kind: 'approval', approved: true });
}

function handleQuestionsSubmit(conf: InstanceAiConfirmation, answers: QuestionAnswer[]) {
	const questionsById = new Map((conf.questions ?? []).map((q) => [q.id, q]));
	const provided: Array<{
		label: string;
		question: string;
		input_type: string;
		options: string[];
		option_chosen: string | string[];
	}> = [];
	const skipped: Array<{ label: string; question: string; input_type: string; options: string[] }> =
		[];
	for (const answer of answers) {
		const questionDef = questionsById.get(answer.questionId);
		const allOptions = questionDef?.options ?? [];
		const inputType = questionDef?.type ?? 'text';

		if (answer.skipped) {
			skipped.push({
				label: answer.questionId,
				question: answer.question,
				input_type: inputType,
				options: allOptions,
			});
		} else {
			const isMulti = inputType === 'multi';
			const chosen: string | string[] = isMulti
				? [...answer.selectedOptions, ...(answer.customText ? [answer.customText] : [])]
				: answer.customText || answer.selectedOptions[0] || '';
			provided.push({
				label: answer.questionId,
				question: answer.question,
				input_type: inputType,
				options: allOptions,
				option_chosen: chosen,
			});
		}
	}
	trackInputCompleted(conf, provided, skipped, { num_tasks: answers.length });
	thread.resolveConfirmation(conf.requestId, 'approved');
	void thread.confirmAction(conf.requestId, { kind: 'questions', answers });
}
</script>

<template>
	<TransitionGroup name="confirmation-slide">
		<template v-for="chunk in chunks" :key="chunk.item.toolCall.confirmation.requestId">
			<!-- Structured questions replace the chat input like other floating confirmations. -->
			<InstanceAiQuestions
				v-if="
					chunk.type === 'floating' &&
					chunk.item.toolCall.confirmation.inputType === 'questions' &&
					chunk.item.toolCall.confirmation.questions
				"
				:key="'q-' + chunk.item.toolCall.confirmation.requestId"
				:questions="chunk.item.toolCall.confirmation.questions!"
				:intro-message="chunk.item.toolCall.confirmation.introMessage"
				@submit="(answers) => handleQuestionsSubmit(chunk.item.toolCall.confirmation, answers)"
			/>

			<!-- ============ Standalone items (no approval wrapper) ============ -->
			<template v-else-if="chunk.type === 'standalone'">
				<!-- Workflow setup -->
				<!-- Threads are project-bound: fall back to the thread's project so a
				     payload without projectId never degrades to the personal project. -->
				<InstanceAiWorkflowSetup
					v-if="chunk.item.toolCall.confirmation.setupRequests?.length"
					:key="'setup-' + chunk.item.toolCall.confirmation.requestId"
					:request-id="chunk.item.toolCall.confirmation.requestId"
					:setup-requests="chunk.item.toolCall.confirmation.setupRequests!"
					:project-id="chunk.item.toolCall.confirmation.projectId ?? thread.projectId"
					:credential-flow="chunk.item.toolCall.confirmation.credentialFlow"
					:workflow-id="chunk.item.toolCall.confirmation.workflowId"
				/>

				<!-- Credential setup -->
				<InstanceAiCredentialSetup
					v-else-if="chunk.item.toolCall.confirmation.credentialRequests?.length"
					:key="'cred-' + chunk.item.toolCall.confirmation.requestId"
					:request-id="chunk.item.toolCall.confirmation.requestId"
					:credential-requests="chunk.item.toolCall.confirmation.credentialRequests!"
					:message="chunk.item.toolCall.confirmation.message"
					:project-id="chunk.item.toolCall.confirmation.projectId ?? thread.projectId"
					:credential-flow="chunk.item.toolCall.confirmation.credentialFlow"
					:require-user-selection="chunk.item.toolCall.confirmation.requireUserSelection"
				/>

				<!-- Text input (ask-user) -->
				<div
					v-else-if="chunk.item.toolCall.confirmation.inputType === 'text'"
					:key="'text-' + chunk.item.toolCall.confirmation.requestId"
				>
					<N8nCard :class="$style.textCard">
						<N8nText tag="div">{{ chunk.item.toolCall.confirmation!.message }}</N8nText>
						<div :class="$style.textInputRow">
							<N8nInput
								v-model="textInputValues[chunk.item.toolCall.confirmation!.requestId]"
								type="text"
								size="small"
								:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
								@keydown.enter="handleTextSubmit(chunk.item.toolCall.confirmation)"
							/>
							<N8nButton
								v-if="!(textInputValues[chunk.item.toolCall.confirmation.requestId] ?? '').trim()"
								size="medium"
								variant="outline"
								@click="handleTextSkip(chunk.item.toolCall.confirmation)"
							>
								{{ i18n.baseText('instanceAi.askUser.skip') }}
							</N8nButton>
							<N8nButton
								size="medium"
								variant="solid"
								:disabled="
									!(textInputValues[chunk.item.toolCall.confirmation.requestId] ?? '').trim()
								"
								@click="handleTextSubmit(chunk.item.toolCall.confirmation)"
							>
								{{ i18n.baseText('instanceAi.askUser.submit') }}
							</N8nButton>
						</div>
					</N8nCard>
				</div>
				<!-- Continue (pause-for-user) — single-button acknowledgement -->
				<div
					v-else-if="chunk.item.toolCall.confirmation.inputType === 'continue'"
					:key="'continue-' + chunk.item.toolCall.confirmation.requestId"
				>
					<N8nCard :class="$style.textCard">
						<N8nText tag="div">{{ chunk.item.toolCall.confirmation!.message }}</N8nText>
						<div :class="$style.continueRow">
							<N8nButton
								data-test-id="instance-ai-panel-continue"
								size="medium"
								variant="solid"
								@click="handleContinue(chunk.item.toolCall.confirmation)"
							>
								{{ i18n.baseText('instanceAi.confirmation.continue') }}
							</N8nButton>
						</div>
					</N8nCard>
				</div>
				<!-- Test listener: the trigger's test URL is armed; settles on the push event or a click -->
				<div
					v-else-if="chunk.item.toolCall.confirmation.testListener"
					:key="'test-listener-' + chunk.item.toolCall.confirmation.requestId"
					data-test-id="instance-ai-test-listener"
				>
					<N8nCard :class="$style.textCard">
						<N8nText tag="div">{{ chunk.item.toolCall.confirmation.message }}</N8nText>
						<div
							v-for="trigger in chunk.item.toolCall.confirmation.testListener.triggers"
							:key="trigger.nodeName"
							:class="$style.testListenerUrl"
						>
							<N8nText tag="span" size="small" bold>{{ trigger.method }}</N8nText>
							<N8nText tag="code" size="small" data-test-id="instance-ai-test-listener-url">
								{{ trigger.url }}
							</N8nText>
						</div>
						<N8nText tag="div" size="small" color="text-light">
							{{
								i18n.baseText('instanceAi.testListener.deadline', {
									interpolate: {
										time: formatDeadline(chunk.item.toolCall.confirmation.testListener.deadlineAt),
									},
								})
							}}
						</N8nText>
						<div :class="$style.continueRow">
							<N8nButton
								data-test-id="instance-ai-test-listener-cancel"
								size="medium"
								variant="outline"
								@click="settleTestListener(chunk.item.toolCall.confirmation, { approved: false })"
							>
								{{ i18n.baseText('instanceAi.testListener.cancel') }}
							</N8nButton>
							<N8nButton
								data-test-id="instance-ai-test-listener-sent"
								size="medium"
								variant="solid"
								@click="settleTestListener(chunk.item.toolCall.confirmation, { approved: true })"
							>
								{{ i18n.baseText('instanceAi.testListener.sent') }}
							</N8nButton>
						</div>
					</N8nCard>
				</div>
				<!-- Resource-access decision (gateway permission mode) -->
				<GatewayResourceDecision
					v-else-if="
						chunk.item.toolCall.confirmation.inputType === 'resource-decision' &&
						chunk.item.toolCall.confirmation.resourceDecision
					"
					:key="'rd-' + chunk.item.toolCall.confirmation.requestId"
					data-test-id="instance-ai-gateway-confirmation-panel"
					:request-id="chunk.item.toolCall.confirmation.requestId"
					:resource="chunk.item.toolCall.confirmation.resourceDecision.resource"
					:description="chunk.item.toolCall.confirmation.resourceDecision.description"
					:options="chunk.item.toolCall.confirmation.resourceDecision.options"
				/>

				<!-- Chat-channel setup (agent-builder configure_channel) — presence-based -->
				<InstanceAiChannelSetup
					v-else-if="chunk.item.toolCall.confirmation.channelConfig"
					:key="'channel-' + chunk.item.toolCall.confirmation.requestId"
					:request-id="chunk.item.toolCall.confirmation.requestId"
					:integration-type="chunk.item.toolCall.confirmation.channelConfig.integrationType"
					:agent-id="chunk.item.toolCall.confirmation.channelConfig.agentId"
					:project-id="chunk.item.toolCall.confirmation.projectId ?? ''"
				/>
			</template>

			<DomainAccessApproval
				v-else-if="chunk.item.toolCall.confirmation.domainAccess"
				:key="'floating-' + chunk.item.toolCall.confirmation.requestId"
				data-test-id="instance-ai-confirmation-panel"
				:request-id="chunk.item.toolCall.confirmation.requestId"
				:url="chunk.item.toolCall.confirmation.domainAccess.url"
				:host="chunk.item.toolCall.confirmation.domainAccess.host"
				:severity="chunk.item.toolCall.confirmation.severity"
			/>

			<DomainAccessApproval
				v-else-if="chunk.item.toolCall.confirmation.webSearch"
				:key="'floating-' + chunk.item.toolCall.confirmation.requestId"
				data-test-id="instance-ai-confirmation-panel"
				:request-id="chunk.item.toolCall.confirmation.requestId"
				:query="chunk.item.toolCall.confirmation.webSearch.query"
				:severity="chunk.item.toolCall.confirmation.severity"
			/>

			<N8nApprovalCard
				v-else
				:key="'floating-' + chunk.item.toolCall.confirmation.requestId"
				data-test-id="instance-ai-confirmation-panel"
				:title="buildApprovalTitle(chunk.item)"
				:labels="approvalLabels"
				:description="buildApprovalSubtitle(chunk.item)"
				:args="chunk.item.toolCall.confirmation.targetApproval?.args"
				:description-label="i18n.baseText('instanceAi.confirmation.details')"
				:options="credentialDestinationOptions(chunk.item)"
				:supports-session-approval="canAlwaysAllow(chunk.item)"
				:destructive="isDestructive(chunk.item)"
				@select="(key) => handleApprovalSelect(chunk.item, key)"
			>
				<template
					v-if="
						settingsStore.isInstanceAiSetupPanelEnabled &&
						chunk.item.toolCall.confirmation.credentialDestination
					"
					#description
				>
					<N8nText tag="p" size="small" :class="$style.credentialDescription">
						{{ buildApprovalSubtitle(chunk.item) }}
					</N8nText>
				</template>
			</N8nApprovalCard>
		</template>
	</TransitionGroup>
</template>

<style lang="scss" module>
.credentialDescription {
	margin: 0;
	overflow-wrap: anywhere;
	word-break: normal;
}

.textInputRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.continueRow {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.testListenerUrl {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
	word-break: break-all;
	user-select: all;
}

.textCard {
	border: 0;
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
}
</style>

<style lang="scss">
.confirmation-slide-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.confirmation-slide-enter-active {
	transition: all var(--animation--duration--snappy) cubic-bezier(0.16, 1, 0.3, 1);
}

.confirmation-slide-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.confirmation-slide-leave-active {
	transition: all var(--animation--duration--snappy) var(--easing--ease-in);
}
</style>
