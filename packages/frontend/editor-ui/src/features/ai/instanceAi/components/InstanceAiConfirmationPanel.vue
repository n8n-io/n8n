<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore, type PendingConfirmationItem } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';
import DomainAccessApproval from './DomainAccessApproval.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';
import InstanceAiWorkflowSetup from './InstanceAiWorkflowSetup.vue';
import InstanceAiQuestions from './InstanceAiQuestions.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';
import type { QuestionAnswer } from './InstanceAiQuestions.vue';

const store = useInstanceAiStore();
const i18n = useI18n();
const { getToolLabel } = useToolLabel();

const ROLE_LABELS: Record<string, string> = {
	orchestrator: 'Agent',
	'workflow-builder': 'Workflow Builder',
	'data-table-manager': 'Data Table Manager',
	researcher: 'Researcher',
};

function getRoleLabel(role: string): string {
	return ROLE_LABELS[role] ?? role;
}

function getSeverityIcon(severity?: string): IconName {
	if (severity === 'destructive') return 'triangle-alert';
	if (severity === 'warning') return 'triangle-alert';
	return 'info';
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
	const conf = item.toolCall.confirmation!;
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

function handleConfirm(requestId: string, approved: boolean) {
	if (store.resolvedConfirmationIds.has(requestId)) return;
	store.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(requestId, approved);
}

function handleApproveAll(items: PendingConfirmationItem[]) {
	for (const item of items) {
		const rid = item.toolCall.confirmation!.requestId;
		if (store.resolvedConfirmationIds.has(rid)) continue;
		store.resolveConfirmation(rid, 'approved');
		void store.confirmAction(rid, true);
	}
}

function handleTextSubmit(requestId: string) {
	const value = (textInputValues.value[requestId] ?? '').trim();
	if (!value) return;
	store.resolveConfirmation(requestId, 'approved');
	void store.confirmAction(requestId, true, undefined, undefined, undefined, value);
}

function handleTextSkip(requestId: string) {
	store.resolveConfirmation(requestId, 'deferred');
	void store.confirmAction(requestId, false);
}

function handleQuestionsSubmit(requestId: string, answers: QuestionAnswer[]) {
	store.resolveConfirmation(requestId, 'approved');
	void store.confirmAction(
		requestId,
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

function handlePlanApprove(requestId: string) {
	store.resolveConfirmation(requestId, 'approved');
	void store.confirmAction(requestId, true);
}

function handlePlanRequestChanges(requestId: string, feedback: string) {
	store.resolveConfirmation(requestId, 'denied');
	void store.confirmAction(requestId, false, undefined, undefined, undefined, feedback);
}

/** True when every item in the approval-wrapped group is a generic approval (not domain access). */
function isAllGenericApproval(items: PendingConfirmationItem[]): boolean {
	return items.every((item) => !item.toolCall.confirmation!.domainAccess);
}
</script>

<template>
	<TransitionGroup name="confirmation-slide">
		<template
			v-for="chunk in chunks"
			:key="
				chunk.type === 'approvalWrapped'
					? 'group-' + chunk.agentId
					: chunk.item.toolCall.confirmation!.requestId
			"
		>
			<!-- ============ Standalone items (no approval wrapper) ============ -->
			<template v-if="chunk.type === 'standalone'">
				<!-- Workflow setup -->
				<div
					v-if="chunk.item.toolCall.confirmation!.setupRequests?.length"
					:key="'setup-' + chunk.item.toolCall.confirmation!.requestId"
					:class="$style.standalone"
				>
					<InstanceAiWorkflowSetup
						:request-id="chunk.item.toolCall.confirmation!.requestId"
						:setup-requests="chunk.item.toolCall.confirmation!.setupRequests!"
						:workflow-id="chunk.item.toolCall.confirmation!.workflowId ?? ''"
						:message="chunk.item.toolCall.confirmation!.message"
						:project-id="chunk.item.toolCall.confirmation!.projectId"
						:credential-flow="chunk.item.toolCall.confirmation!.credentialFlow"
					/>
				</div>

				<!-- Credential setup -->
				<div
					v-else-if="chunk.item.toolCall.confirmation!.credentialRequests?.length"
					:key="'cred-' + chunk.item.toolCall.confirmation!.requestId"
					:class="$style.standalone"
				>
					<InstanceAiCredentialSetup
						:request-id="chunk.item.toolCall.confirmation!.requestId"
						:credential-requests="chunk.item.toolCall.confirmation!.credentialRequests!"
						:message="chunk.item.toolCall.confirmation!.message"
						:project-id="chunk.item.toolCall.confirmation!.projectId"
						:credential-flow="chunk.item.toolCall.confirmation!.credentialFlow"
					/>
				</div>

				<!-- Structured questions -->
				<div
					v-else-if="
						chunk.item.toolCall.confirmation!.inputType === 'questions' &&
						chunk.item.toolCall.confirmation!.questions
					"
					:key="'q-' + chunk.item.toolCall.confirmation!.requestId"
					:class="$style.standalone"
				>
					<InstanceAiQuestions
						:questions="chunk.item.toolCall.confirmation!.questions!"
						:intro-message="chunk.item.toolCall.confirmation!.introMessage"
						@submit="
							(answers) =>
								handleQuestionsSubmit(chunk.item.toolCall.confirmation!.requestId, answers)
						"
					/>
				</div>

				<!-- Plan review -->
				<div
					v-else-if="chunk.item.toolCall.confirmation!.inputType === 'plan-review'"
					:key="'plan-' + chunk.item.toolCall.confirmation!.requestId"
					:class="$style.standalone"
				>
					<PlanReviewPanel
						:planned-tasks="(chunk.item.toolCall.args?.tasks as PlannedTaskArg[] | undefined) ?? []"
						:message="chunk.item.toolCall.confirmation!.message"
						@approve="handlePlanApprove(chunk.item.toolCall.confirmation!.requestId)"
						@request-changes="
							(feedback) =>
								handlePlanRequestChanges(chunk.item.toolCall.confirmation!.requestId, feedback)
						"
					/>
				</div>

				<!-- Text input (ask-user) -->
				<div
					v-else-if="chunk.item.toolCall.confirmation!.inputType === 'text'"
					:key="'text-' + chunk.item.toolCall.confirmation!.requestId"
					:class="$style.standalone"
				>
					<div :class="$style.confirmBody">
						<div :class="$style.confirmMessage">
							{{ chunk.item.toolCall.confirmation!.message }}
						</div>
						<div :class="$style.textInputRow">
							<input
								v-model="textInputValues[chunk.item.toolCall.confirmation!.requestId]"
								:class="$style.textInput"
								type="text"
								:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
								@keydown.enter="handleTextSubmit(chunk.item.toolCall.confirmation!.requestId)"
							/>
							<button
								v-if="!(textInputValues[chunk.item.toolCall.confirmation!.requestId] ?? '').trim()"
								:class="[$style.btn, $style.secondaryBtn]"
								@click="handleTextSkip(chunk.item.toolCall.confirmation!.requestId)"
							>
								{{ i18n.baseText('instanceAi.askUser.skip') }}
							</button>
							<button
								:class="[$style.btn, $style.approveBtn]"
								:disabled="
									!(textInputValues[chunk.item.toolCall.confirmation!.requestId] ?? '').trim()
								"
								@click="handleTextSubmit(chunk.item.toolCall.confirmation!.requestId)"
							>
								{{ i18n.baseText('instanceAi.askUser.submit') }}
							</button>
						</div>
					</div>
				</div>
			</template>

			<!-- ============ Approval-wrapped group ============ -->
			<div
				v-else
				:key="'group-' + chunk.agentId"
				:class="$style.root"
				data-test-id="instance-ai-confirmation-panel"
			>
				<!-- Group header -->
				<div :class="$style.header">
					<N8nIcon icon="circle-pause" size="small" :class="$style.headerIcon" />
					<span :class="$style.headerLabel">
						{{
							i18n.baseText('instanceAi.confirmation.agentContext', {
								interpolate: { agent: getRoleLabel(chunk.role) },
							})
						}}
					</span>
					<button
						v-if="isAllGenericApproval(chunk.items) && chunk.items.length > 1"
						:class="[$style.btn, $style.approveBtn, $style.batchBtn]"
						@click="handleApproveAll(chunk.items)"
					>
						{{ i18n.baseText('instanceAi.confirmation.approveAll') }}
					</button>
				</div>

				<!-- Items -->
				<div :class="$style.items">
					<div
						v-for="item in chunk.items"
						:key="item.toolCall.confirmation!.requestId"
						:class="[$style.item, chunk.items.length > 1 ? $style.itemBordered : '']"
					>
						<!-- Domain access -->
						<DomainAccessApproval
							v-if="item.toolCall.confirmation!.domainAccess"
							:request-id="item.toolCall.confirmation!.requestId"
							:url="item.toolCall.confirmation!.domainAccess!.url"
							:host="item.toolCall.confirmation!.domainAccess!.host"
						/>

						<!-- Generic approval -->
						<div v-else :class="$style.confirmBody">
							<div :class="$style.approvalRow">
								<span :class="$style.toolLabel">
									<N8nIcon
										:icon="getSeverityIcon(item.toolCall.confirmation!.severity)"
										size="small"
										:class="[
											item.toolCall.confirmation!.severity === 'destructive'
												? $style.destructiveIcon
												: '',
											item.toolCall.confirmation!.severity === 'warning' ? $style.warningIcon : '',
											item.toolCall.confirmation!.severity === 'info' ? $style.infoIcon : '',
										]"
									/>
									{{ getToolLabel(item.toolCall.toolName) }}
								</span>
								<span :class="$style.approvalMessage">{{
									item.toolCall.confirmation!.message
								}}</span>
								<div :class="$style.approvalActions">
									<button
										:class="[$style.btn, $style.secondaryBtn]"
										data-test-id="instance-ai-panel-confirm-deny"
										@click="handleConfirm(item.toolCall.confirmation!.requestId, false)"
									>
										{{ i18n.baseText('instanceAi.confirmation.deny') }}
									</button>
									<button
										:class="[
											$style.btn,
											item.toolCall.confirmation!.severity === 'destructive'
												? $style.approveDestructiveBtn
												: $style.approveBtn,
										]"
										data-test-id="instance-ai-panel-confirm-approve"
										@click="handleConfirm(item.toolCall.confirmation!.requestId, true)"
									>
										{{ i18n.baseText('instanceAi.confirmation.approve') }}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</TransitionGroup>
</template>

<style lang="scss" module>
.standalone {
	margin-top: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
	max-width: 90%;
}

.root {
	margin-top: var(--spacing--xs);
	margin-bottom: var(--spacing--sm);
	max-width: 90%;
	border: 1px solid var(--color--warning--tint-1);
	border-radius: var(--radius--lg);
	background: var(--color--background);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--warning--tint-2);
}

