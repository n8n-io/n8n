<script lang="ts" setup>
import { N8nButton, N8nCard, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { InstanceAiConfirmation } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useThread, type PendingConfirmationItem } from '../instanceAi.store';
import { isPendingItemFloating } from '../confirmationKinds';
import { useToolLabel } from '../toolLabels';
import ApprovalOptionList, { type ApprovalOption } from './ApprovalOptionList.vue';
import DomainAccessApproval from './DomainAccessApproval.vue';
import GatewayResourceDecision from './GatewayResourceDecision.vue';
import InstanceAiChannelSetup from './InstanceAiChannelSetup.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';
import type { QuestionAnswer } from './InstanceAiQuestions.vue';
import InstanceAiQuestions from './InstanceAiQuestions.vue';
import InstanceAiWorkflowSetup from '../workflowSetup/InstanceAiWorkflowSetup.vue';
import ConfirmationPreview from './ConfirmationPreview.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';

interface Props {
	/**
	 * Where this panel is mounted. The component renders different subsets of
	 * `pendingConfirmations` depending on this:
	 * - `inline`: full-form confirmations rendered in the chat flow (questions,
	 *   plan review, text, setup, credential, gateway resource-decision,
	 *   continue).
	 * - `floating`: single-click approvals and domain/web-search access, which
	 *   replace the chat input slot. Only the oldest pending item is rendered
	 *   at a time — no stacking.
	 */
	kind: 'inline' | 'floating';
}

const props = defineProps<Props>();

const thread = useThread();
const i18n = useI18n();
const rootStore = useRootStore();
const telemetry = useTelemetry();
const { getToolLabel } = useToolLabel();

function getConfirmationType(conf: InstanceAiConfirmation): string {
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
		type: getConfirmationType(conf),
		provided_inputs: providedInputs,
		skipped_inputs: skippedInputs,
		...extra,
	};
	telemetry.track('User finished providing input', eventProps);
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
 * - `inline`: every non-floating item (questions/plan/text/setup/etc.) in
 *   chronological order — these forms coexist comfortably in the chat
 *   flow.
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

function isDestructive(item: PendingConfirmationItem): boolean {
	return item.toolCall.confirmation.severity === 'destructive';
}

/**
 * Title for the floating approval. We resolve a short imperative phrase
 * (e.g. "archive workflow") via i18n keyed by the tool name and optional
 * action — `instanceAi.tools.{tool}.{action}.imperative`. When that key
 * exists we render the unified "Allow AI Assistant to {action}?" prompt;
 * otherwise we fall back to the tool's display label. Doing the lookup on
 * the frontend keeps the action phrase translatable without sending
 * English strings over the wire.
 */
function buildApprovalTitle(item: PendingConfirmationItem): string {
	const { toolName, args } = item.toolCall;
	const action = typeof args?.action === 'string' ? args.action : undefined;
	const imperativeKey = (
		action
			? `instanceAi.tools.${toolName}.${action}.imperative`
			: `instanceAi.tools.${toolName}.imperative`
	) as BaseTextKey;
	const phrase = i18n.baseText(imperativeKey);
	if (phrase !== imperativeKey) {
		return i18n.baseText('instanceAi.confirmation.allowPrompt', {
			interpolate: { action: phrase },
		});
	}
	return getToolLabel(toolName, args);
}

/**
 * Subtitle for the floating approval. Tools send a short resource line;
 * we still defensively trim at the first `?` so any legacy tool whose
 * message includes a trailing explanation doesn't bloat the card.
 */
function buildApprovalSubtitle(item: PendingConfirmationItem): string {
	const message = item.toolCall.confirmation.message ?? '';
	const idx = message.indexOf('?');
	return idx === -1 ? message : message.slice(0, idx + 1);
}

/**
 * Build the floating-approval option list. Destructive confirmations hide
 * "Always allow" — by design, irreversible actions must be opted into one
 * at a time.
 */
