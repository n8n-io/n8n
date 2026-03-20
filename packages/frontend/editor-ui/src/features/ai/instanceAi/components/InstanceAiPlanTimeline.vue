<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type {
	InstanceAiAgentNode,
	InstanceAiPhaseSpec,
	InstanceAiPlanSpec,
	InstanceAiPlannerQuestion,
	InstanceAiQuestionResponse,
} from '@n8n/api-types';

import type { PlanMode } from '@/features/ai/assistant/assistant.types';
import PlanQuestionsMessage from '@/features/ai/assistant/components/Agent/PlanQuestionsMessage.vue';
import UserAnswersMessage from '@/features/ai/assistant/components/Agent/UserAnswersMessage.vue';

import { useInstanceAiStore } from '../instanceAi.store';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
	plan?: InstanceAiPlanSpec;
}>();

const i18n = useI18n();
const store = useInstanceAiStore();
const blockerAnswers = reactive<Record<string, string>>({});
const approvalFeedback = ref('');
const submittedRequestIds = reactive<Record<string, boolean>>({});

const plan = computed(() => props.plan ?? props.agentNode.plan ?? null);

const doneCount = computed(
	() => plan.value?.phases.filter((phase) => phase.status === 'done').length ?? 0,
);

const phaseCount = computed(() => plan.value?.phases.length ?? 0);

const hiddenPlanConfirmation = computed(() =>
	props.agentNode.toolCalls.find(
		(toolCall) =>
			toolCall.renderHint === 'plan' &&
			toolCall.isLoading &&
			toolCall.confirmation &&
			(!toolCall.confirmationStatus || toolCall.confirmationStatus === 'pending'),
	),
);

function toPlanModeQuestion(question: InstanceAiPlannerQuestion): PlanMode.PlannerQuestion {
	return {
		id: question.id,
		question: question.question,
		type: question.type,
		options: question.options,
	};
}

function hasQuestionAnswersResult(
	result: unknown,
): result is { answered?: boolean; answers: InstanceAiQuestionResponse[] } {
	if (!result || typeof result !== 'object' || !('answers' in result)) {
		return false;
	}

	return Array.isArray(Reflect.get(result, 'answers'));
}

const clarificationToolCall = computed(() => {
	const toolCall = hiddenPlanConfirmation.value;
	if (!toolCall || toolCall.confirmation?.inputType !== 'questions') {
		return null;
	}

	return toolCall;
});

const answeredClarificationToolCall = computed(() => {
	const reversedToolCalls = [...props.agentNode.toolCalls].reverse();

	return (
		reversedToolCalls.find(
			(toolCall) =>
				toolCall.renderHint === 'plan' &&
				toolCall.confirmation?.inputType === 'questions' &&
				hasQuestionAnswersResult(toolCall.result),
		) ?? null
	);
});

const approvalToolCall = computed(() => {
	const toolCall = hiddenPlanConfirmation.value;
	if (!toolCall || toolCall.confirmation?.inputType !== 'approval') {
		return null;
	}

	return toolCall;
});

const clarificationQuestions = computed<PlanMode.PlannerQuestion[]>(() =>
	(clarificationToolCall.value?.confirmation?.questions ?? []).map(toPlanModeQuestion),
);

const clarificationAnswers = computed<PlanMode.QuestionResponse[]>(() => {
	const result = answeredClarificationToolCall.value?.result;
	if (!hasQuestionAnswersResult(result)) {
		return [];
	}

	return result.answers.map((answer) => ({
		questionId: answer.questionId,
		question: answer.question,
		selectedOptions: answer.selectedOptions,
		customText: answer.customText ?? '',
		skipped: answer.skipped ?? false,
	}));
});

const showClarificationCard = computed(
	() => clarificationToolCall.value && clarificationQuestions.value.length > 0,
);

const showAnsweredClarificationCard = computed(
	() => !showClarificationCard.value && clarificationAnswers.value.length > 0,
);