.headerIcon {
	color: var(--color--warning);
	flex-shrink: 0;
}

.headerLabel {
	font-weight: var(--font-weight--bold);
	flex: 1;
	min-width: 0;
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

.confirmBody {
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.confirmMessage {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
}

.approvalRow {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
}

.toolLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-weight: var(--font-weight--bold);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	white-space: nowrap;
}

.approvalMessage {
	color: var(--color--text--tint-1);
	word-break: break-word;
}

.approvalActions {
	display: flex;
	gap: var(--spacing--4xs);
	justify-content: flex-end;
}

.destructiveIcon {
	color: var(--color--danger);
	flex-shrink: 0;
}

.warningIcon {
	color: var(--color--warning);
	flex-shrink: 0;
}

.infoIcon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.textInputRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.textInput {
	flex: 1;
	min-width: 0;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	background: var(--color--background);
	color: var(--color--text);
	outline: none;

	&:focus {
		border-color: var(--color--primary);
	}

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.btn {
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	cursor: pointer;
	border: var(--border);
	background: var(--color--background);
	color: var(--color--text);
	white-space: nowrap;

	&:hover {
		background: var(--color--background--shade-1);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.secondaryBtn {
	color: var(--color--text--tint-1);
	border-color: transparent;
	background: none;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.approveBtn {
	background: var(--color--primary);
	color: var(--button--color--text--primary);
	border-color: var(--color--primary);

	&:hover:not(:disabled) {
		background: var(--color--primary--shade-1);
	}
}

.approveDestructiveBtn {
	background: var(--color--danger);
	color: var(--button--color--text--primary);
	border-color: var(--color--danger);

	&:hover {
		background: var(--color--danger--shade-1);
	}
}

.batchBtn {
	margin-left: auto;
}
</style>

<style lang="scss">
.confirmation-slide-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.confirmation-slide-enter-active {
	transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.confirmation-slide-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

.confirmation-slide-leave-active {
	transition: all 0.2s ease-in;
}
</style>
