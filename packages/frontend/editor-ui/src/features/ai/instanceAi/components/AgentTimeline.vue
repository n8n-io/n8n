<script lang="ts" setup>
import { ref, computed } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	InstanceAiAgentNode,
	InstanceAiToolCallState,
	InstanceAiTimelineEntry,
} from '@n8n/api-types';
import InstanceAiToolCall from './InstanceAiToolCall.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';
import AgentNodeSection from './AgentNodeSection.vue';
import TaskChecklist from './TaskChecklist.vue';
import AnsweredQuestions from './AnsweredQuestions.vue';
import PlanReviewPanel, { type PlannedTaskArg } from './PlanReviewPanel.vue';
import DomainAccessApproval from './DomainAccessApproval.vue';
import InstanceAiCredentialSetup from './InstanceAiCredentialSetup.vue';
import InstanceAiWorkflowSetup from './InstanceAiWorkflowSetup.vue';
import InstanceAiQuestions from './InstanceAiQuestions.vue';
import type { QuestionAnswer } from './InstanceAiQuestions.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useToolLabel } from '../toolLabels';

const props = withDefaults(
	defineProps<{
		agentNode: InstanceAiAgentNode;
		compact?: boolean;
		entries?: InstanceAiTimelineEntry[];
		/** When true, pending confirmations render as a minimal indicator instead of full HITL UI. */
		suppressConfirmations?: boolean;
	}>(),
	{
		compact: false,
		entries: undefined,
		suppressConfirmations: false,
	},
);

defineSlots<{
	'after-tool-call'?: (props: { toolCall: InstanceAiToolCallState }) => unknown;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const { getToolLabel } = useToolLabel();

/** Use provided entries if available, otherwise iterate over agentNode.timeline. */
const timelineEntries = computed(() => props.entries ?? props.agentNode.timeline);

/** Index tool calls by ID for O(1) lookup and proper reactivity tracking. */
const toolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const tc of props.agentNode.toolCalls) {
		map[tc.toolCallId] = tc;
	}
	return map;
});

/** Index children by agentId for O(1) lookup and proper reactivity tracking. */
const childrenById = computed(() => {
	const map: Record<string, InstanceAiAgentNode> = {};
	for (const child of props.agentNode.children) {
		map[child.agentId] = child;
	}
	return map;
});

/** Check if a tool call has a pending confirmation (not plan-review, which renders separately). */
function isPendingConfirmation(tc: InstanceAiToolCallState): boolean {
	return !!(
		tc.confirmation &&
		tc.isLoading &&
		tc.confirmationStatus !== 'approved' &&
		tc.confirmationStatus !== 'denied' &&
		!store.resolvedConfirmationIds.has(tc.confirmation.requestId) &&
		tc.confirmation.inputType !== 'plan-review'
	);
}

function getSeverityIcon(severity?: string): IconName {
	if (severity === 'destructive') return 'triangle-alert';
	if (severity === 'warning') return 'triangle-alert';
	return 'info';
}

// --- Confirmation handlers ---

const textInputValues = ref<Record<string, string>>({});