function buildApprovalOptions(item: PendingConfirmationItem): ApprovalOption[] {
	const destructive = isDestructive(item);
	const options: ApprovalOption[] = [];
	if (!destructive) {
		options.push({
			key: 'always-allow',
			icon: 'check-check',
			label: i18n.baseText('instanceAi.confirmation.alwaysAllow'),
			suffix: i18n.baseText('instanceAi.confirmation.alwaysAllowSuffix'),
			testId: 'instance-ai-panel-confirm-always-allow',
		});
	}
	options.push({
		key: 'allow-once',
		icon: 'check',
		label: i18n.baseText('instanceAi.confirmation.approve'),
		destructive,
		testId: 'instance-ai-panel-confirm-approve',
	});
	options.push({
		key: 'deny',
		icon: 'ban',
		label: i18n.baseText('instanceAi.confirmation.deny'),
		testId: 'instance-ai-panel-confirm-deny',
	});
	return options;
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
		const ok = await thread.confirmAction(conf.requestId, { kind: 'approval', approved });
		if (!ok) return;
		// "Always allow" is offered alongside Approve/Deny for non-destructive
		// generic approvals; include it in the option set so telemetry reflects
		// what the user actually chose between.
		const alwaysAllowAvailable = !isDestructive(item);
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
		thread.addAlwaysAllowKey(item.toolCall.toolName, item.toolCall.args ?? {});
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

const PLAN_REVIEW_OPTIONS = ['approve', 'ask-for-edits', 'deny'] as const;

function handlePlanApprove(conf: InstanceAiConfirmation, numTasks: number) {
	trackInputCompleted(
		conf,
		[{ label: 'plan', options: [...PLAN_REVIEW_OPTIONS], option_chosen: 'approve' }],
		[],
		{ num_tasks: numTasks, plan_feedback_type: 'accept' },
	);
	thread.resolveConfirmation(conf.requestId, 'approved');
	void thread.confirmAction(conf.requestId, { kind: 'approval', approved: true });
}

function handlePlanAskForEdits(conf: InstanceAiConfirmation, numTasks: number) {
	thread.startPlanEdit({
		requestId: conf.requestId,
		inputThreadId: conf.inputThreadId,
		taskCount: numTasks,
	});
}

function handlePlanDeny(conf: InstanceAiConfirmation, numTasks: number) {
	trackInputCompleted(
		conf,
		[{ label: 'plan', options: [...PLAN_REVIEW_OPTIONS], option_chosen: 'deny' }],
		[],
		{ num_tasks: numTasks, plan_feedback_type: 'deny' },
	);
	thread.resolveConfirmation(conf.requestId, 'denied');
	void thread.confirmAction(conf.requestId, { kind: 'planDeny' });
}
</script>

<template>
	<TransitionGroup name="confirmation-slide">
		<template v-for="chunk in chunks" :key="chunk.item.toolCall.confirmation.requestId">
			<!-- ============ Standalone items (no approval wrapper) ============ -->
			<template v-if="chunk.type === 'standalone'">
				<!-- Workflow setup -->
				<InstanceAiWorkflowSetup
					v-if="chunk.item.toolCall.confirmation.setupRequests?.length"
					:key="'setup-' + chunk.item.toolCall.confirmation.requestId"
					:class="$style.confirmation"
					:request-id="chunk.item.toolCall.confirmation.requestId"
					:setup-requests="chunk.item.toolCall.confirmation.setupRequests!"
					:project-id="chunk.item.toolCall.confirmation.projectId"
					:credential-flow="chunk.item.toolCall.confirmation.credentialFlow"
					:workflow-id="chunk.item.toolCall.confirmation.workflowId"
				/>

				<!-- Credential setup -->
				<InstanceAiCredentialSetup
					v-else-if="chunk.item.toolCall.confirmation.credentialRequests?.length"
					:key="'cred-' + chunk.item.toolCall.confirmation.requestId"
					:class="$style.confirmation"
					:request-id="chunk.item.toolCall.confirmation.requestId"
					:credential-requests="chunk.item.toolCall.confirmation.credentialRequests!"
					:message="chunk.item.toolCall.confirmation.message"
					:project-id="chunk.item.toolCall.confirmation.projectId"
					:credential-flow="chunk.item.toolCall.confirmation.credentialFlow"
				/>

				<!-- Structured questions -->
				<InstanceAiQuestions
					v-else-if="
						chunk.item.toolCall.confirmation.inputType === 'questions' &&
						chunk.item.toolCall.confirmation.questions
					"
					:key="'q-' + chunk.item.toolCall.confirmation.requestId"
					:class="$style.confirmation"
					:questions="chunk.item.toolCall.confirmation.questions!"
					:intro-message="chunk.item.toolCall.confirmation.introMessage"
					@submit="(answers) => handleQuestionsSubmit(chunk.item.toolCall.confirmation, answers)"
				/>

				<!-- Plan review -->
				<PlanReviewPanel
					v-else-if="chunk.item.toolCall.confirmation.inputType === 'plan-review'"
					:key="'plan-' + chunk.item.toolCall.confirmation.requestId"
					:class="$style.confirmation"
					:planned-tasks="
						chunk.item.toolCall.confirmation?.planItems ??
						(chunk.item.toolCall.args?.tasks as PlannedTaskArg[] | undefined) ??
						[]
					"
					:message="chunk.item.toolCall.confirmation.message"
					@approve="
						handlePlanApprove(
							chunk.item.toolCall.confirmation,
							((chunk.item.toolCall.args?.tasks as PlannedTaskArg[] | undefined) ?? []).length,
						)
					"
					@ask-for-edits="
						handlePlanAskForEdits(
							chunk.item.toolCall.confirmation,
							((chunk.item.toolCall.args?.tasks as PlannedTaskArg[] | undefined) ?? []).length,
						)
					"
					@deny="
						handlePlanDeny(
							chunk.item.toolCall.confirmation,
							((chunk.item.toolCall.args?.tasks as PlannedTaskArg[] | undefined) ?? []).length,
						)
					"
				/>

				<!-- Text input (ask-user) -->
				<div
					v-else-if="chunk.item.toolCall.confirmation.inputType === 'text'"
					:key="'text-' + chunk.item.toolCall.confirmation.requestId"
					:class="$style.confirmation"
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
					:class="$style.confirmation"
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
				<!-- Resource-access decision (gateway permission mode) -->
				<GatewayResourceDecision
					v-else-if="
						chunk.item.toolCall.confirmation.inputType === 'resource-decision' &&
						chunk.item.toolCall.confirmation.resourceDecision
					"
					:key="'rd-' + chunk.item.toolCall.confirmation.requestId"
					:class="$style.confirmation"
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

			<!-- ============ Floating approval ============ -->
			<div
				v-else
				:key="'floating-' + chunk.item.toolCall.confirmation.requestId"
				:class="[$style.root, $style.floatingRoot]"
				data-test-id="instance-ai-confirmation-panel"
			>
				<div :class="$style.items">
					<div :class="$style.item">
						<!-- Domain access -->
						<DomainAccessApproval
							v-if="chunk.item.toolCall.confirmation.domainAccess"
							:request-id="chunk.item.toolCall.confirmation.requestId"
							:url="chunk.item.toolCall.confirmation.domainAccess!.url"
							:host="chunk.item.toolCall.confirmation.domainAccess!.host"
							:severity="chunk.item.toolCall.confirmation.severity"
						/>

						<!-- Web search -->
						<DomainAccessApproval
							v-else-if="chunk.item.toolCall.confirmation.webSearch"
							:request-id="chunk.item.toolCall.confirmation.requestId"
							:query="chunk.item.toolCall.confirmation.webSearch!.query"
							:severity="chunk.item.toolCall.confirmation.severity"
						/>

						<!-- Generic approval -->
						<div v-else>
							<div :class="$style.approvalRow">
								<div :class="$style.approvalRowBody">
									<N8nText size="large" bold>
										{{ buildApprovalTitle(chunk.item) }}
									</N8nText>
									<ConfirmationPreview>{{ buildApprovalSubtitle(chunk.item) }}</ConfirmationPreview>
								</div>

								<ApprovalOptionList
									:options="buildApprovalOptions(chunk.item)"
									@select="(key) => handleApprovalSelect(chunk.item, key)"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</TransitionGroup>
</template>

<style lang="scss" module>
.confirmation {
	max-width: 90%;
	width: 90%;
}

.root {
	border: none;
	border-radius: var(--radius--xl);
	box-shadow:
		var(--shadow--sm),
		inset 0 0 0 1px light-dark(var(--color--black-alpha-100), var(--color--white-alpha-100));
	background-color: var(--background--surface);
}

.floatingRoot {
	// Fills the input-slot constraint width; no 90% reduction the inline
	// `.confirmation` class applies inside the message list.
	width: 100%;
	max-width: none;
}

.items {
	display: flex;
	flex-direction: column;
}

.item {
	& + & {
		border-top: var(--border);
	}
}

.approvalRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	font-size: var(--font-size--2xs);
}

.approvalRowBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
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
	margin-top: var(--spacing--2xs);
}

.textCard {
	background-color: var(--color--background--light-3);
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