const showApprovalCard = computed(() => !!approvalToolCall.value);

const canRequestChanges = computed(() => approvalFeedback.value.trim().length > 0);

const clarificationRequestId = computed(
	() => clarificationToolCall.value?.confirmation?.requestId ?? '',
);

const clarificationSummary = computed(
	() =>
		clarificationToolCall.value?.confirmation?.message ??
		i18n.baseText('node.theNodeIsWaitingUserInput'),
);

const clarificationIntroMessage = computed(
	() => clarificationToolCall.value?.confirmation?.introMessage,
);

const answeredClarificationMessage = computed(
	() =>
		answeredClarificationToolCall.value?.confirmation?.introMessage ??
		answeredClarificationToolCall.value?.confirmation?.message ??
		'',
);

const showClarificationSummary = computed(
	() => !clarificationIntroMessage.value && clarificationSummary.value.trim().length > 0,
);

const clarificationSubmitted = computed(
	() =>
		clarificationRequestId.value.length > 0 && !!submittedRequestIds[clarificationRequestId.value],
);

const approvalRequestId = computed(() => approvalToolCall.value?.confirmation?.requestId ?? '');

const approvalSummary = computed(() => {
	const defaultSummary = i18n.baseText('instanceAi.planTimeline.awaitingApproval');
	const summary = approvalToolCall.value?.confirmation?.message?.trim();
	const planSummary = plan.value?.summary.trim();

	if (!summary) {
		return defaultSummary;
	}

	if (summary.length > 220) {
		return defaultSummary;
	}

	if (
		planSummary &&
		(summary === planSummary || summary.includes(planSummary) || planSummary.includes(summary))
	) {
		return defaultSummary;
	}

	return summary;
});

const approvalSubmitted = computed(
	() => approvalRequestId.value.length > 0 && !!submittedRequestIds[approvalRequestId.value],
);

const statusLabelKey: Record<InstanceAiPlanSpec['status'], BaseTextKey> = {
	draft: 'instanceAi.planTimeline.status.draft',
	awaiting_approval: 'instanceAi.planTimeline.status.awaitingApproval',
	approved: 'instanceAi.planTimeline.status.approved',
	running: 'instanceAi.planTimeline.status.running',
	blocked: 'instanceAi.planTimeline.status.blocked',
	completed: 'instanceAi.planTimeline.status.completed',
};

const phaseStatusConfig: Record<
	InstanceAiPhaseSpec['status'],
	{ icon: IconName; className: string; labelKey: BaseTextKey; spin?: boolean }
> = {
	pending: {
		icon: 'circle',
		className: 'pendingIcon',
		labelKey: 'instanceAi.planTimeline.phase.pending',
	},
	ready: {
		icon: 'info',
		className: 'readyIcon',
		labelKey: 'instanceAi.planTimeline.phase.ready',
	},
	building: {
		icon: 'spinner',
		className: 'buildingIcon',
		labelKey: 'instanceAi.planTimeline.phase.building',
		spin: true,
	},
	verifying: {
		icon: 'info',
		className: 'verifyingIcon',
		labelKey: 'instanceAi.planTimeline.phase.verifying',
	},
	blocked: {
		icon: 'triangle-alert',
		className: 'blockedIcon',
		labelKey: 'instanceAi.planTimeline.phase.blocked',
	},
	done: {
		icon: 'check',
		className: 'doneIcon',
		labelKey: 'instanceAi.planTimeline.phase.done',
	},
	failed: {
		icon: 'x',
		className: 'failedIcon',
		labelKey: 'instanceAi.planTimeline.phase.failed',
	},
};

function toInstanceAiAnswers(answers: PlanMode.QuestionResponse[]): InstanceAiQuestionResponse[] {
	return answers.map((answer) => ({
		questionId: answer.questionId,
		question: answer.question,
		selectedOptions: answer.selectedOptions,
		customText: answer.customText,
		skipped: answer.skipped,
	}));
}