function handleConfirm(requestId: string, approved: boolean) {
	store.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(requestId, approved);
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

function handlePlanConfirm(tc: InstanceAiToolCallState, approved: boolean, feedback?: string) {
	const requestId = tc.confirmation?.requestId;
	if (!requestId) return;
	store.resolveConfirmation(requestId, approved ? 'approved' : 'denied');
	void store.confirmAction(requestId, approved, undefined, undefined, undefined, feedback);
}
</script>

<template>
	<div :class="$style.timeline">
		<template v-for="(entry, idx) in timelineEntries" :key="idx">
			<!-- Text segment -->
			<div
				v-if="entry.type === 'text'"
				:class="[$style.textContent, props.compact && $style.compactText]"
			>
				<InstanceAiMarkdown :content="entry.content" />
			</div>

			<!-- Tool call -->
			<template v-else-if="entry.type === 'tool-call' && toolCallsById[entry.toolCallId]">
				<TaskChecklist
					v-if="toolCallsById[entry.toolCallId].renderHint === 'tasks'"
					:tasks="props.agentNode.tasks"
				/>
				<!-- Suppress delegate / builder / data-table / researcher render hints (handled by child agents) -->
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'delegate'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'builder'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'data-table'" />
				<template v-else-if="toolCallsById[entry.toolCallId].renderHint === 'researcher'" />
				<!-- Answered questions (read-only after resolution) -->
				<AnsweredQuestions
					v-else-if="
						toolCallsById[entry.toolCallId].confirmation?.inputType === 'questions' &&
						!toolCallsById[entry.toolCallId].isLoading
					"
					:tool-call="toolCallsById[entry.toolCallId]"
				/>
				<!-- Plan review: always render inline (interactive while pending, read-only after) -->
				<PlanReviewPanel
					v-else-if="toolCallsById[entry.toolCallId].confirmation?.inputType === 'plan-review'"
					:planned-tasks="
						(toolCallsById[entry.toolCallId].args?.tasks as PlannedTaskArg[] | undefined) ?? []
					"
					:read-only="!toolCallsById[entry.toolCallId].isLoading"
					@approve="handlePlanConfirm(toolCallsById[entry.toolCallId], true)"
					@request-changes="(fb) => handlePlanConfirm(toolCallsById[entry.toolCallId], false, fb)"
				/>

				<!-- Inline confirmations — suppressed when hoisted to top level -->
				<template v-else-if="isPendingConfirmation(toolCallsById[entry.toolCallId])">
					<!-- Suppressed: just show a waiting indicator -->
					<div v-if="props.suppressConfirmations" :class="$style.pendingIndicator">
						<N8nIcon icon="circle-pause" size="small" :class="$style.pendingIcon" />
						<span>{{ i18n.baseText('instanceAi.confirmation.pendingInline') }}</span>
					</div>

					<!-- Domain access -->
					<DomainAccessApproval
						v-else-if="toolCallsById[entry.toolCallId].confirmation!.domainAccess"
						:request-id="toolCallsById[entry.toolCallId].confirmation!.requestId"
						:url="toolCallsById[entry.toolCallId].confirmation!.domainAccess!.url"
						:host="toolCallsById[entry.toolCallId].confirmation!.domainAccess!.host"
					/>

					<!-- Workflow setup -->
					<InstanceAiWorkflowSetup
						v-else-if="
							toolCallsById[entry.toolCallId].confirmation!.setupRequests &&
							toolCallsById[entry.toolCallId].confirmation!.setupRequests!.length > 0
						"
						:request-id="toolCallsById[entry.toolCallId].confirmation!.requestId"
						:setup-requests="toolCallsById[entry.toolCallId].confirmation!.setupRequests!"
						:workflow-id="toolCallsById[entry.toolCallId].confirmation!.workflowId ?? ''"
						:message="toolCallsById[entry.toolCallId].confirmation!.message"
						:project-id="toolCallsById[entry.toolCallId].confirmation!.projectId"
						:credential-flow="toolCallsById[entry.toolCallId].confirmation!.credentialFlow"
					/>

					<!-- Credential setup -->
					<InstanceAiCredentialSetup
						v-else-if="
							toolCallsById[entry.toolCallId].confirmation!.credentialRequests &&
							toolCallsById[entry.toolCallId].confirmation!.credentialRequests!.length > 0
						"
						:request-id="toolCallsById[entry.toolCallId].confirmation!.requestId"
						:credential-requests="toolCallsById[entry.toolCallId].confirmation!.credentialRequests!"
						:message="toolCallsById[entry.toolCallId].confirmation!.message"
						:project-id="toolCallsById[entry.toolCallId].confirmation!.projectId"
						:credential-flow="toolCallsById[entry.toolCallId].confirmation!.credentialFlow"
					/>

					<!-- Structured questions -->
					<InstanceAiQuestions
						v-else-if="
							toolCallsById[entry.toolCallId].confirmation!.inputType === 'questions' &&
							toolCallsById[entry.toolCallId].confirmation!.questions
						"
						:questions="toolCallsById[entry.toolCallId].confirmation!.questions!"
						:intro-message="toolCallsById[entry.toolCallId].confirmation!.introMessage"
						@submit="
							(answers) =>
								handleQuestionsSubmit(
									toolCallsById[entry.toolCallId].confirmation!.requestId,
									answers,
								)
						"
					/>

					<!-- Text input -->
					<div
						v-else-if="toolCallsById[entry.toolCallId].confirmation!.inputType === 'text'"
						:class="$style.confirmBody"
					>
						<div :class="$style.confirmMessage">
							{{ toolCallsById[entry.toolCallId].confirmation!.message }}
						</div>
						<div :class="$style.textInputRow">
							<input
								v-model="textInputValues[toolCallsById[entry.toolCallId].confirmation!.requestId]"
								:class="$style.textInput"
								type="text"
								:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
								@keydown.enter="
									handleTextSubmit(toolCallsById[entry.toolCallId].confirmation!.requestId)
								"
							/>
							<button
								v-if="
									!(
										textInputValues[toolCallsById[entry.toolCallId].confirmation!.requestId] ?? ''
									).trim()
								"
								:class="[$style.btn, $style.secondaryBtn]"
								@click="handleTextSkip(toolCallsById[entry.toolCallId].confirmation!.requestId)"
							>
								{{ i18n.baseText('instanceAi.askUser.skip') }}
							</button>
							<button
								:class="[$style.btn, $style.approveBtn]"
								:disabled="
									!(
										textInputValues[toolCallsById[entry.toolCallId].confirmation!.requestId] ?? ''
									).trim()
								"
								@click="handleTextSubmit(toolCallsById[entry.toolCallId].confirmation!.requestId)"
							>
								{{ i18n.baseText('instanceAi.askUser.submit') }}
							</button>
						</div>
					</div>

					<!-- Generic approval -->
					<div v-else :class="$style.approvalRow">
						<N8nIcon
							:icon="getSeverityIcon(toolCallsById[entry.toolCallId].confirmation!.severity)"
							size="small"
							:class="[
								toolCallsById[entry.toolCallId].confirmation!.severity === 'destructive'
									? $style.destructiveIcon
									: '',
								toolCallsById[entry.toolCallId].confirmation!.severity === 'warning'
									? $style.warningIcon
									: '',
								toolCallsById[entry.toolCallId].confirmation!.severity === 'info'
									? $style.infoIcon
									: '',
							]"
						/>
						<span :class="$style.toolLabel">{{
							getToolLabel(toolCallsById[entry.toolCallId].toolName)
						}}</span>
						<span :class="$style.approvalMessage">{{
							toolCallsById[entry.toolCallId].confirmation!.message
						}}</span>
						<span :class="$style.approvalActions">
							<button
								:class="[$style.btn, $style.secondaryBtn]"
								data-test-id="instance-ai-inline-confirm-deny"
								@click="
									handleConfirm(toolCallsById[entry.toolCallId].confirmation!.requestId, false)
								"
							>
								{{ i18n.baseText('instanceAi.confirmation.deny') }}
							</button>
							<button
								:class="[
									$style.btn,
									toolCallsById[entry.toolCallId].confirmation!.severity === 'destructive'
										? $style.approveDestructiveBtn
										: $style.approveBtn,
								]"
								data-test-id="instance-ai-inline-confirm-approve"
								@click="
									handleConfirm(toolCallsById[entry.toolCallId].confirmation!.requestId, true)
								"
							>
								{{ i18n.baseText('instanceAi.confirmation.approve') }}
							</button>
						</span>
					</div>
				</template>

				<template v-else>
					<InstanceAiToolCall :tool-call="toolCallsById[entry.toolCallId]" />
					<slot name="after-tool-call" :tool-call="toolCallsById[entry.toolCallId]" />
				</template>
			</template>

			<!-- Child agent — all use unified AgentNodeSection -->
			<template v-else-if="entry.type === 'child' && childrenById[entry.agentId]">
				<AgentNodeSection :agent-node="childrenById[entry.agentId]" />
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.timeline {
	width: 100%;
}

.textContent {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color);
}

.compactText {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}

.pendingIndicator {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--warning);
}

.pendingIcon {
	color: var(--color--warning);
}

.confirmBody {
	padding: var(--spacing--2xs) 0;
}

.confirmMessage {
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	margin-bottom: var(--spacing--2xs);
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

.approvalRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	flex-wrap: wrap;
}

.toolLabel {
	font-weight: var(--font-weight--bold);
	font-family: monospace;
	font-size: var(--font-size--3xs);
	color: var(--color--text);
	white-space: nowrap;
}

.approvalMessage {
	color: var(--color--text--tint-1);
	flex: 1;
	min-width: 0;
}

.approvalActions {
	display: flex;
	gap: var(--spacing--4xs);
	margin-left: auto;
	flex-shrink: 0;
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
</style>
