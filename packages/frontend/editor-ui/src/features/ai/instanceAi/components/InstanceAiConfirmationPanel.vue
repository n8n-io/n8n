<script lang="ts" setup>
import { N8nButton, N8nCard, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiConfirmation } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiStore, type PendingConfirmationItem } from '../instanceAi.store';
import ConfirmationFooter from './ConfirmationFooter.vue';
import DomainAccessApproval from './DomainAccessApproval.vue';
import GatewayResourceDecision from './GatewayResourceDecision.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';
import type { QuestionAnswer } from './InstanceAiQuestions.vue';
import InstanceAiQuestions from './InstanceAiQuestions.vue';
import InstanceAiWorkflowSetup from './InstanceAiWorkflowSetup.vue';
import ConfirmationPreview from './ConfirmationPreview.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';
import { getToolActionPhrase, getToolId, stripActionPrefix, useToolLabel } from '../toolLabels';

type ApprovalAction = 'allow_once' | 'always_allow';

const store = useInstanceAiStore();
const i18n = useI18n();
const rootStore = useRootStore();
const telemetry = useTelemetry();
const { getToolLabel } = useToolLabel();

function getConfirmationType(conf: InstanceAiConfirmation): string {
	if (conf.inputType) return conf.inputType;
	if (conf.setupRequests?.length) return 'setup';
	if (conf.credentialRequests?.length) return 'credential-setup';
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
		thread_id: store.currentThreadId,
		input_thread_id: conf.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		type: getConfirmationType(conf),
		provided_inputs: providedInputs,
		skipped_inputs: skippedInputs,
		...extra,
	};
	telemetry.track('User finished providing input', eventProps);
}

interface ApprovalWrappedGroup {
	type: 'approvalWrapped';
	agentId: string;
	role: string;
	items: PendingConfirmationItem[];
}

interface StandaloneChunk {
	type: 'standalone';
	item: PendingConfirmationItem;
}

type ConfirmationChunk = ApprovalWrappedGroup | StandaloneChunk;

/** Items that need the "Agent needs approval" wrapper (generic approvals, domain access). */
function isApprovalWrapped(item: PendingConfirmationItem): boolean {
	const conf = item.toolCall.confirmation;
	if (conf.domainAccess) return true;
	// Generic approval: no special fields and no inputType
	if (
		!conf.credentialRequests?.length &&
		!conf.setupRequests?.length &&
		!conf.inputType &&
		!conf.questions
	) {
		return true;
	}
	return false;
}

/**
 * Filter mode:
 *  - 'all' (default): render every chunk
 *  - 'floating': only approval-wrapped chunks (generic approvals + domain access).
 *    Used by the floating panel docked above the chat input.
 *  - 'inline': only standalone chunks (questions, plan-review, text input,
 *    setup, credential setup, gateway resource decision). Rendered in the
 *    regular message flow.
 */
const props = withDefaults(
	defineProps<{
		kind?: 'all' | 'floating' | 'inline';
	}>(),
	{ kind: 'all' },
);

/** Split confirmations into standalone items and approval-wrapped groups. */
const chunks = computed((): ConfirmationChunk[] => {
	const result: ConfirmationChunk[] = [];
	const wrappedByAgent = new Map<string, ApprovalWrappedGroup>();

	for (const item of store.pendingConfirmations) {
		if (isApprovalWrapped(item)) {
			if (props.kind === 'inline') continue;
			const key = item.agentNode.agentId;
			let group = wrappedByAgent.get(key);
			if (!group) {
				group = { type: 'approvalWrapped', agentId: key, role: item.agentNode.role, items: [] };
				wrappedByAgent.set(key, group);
			}
			group.items.push(item);
		} else {
			if (props.kind === 'floating') continue;
			result.push({ type: 'standalone', item });
		}
	}

	for (const group of wrappedByAgent.values()) {
		result.push(group);
	}

	return result;
});

// Text input state per requestId
const textInputValues = ref<Record<string, string>>({});