function phaseStatusLabel(phase: InstanceAiPhaseSpec): string {
	return i18n.baseText(phaseStatusConfig[phase.status].labelKey);
}

function markSubmitted(requestId: string): boolean {
	if (submittedRequestIds[requestId]) {
		return false;
	}

	submittedRequestIds[requestId] = true;
	return true;
}

function submitBlocker(phase: InstanceAiPhaseSpec) {
	const requestId = phase.blocker?.requestId;
	const value = blockerAnswers[phase.id]?.trim();
	if (!requestId || !value || !markSubmitted(requestId)) return;

	void store.confirmAction(requestId, true, undefined, undefined, undefined, value);
}

function skipBlocker(phase: InstanceAiPhaseSpec) {
	const requestId = phase.blocker?.requestId;
	if (!requestId || !markSubmitted(requestId)) return;

	void store.confirmAction(requestId, false);
}

function submitClarificationAnswers(answers: PlanMode.QuestionResponse[]) {
	const requestId = clarificationToolCall.value?.confirmation?.requestId;
	if (!requestId || !markSubmitted(requestId)) return;

	void store.confirmAction(
		requestId,
		true,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		toInstanceAiAnswers(answers),
	);
}

function approvePlan() {
	const requestId = approvalToolCall.value?.confirmation?.requestId;
	if (!requestId || !markSubmitted(requestId)) return;

	void store.confirmAction(requestId, true);
}

function requestPlanChanges() {
	const requestId = approvalToolCall.value?.confirmation?.requestId;
	const feedback = approvalFeedback.value.trim();
	if (!requestId || !feedback || !markSubmitted(requestId)) return;

	void store.confirmAction(requestId, false, undefined, undefined, undefined, feedback);
}

function statusSummary(planStatus: InstanceAiPlanSpec['status']): string {
	return i18n.baseText(statusLabelKey[planStatus]);
}
</script>

