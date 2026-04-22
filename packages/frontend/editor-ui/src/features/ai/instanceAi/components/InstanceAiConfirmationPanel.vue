<script lang="ts" setup>
import { N8nButton, N8nCard, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiConfirmation } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiStore, type PendingConfirmationItem } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';
import ConfirmationFooter from './ConfirmationFooter.vue';
import DomainAccessApproval from './DomainAccessApproval.vue';
import GatewayResourceDecision from './GatewayResourceDecision.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';
import type { QuestionAnswer } from './InstanceAiQuestions.vue';
import InstanceAiQuestions from './InstanceAiQuestions.vue';
import InstanceAiWorkflowSetup from './InstanceAiWorkflowSetup.vue';
import ConfirmationPreview from './ConfirmationPreview.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';

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

const ROLE_LABELS: Record<string, string> = {
	orchestrator: 'Agent',
	'workflow-builder': 'Workflow Builder',
	'data-table-manager': 'Data Table Manager',
	researcher: 'Researcher',
};

function getRoleLabel(role: string): string {
	return ROLE_LABELS[role] ?? role;
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

/** Split confirmations into standalone items and approval-wrapped groups. */
const chunks = computed((): ConfirmationChunk[] => {
	const result: ConfirmationChunk[] = [];
	const wrappedByAgent = new Map<string, ApprovalWrappedGroup>();

	for (const item of store.pendingConfirmations) {
		if (isApprovalWrapped(item)) {
			const key = item.agentNode.agentId;
			let group = wrappedByAgent.get(key);
			if (!group) {
				group = { type: 'approvalWrapped', agentId: key, role: item.agentNode.role, items: [] };
				wrappedByAgent.set(key, group);
			}
			group.items.push(item);
		} else {
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
				options: ['approve', 'deny'],
				option_chosen: approved ? 'approve' : 'deny',
			},
		],
		[],
	);
	store.resolveConfirmation(conf.requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(conf.requestId, approved);
}

function handleApproveAll(items: PendingConfirmationItem[]) {
	for (const item of items) {
		const conf = item.toolCall.confirmation;
		if (store.resolvedConfirmationIds.has(conf.requestId)) continue;
		trackInputCompleted(
			conf,
			[{ label: conf.message, options: ['approve', 'deny'], option_chosen: 'approve' }],
			[],
		);
		store.resolveConfirmation(conf.requestId, 'approved');
		void store.confirmAction(conf.requestId, true);
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

/** True when every item in the group is a generic approval (not domain/cred/text). */
function isAllGenericApproval(items: PendingConfirmationItem[]): boolean {
	return items.every((item) => !item.toolCall.confirmation.domainAccess);
}
</script>

<template>
	<TransitionGroup name="confirmation-slide">
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
				:class="[$style.root, $style.confirmation]"
				data-test-id="instance-ai-confirmation-panel"
			>
				<!-- Group header -->
				<template v-if="isAllGenericApproval(chunk.items) && chunk.items.length > 1">
					<div :class="$style.generic">
						<N8nText>
							{{
								i18n.baseText('instanceAi.confirmation.agentContext', {
									interpolate: { agent: getRoleLabel(chunk.role) },
								})
							}}
						</N8nText>
						<N8nButton
							data-test-id="instance-ai-panel-confirm-approve-all"
							size="medium"
							variant="subtle"
							@click="handleApproveAll(chunk.items)"
						>
							{{ i18n.baseText('instanceAi.confirmation.approveAll') }}
						</N8nButton>
					</div>
				</template>

				<!-- Items -->
				<div :class="$style.items">
					<div
						v-for="item in chunk.items"
						:key="item.toolCall.confirmation.requestId"
						:class="[$style.item, chunk.items.length > 1 ? $style.itemBordered : '']"
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
									<N8nText size="medium" bold>
										{{ getToolLabel(item.toolCall.toolName, item.toolCall.args) }}
									</N8nText>
									<ConfirmationPreview>{{
										item.toolCall.confirmation!.message
									}}</ConfirmationPreview>
								</div>

								<ConfirmationFooter>
									<N8nButton
										data-test-id="instance-ai-panel-confirm-deny"
										size="medium"
										variant="outline"
										@click="handleConfirm(item, false)"
									>
										{{ i18n.baseText('instanceAi.confirmation.deny') }}
									</N8nButton>
									<N8nButton
										:variant="
											item.toolCall.confirmation.severity === 'destructive'
												? 'destructive'
												: 'solid'
										"
										data-test-id="instance-ai-panel-confirm-approve"
										size="medium"
										@click="handleConfirm(item, true)"
									>
										{{ i18n.baseText('instanceAi.confirmation.approve') }}
									</N8nButton>
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
	max-width: 90%;
	width: 90%;
}

.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
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

.approvalRow {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
}

.approvalRowBody {
	padding: var(--spacing--sm) var(--spacing--sm) 0;
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
</style>