function handleConfirm(item: PendingConfirmationItem, approved: boolean) {
	const conf = item.toolCall.confirmation;
	if (store.resolvedConfirmationIds.has(conf.requestId)) return;
	trackInputCompleted(
		conf,
		[
			{
				label: conf.message,
				options: ['approve', 'deny', 'approve_always'],
				option_chosen: approved ? 'approve' : 'deny',
			},
		],
		[],
	);
	store.resolveConfirmation(conf.requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(conf.requestId, approved);
}

function handleApprove(item: PendingConfirmationItem, action: ApprovalAction) {
	const conf = item.toolCall.confirmation;
	if (store.resolvedConfirmationIds.has(conf.requestId)) return;
	if (action === 'always_allow') {
		store.addAlwaysAllowKey(item.toolCall.toolName, item.toolCall.args ?? {});
	}
	trackInputCompleted(
		conf,
		[
			{
				label: conf.message,
				options: ['approve', 'deny', 'approve_always'],
				option_chosen: action === 'always_allow' ? 'approve_always' : 'approve',
			},
		],
		[],
	);
	store.resolveConfirmation(conf.requestId, 'approved');
	void store.confirmAction(conf.requestId, true);
}

/**
 * Split a confirmation message into the action+artifact part (shown in the
 * monospace preview box) and any trailing commentary (shown as plain text
 * below the box). The split happens at the first "?" — the prevailing
 * convention in tool-emitted messages, e.g.
 *   `Delete data table "X"? This will permanently remove the table…`
 */
function splitConfirmationMessage(message: string): { headline: string; commentary: string } {
	const trimmed = message.trim();
	const qIdx = trimmed.indexOf('?');
	if (qIdx === -1) return { headline: trimmed, commentary: '' };
	return {
		headline: trimmed.slice(0, qIdx).trim(),
		commentary: trimmed.slice(qIdx + 1).trim(),
	};
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
	store.resolveConfirmation(conf.requestId, 'approved');
	void store.confirmAction(conf.requestId, true, undefined, undefined, undefined, value);
}

function handleTextSkip(conf: InstanceAiConfirmation) {
	trackInputCompleted(
		conf,
		[],
		[{ label: conf.message, question: conf.message, input_type: 'text', options: [] }],
	);
	store.resolveConfirmation(conf.requestId, 'deferred');
	void store.confirmAction(conf.requestId, false);
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
	store.resolveConfirmation(conf.requestId, 'approved');
	void store.confirmAction(
		conf.requestId,
		true,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		answers,
	);
}

function handlePlanApprove(conf: InstanceAiConfirmation, numTasks: number) {
	trackInputCompleted(
		conf,
		[{ label: 'plan', options: ['approve', 'request-changes'], option_chosen: 'approve' }],
		[],
		{ num_tasks: numTasks },
	);
	store.resolveConfirmation(conf.requestId, 'approved');
	void store.confirmAction(conf.requestId, true);
}

function handlePlanRequestChanges(
	conf: InstanceAiConfirmation,
	feedback: string,
	numTasks: number,
) {
	trackInputCompleted(
		conf,
		[{ label: 'plan', options: ['approve', 'request-changes'], option_chosen: 'request-changes' }],
		[],
		{ num_tasks: numTasks, feedback },
	);
	store.resolveConfirmation(conf.requestId, 'denied');
	void store.confirmAction(conf.requestId, false, undefined, undefined, undefined, feedback);
}
</script>

<template>
	<TransitionGroup :name="kind === 'floating' ? 'confirmation-scale' : 'confirmation-slide'">
		<template
			v-for="chunk in chunks"
			:key="
				chunk.type === 'approvalWrapped'
					? 'group-' + chunk.agentId
					: chunk.item.toolCall.confirmation.requestId
			"
		>
			<!-- ============ Standalone items (no approval wrapper) ============ -->
			<template v-if="chunk.type === 'standalone'">
				<!-- Workflow setup -->
				<InstanceAiWorkflowSetup
					v-if="chunk.item.toolCall.confirmation.setupRequests?.length"
					:key="'setup-' + chunk.item.toolCall.confirmation.requestId"
					:class="$style.confirmation"
					:request-id="chunk.item.toolCall.confirmation.requestId"
					:setup-requests="chunk.item.toolCall.confirmation.setupRequests!"
					:workflow-id="chunk.item.toolCall.confirmation.workflowId ?? ''"
					:message="chunk.item.toolCall.confirmation.message"
					:project-id="chunk.item.toolCall.confirmation.projectId"
					:credential-flow="chunk.item.toolCall.confirmation.credentialFlow"
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
					@request-changes="
						(feedback) =>
							handlePlanRequestChanges(
								chunk.item.toolCall.confirmation,
								feedback,
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
			</template>

			<!-- ============ Approval-wrapped group ============ -->
			<div
				v-else
				:key="'group-' + chunk.agentId"
				:class="[$style.confirmation, $style.stack]"
				:style="{ '--stack-size': chunk.items.length }"
				data-test-id="instance-ai-confirmation-panel"
			>
				<!-- Items render as a stack: only the top one is fully visible;
					 subsequent items peek out from below. -->
				<div :class="$style.items">
					<div
						v-for="(item, idx) in chunk.items"
						:key="item.toolCall.confirmation.requestId"
						:class="[$style.item, $style.root, $style.stackedItem]"
						:style="{ '--stack-depth': idx, zIndex: chunk.items.length - idx }"
					>
						<!-- Domain access -->
						<DomainAccessApproval
							v-if="item.toolCall.confirmation.domainAccess"
							:request-id="item.toolCall.confirmation.requestId"
							:url="item.toolCall.confirmation.domainAccess!.url"
							:host="item.toolCall.confirmation.domainAccess!.host"
							:severity="item.toolCall.confirmation.severity"
						/>

						<!-- Generic approval -->
						<div v-else>
							<div :class="$style.approvalRow">
								<div :class="$style.approvalRowBody">
									<N8nText size="large" bold>
										{{
											i18n.baseText('instanceAi.confirmation.allowPrompt', {
												interpolate: {
													action:
														getToolActionPhrase(item.toolCall.toolName, item.toolCall.args) ??
														getToolLabel(item.toolCall.toolName, item.toolCall.args),
												},
											})
										}}
									</N8nText>
									<ConfirmationPreview
										:tool="getToolId(item.toolCall.toolName, item.toolCall.args)"
									>
										{{
											stripActionPrefix(
												splitConfirmationMessage(item.toolCall.confirmation!.message).headline,
												getToolActionPhrase(item.toolCall.toolName, item.toolCall.args),
											)
										}}
									</ConfirmationPreview>
									<N8nText
										v-if="splitConfirmationMessage(item.toolCall.confirmation!.message).commentary"
										:class="$style.commentary"
										size="small"
									>
										{{ splitConfirmationMessage(item.toolCall.confirmation!.message).commentary }}
									</N8nText>
								</div>

								<ConfirmationFooter layout="row-between">
									<N8nButton
										data-test-id="instance-ai-panel-confirm-deny"
										size="medium"
										variant="outline"
										@click="handleConfirm(item, false)"
									>
										{{ i18n.baseText('instanceAi.confirmation.deny') }}
									</N8nButton>
									<div :class="$style.approveGroup">
										<N8nButton
											v-if="item.toolCall.confirmation.severity !== 'destructive'"
											variant="outline"
											size="medium"
											data-test-id="instance-ai-panel-confirm-always-allow"
											@click="handleApprove(item, 'always_allow')"
										>
											{{ i18n.baseText('instanceAi.confirmation.alwaysAllow') }}
										</N8nButton>
										<N8nButton
											:variant="
												item.toolCall.confirmation.severity === 'destructive'
													? 'destructive'
													: 'solid'
											"
											data-test-id="instance-ai-panel-confirm-approve"
											size="medium"
											@click="handleApprove(item, 'allow_once')"
										>
											{{ i18n.baseText('instanceAi.confirmation.approve') }}
										</N8nButton>
									</div>
								</ConfirmationFooter>
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
	width: 100%;
}

.root {
	border: 1px solid light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	border-radius: var(--radius--xl);
	background-color: var(--color--background--light-3);
	box-shadow: var(--shadow--sm);
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

.itemBordered {
	// Only applies when there are multiple items — visual grouping
}

// --- Stacked-card layout for grouped approvals ---
// Top item (idx=0) sits in front; subsequent items shift up behind it,
// each slightly inset on the sides, so only their top edge peeks out
// above the front card.
.stack {
	position: relative;
	// Reserve space at the top for cards peeking out above the front (8px each).
	padding-top: calc((var(--stack-size, 1) - 1) * 8px);
}

.stack .items {
	position: relative;
}

.stackedItem {
	transition: transform 200ms ease;

	&:not(:first-child) {
		position: absolute;
		top: 0;
		// Inset the behind cards by 4px per depth so they look "smaller"
		// without using transform: scale (which complicates positioning).
		left: calc(var(--stack-depth, 0) * 4px);
		right: calc(var(--stack-depth, 0) * 4px);
		// Each behind card shifts up 8px per depth so its top edge peeks.
		transform: translateY(calc(var(--stack-depth, 0) * -8px));
	}
}

.approvalRow {
	display: flex;
	flex-direction: column;
	font-size: var(--font-size--2xs);
}

.approvalRowBody {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.commentary {
	color: var(--text-color--subtle);
}

.approveGroup {
	display: flex;
	gap: var(--spacing--2xs);
}

.textInputRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}

.generic {
	padding: var(--spacing--sm);
	border-bottom: var(--border);
	display: flex;
	align-items: center;
	justify-content: space-between;
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

.confirmation-scale-enter-active {
	animation: confirmation-scale-enter 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.confirmation-scale-leave-active {
	animation: confirmation-scale-leave 125ms cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
}

@keyframes confirmation-scale-enter {
	from {
		opacity: 0;
		transform: scale(0.95);
	}

	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes confirmation-scale-leave {
	from {
		opacity: 1;
		transform: scale(1);
	}

	to {
		opacity: 0;
		transform: scale(0.95);
	}
}
</style>