<template>
	<div
		v-if="plan || showClarificationCard || showAnsweredClarificationCard || showApprovalCard"
		:class="$style.root"
		data-test-id="instance-ai-plan-timeline"
	>
		<div
			v-if="showClarificationCard"
			:class="$style.requestCard"
			data-test-id="instance-ai-plan-questions"
		>
			<div :class="$style.requestHeader">
				<div :class="$style.requestTitle">
					<N8nIcon icon="messages-square" size="small" />
					<span>{{ i18n.baseText('instanceAi.planTimeline.questionsTitle') }}</span>
				</div>
				<span :class="$style.requestBadge">{{
					i18n.baseText('instanceAi.planTimeline.waitingForAnswers')
				}}</span>
			</div>
			<p v-if="showClarificationSummary" :class="$style.requestSummary">
				{{ clarificationSummary }}
			</p>
			<PlanQuestionsMessage
				:questions="clarificationQuestions"
				:intro-message="clarificationIntroMessage"
				:disabled="clarificationSubmitted"
				@submit="submitClarificationAnswers"
			/>
		</div>

		<div
			v-else-if="showAnsweredClarificationCard"
			:class="$style.requestCard"
			data-test-id="instance-ai-plan-answers"
		>
			<div :class="$style.requestHeader">
				<div :class="$style.requestTitle">
					<N8nIcon icon="messages-square" size="small" />
					<span>{{ i18n.baseText('instanceAi.planTimeline.questionsTitle') }}</span>
				</div>
				<span :class="$style.requestBadge">{{
					i18n.baseText('instanceAi.planTimeline.phase.done')
				}}</span>
			</div>
			<p v-if="answeredClarificationMessage" :class="$style.requestSummary">
				{{ answeredClarificationMessage }}
			</p>
			<UserAnswersMessage :answers="clarificationAnswers" />
		</div>

		<div v-if="plan" :class="$style.planCard">
			<div :class="$style.header">
				<div :class="$style.headerTitle">
					<N8nIcon icon="list-checks" size="small" />
					<div>
						<N8nText tag="h3" :bold="true">{{
							i18n.baseText('instanceAi.planTimeline.title')
						}}</N8nText>
						<N8nText size="small" color="text-light">{{ statusSummary(plan.status) }}</N8nText>
					</div>
				</div>
				<div :class="$style.headerMeta">
					<span :class="$style.statusBadge">
						{{ i18n.baseText(statusLabelKey[plan.status]) }}
					</span>
					<span :class="$style.progress">{{ doneCount }}/{{ phaseCount }}</span>
				</div>
			</div>

			<p :class="$style.summary">{{ plan.summary }}</p>

			<div :class="$style.metaGrid">
				<div v-if="plan.assumptions.length > 0" :class="$style.metaBlock">
					<span :class="$style.metaLabel">{{
						i18n.baseText('instanceAi.planTimeline.assumptions')
					}}</span>
					<ul :class="$style.metaList">
						<li v-for="assumption in plan.assumptions" :key="assumption">{{ assumption }}</li>
					</ul>
				</div>

				<div v-if="plan.acceptanceCriteria.length > 0" :class="$style.metaBlock">
					<span :class="$style.metaLabel">{{
						i18n.baseText('instanceAi.planTimeline.acceptanceCriteria')
					}}</span>
					<ul :class="$style.metaList">
						<li v-for="criterion in plan.acceptanceCriteria" :key="criterion">{{ criterion }}</li>
					</ul>
				</div>
			</div>

			<div :class="$style.phaseList">
				<div v-for="phase in plan.phases" :key="phase.id" :class="$style.phaseCard">
					<div :class="$style.phaseHeader">
						<div :class="$style.phaseTitle">
							<N8nIcon
								:icon="phaseStatusConfig[phase.status].icon"
								:class="$style[phaseStatusConfig[phase.status].className]"
								:spin="phaseStatusConfig[phase.status].spin ?? false"
								size="small"
							/>
							<span>{{ phase.title }}</span>
						</div>
						<span :class="$style.phaseBadge">{{ phaseStatusLabel(phase) }}</span>
					</div>

					<p :class="$style.phaseDescription">{{ phase.description }}</p>

					<div :class="$style.phaseMeta">
						<div :class="$style.phaseMetaItem">
							<span :class="$style.phaseMetaLabel">{{
								i18n.baseText('instanceAi.planTimeline.objective')
							}}</span>
							<p :class="$style.phaseMetaValue">{{ phase.objective }}</p>
						</div>
						<div :class="$style.phaseMetaItem">
							<span :class="$style.phaseMetaLabel">{{
								i18n.baseText('instanceAi.planTimeline.deliverable')
							}}</span>
							<p :class="$style.phaseMetaValue">{{ phase.deliverable }}</p>
						</div>
						<div :class="$style.phaseMetaItem">
							<span :class="$style.phaseMetaLabel">{{
								i18n.baseText('instanceAi.planTimeline.verification')
							}}</span>
							<p :class="$style.phaseMetaValue">{{ phase.verification.expectedOutcome }}</p>
						</div>
					</div>

					<div v-if="phase.dependsOn.length > 0" :class="$style.dependsOn">
						<span :class="$style.phaseMetaLabel">{{
							i18n.baseText('instanceAi.planTimeline.dependsOn')
						}}</span>
						<span>{{ phase.dependsOn.join(', ') }}</span>
					</div>

					<div v-if="phase.artifacts.length > 0" :class="$style.artifacts">
						<span :class="$style.phaseMetaLabel">{{
							i18n.baseText('instanceAi.planTimeline.artifacts')
						}}</span>
						<div :class="$style.artifactList">
							<template v-for="artifact in phase.artifacts" :key="artifact.id">
								<RouterLink
									v-if="artifact.type === 'workflow' && artifact.resourceId"
									:to="`/workflow/${artifact.resourceId}`"
									target="_blank"
									:class="$style.artifactLink"
								>
									{{ artifact.label }}
								</RouterLink>
								<span v-else :class="$style.token">{{ artifact.label }}</span>
							</template>
						</div>
					</div>

					<div v-if="phase.status === 'blocked' && phase.blocker" :class="$style.blockerCard">
						<div :class="$style.blockerReason">{{ phase.blocker.reason }}</div>
						<div v-if="phase.blocker.question" :class="$style.blockerQuestion">
							{{ phase.blocker.question }}
						</div>
						<div
							v-if="phase.blocker.inputType === 'text' && phase.blocker.requestId"
							:class="$style.blockerActions"
						>
							<input
								v-model="blockerAnswers[phase.id]"
								:class="$style.blockerInput"
								type="text"
								:placeholder="i18n.baseText('instanceAi.askUser.placeholder')"
								@keydown.enter="submitBlocker(phase)"
							/>
							<div :class="$style.blockerButtons">
								<N8nButton type="secondary" size="small" @click="skipBlocker(phase)">
									{{ i18n.baseText('instanceAi.askUser.skip') }}
								</N8nButton>
								<N8nButton
									type="primary"
									size="small"
									:disabled="!(blockerAnswers[phase.id] ?? '').trim()"
									@click="submitBlocker(phase)"
								>
									{{ i18n.baseText('instanceAi.askUser.submit') }}
								</N8nButton>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div
				v-if="showApprovalCard"
				:class="$style.approvalCard"
				data-test-id="instance-ai-plan-approval"
			>
				<div :class="$style.requestHeader">
					<div :class="$style.requestTitle">
						<N8nIcon icon="circle-help" size="small" />
						<span>{{ i18n.baseText('instanceAi.planTimeline.approvalTitle') }}</span>
					</div>
					<span :class="$style.requestBadge">{{
						i18n.baseText('instanceAi.planTimeline.status.awaitingApproval')
					}}</span>
				</div>
				<p :class="$style.requestSummary">{{ approvalSummary }}</p>
				<textarea
					v-model="approvalFeedback"
					:class="$style.feedbackInput"
					:placeholder="i18n.baseText('instanceAi.planTimeline.feedbackPlaceholder')"
				></textarea>
				<div :class="$style.requestActions">
					<N8nButton
						type="secondary"
						size="small"
						data-test-id="instance-ai-plan-request-changes"
						:disabled="!canRequestChanges || approvalSubmitted"
						@click="requestPlanChanges"
					>
						{{ i18n.baseText('instanceAi.planTimeline.requestChanges') }}
					</N8nButton>
					<N8nButton
						type="primary"
						size="small"
						data-test-id="instance-ai-plan-approve"
						:disabled="approvalSubmitted"
						@click="approvePlan"
					>
						{{ i18n.baseText('instanceAi.planTimeline.approvePlan') }}
					</N8nButton>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	display: grid;
	gap: var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.planCard,
.requestCard {
	border: 1px solid var(--color--foreground--dark);
	border-radius: var(--radius--xl);
	background:
		radial-gradient(
			circle at top right,
			color-mix(in srgb, var(--color--primary) 10%, transparent),
			transparent 32%
		),
		linear-gradient(180deg, var(--color--foreground--tint-2), var(--color--background));
	box-shadow: 0 12px 32px color-mix(in srgb, var(--color--foreground--dark) 12%, transparent);
}

.planCard {
	padding: var(--spacing--md);
	display: grid;
	gap: var(--spacing--md);
}

.requestCard {
	padding: var(--spacing--sm);
	display: grid;
	gap: var(--spacing--sm);
}

.approvalCard {
	display: grid;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border-top: 1px solid color-mix(in srgb, var(--color--foreground) 80%, transparent);
}

.header,
.requestHeader,
.phaseHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerTitle,
.requestTitle,
.phaseTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.headerTitle {
	align-items: flex-start;
}

.headerMeta {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.statusBadge,
.requestBadge,
.phaseBadge {
	display: inline-flex;
	align-items: center;
	border-radius: var(--radius--xl);
	border: 1px solid var(--color--foreground);
	padding: 0 var(--spacing--xs);
	min-height: 24px;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: color-mix(in srgb, var(--color--background) 82%, transparent);
}

.progress {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
}

.summary,
.requestSummary,
.phaseDescription {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text);
}

.metaGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: var(--spacing--sm);
}

.metaBlock,
.phaseCard,
.blockerCard {
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	background: color-mix(in srgb, var(--color--background) 88%, transparent);
}

.metaBlock {
	padding: var(--spacing--sm);
	display: grid;
	gap: var(--spacing--sm);
}

.metaLabel,
.phaseMetaLabel {
	font-size: var(--font-size--2xs);
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--color--text--tint-1);
}

.metaList {
	margin: 0;
	padding-left: var(--spacing--sm);
	display: grid;
	gap: var(--spacing--2xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--color--text);
}

.phaseList {
	display: grid;
	gap: var(--spacing--sm);
}

.phaseCard {
	padding: var(--spacing--sm);
	display: grid;
	gap: var(--spacing--sm);
}

.phaseTitle {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.phaseMeta {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
	gap: var(--spacing--xs);
}

.phaseMetaItem {
	display: grid;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: 1px solid color-mix(in srgb, var(--color--foreground) 80%, transparent);
	border-radius: var(--radius--xs);
	background: color-mix(in srgb, var(--color--background) 92%, transparent);
}

.phaseMetaValue {
	margin: 0;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--lg);
	color: var(--color--text);
}

.dependsOn,
.artifacts {
	display: grid;
	gap: var(--spacing--5xs);
	font-size: var(--font-size--xs);
}

.artifactList {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
}

.token {
	display: inline-flex;
	align-items: center;
	border-radius: var(--radius--xl);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	line-height: 1.4;
	background: var(--color--foreground--tint-2);
	color: var(--color--text);
}

.artifactLink {
	color: var(--color--primary);
	text-decoration: none;

	&:hover {
		text-decoration: underline;
	}
}

.feedbackInput,
.blockerInput {
	width: 100%;
	border: 1px solid var(--color--foreground--dark);
	border-radius: var(--radius--md);
	background: var(--color--background);
	color: var(--color--text);
	font: inherit;
	padding: var(--spacing--xs);
}

.feedbackInput {
	min-height: 92px;
	resize: vertical;
	line-height: var(--line-height--xl);
}

.requestActions,
.blockerButtons {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.blockerCard {
	padding: var(--spacing--sm);
	display: grid;
	gap: var(--spacing--xs);
	border-color: color-mix(in srgb, var(--color--danger) 32%, var(--color--foreground));
	background: color-mix(in srgb, var(--color--danger) 5%, var(--color--background));
}

.blockerReason {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.blockerQuestion {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
}

.blockerActions {
	display: grid;
	gap: var(--spacing--xs);
}

.pendingIcon {
	color: var(--color--text--tint-1);
}

.readyIcon,
.verifyingIcon {
	color: var(--color--primary);
}

.buildingIcon {
	color: var(--color--primary);
}

.blockedIcon,
.failedIcon {
	color: var(--color--danger);
}

.doneIcon {
	color: var(--color--success);
}

@media (max-width: 768px) {
	.planCard {
		padding: var(--spacing--sm);
	}

	.header,
	.requestHeader,
	.phaseHeader {
		flex-direction: column;
		align-items: stretch;
	}

	.headerMeta,
	.requestActions,
	.blockerButtons {
		justify-content: flex-start;
	}
}
</style>
