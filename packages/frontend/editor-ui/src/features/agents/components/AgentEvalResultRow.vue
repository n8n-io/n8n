<script setup lang="ts">
/**
 * One reviewed case: the request, the agent's answer, the vote, and — on
 * disagreement — the reason and the edited answer.
 *
 * Presentational. It reports intent and reflects the view it is handed; the panel
 * above it owns persistence. The status chip reads the case's *execution* outcome
 * only and is never derived from a vote: a human's 👍/👎 is not a verdict on the
 * run, and nothing here grades an answer automatically.
 */
import { computed } from 'vue';
import { N8nBadge, N8nButton, N8nIcon, N8nInput, N8nSpinner, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentEvalResultRecord, AgentEvalVote } from '../agentEvals.types';
import {
	AGENT_EVAL_MAX_COMMENT_CHARS,
	AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS,
} from '../agentEvals.types';
import type { ReviewRowView } from '../utils/agent-eval-review';
import { readAgentAnswer, readCaseRequest } from '../utils/agent-eval-review';
import { toDisplayToolCalls } from '../utils/agent-eval-tool-calls';
import AgentEvalToolCalls from './AgentEvalToolCalls.vue';
import AgentEvalVoteButtons from './AgentEvalVoteButtons.vue';

const props = defineProps<{
	result: AgentEvalResultRecord;
	view: ReviewRowView;
	disabled?: boolean;
	projectId?: string;
}>();

const emit = defineEmits<{
	vote: [AgentEvalVote];
	'update:comment': [string];
	'update:correction': [string];
	'edit-answer': [];
	'edit-note': [];
	save: [];
	cancel: [];
}>();

const i18n = useI18n();

const request = computed(() => readCaseRequest(props.result.input));
const agentAnswer = computed(() => readAgentAnswer(props.result.output));

const isEditing = computed(() => props.view.kind === 'editing');
const isSettled = computed(() => props.view.kind === 'settled');

const currentVote = computed(() => (props.view.kind === 'unrated' ? null : props.view.vote));

/** The correction only exists on a settled row; editing shows it in its editor. */
const settledCorrection = computed(() =>
	props.view.kind === 'settled' ? props.view.correction : null,
);
const settledComment = computed(() => (props.view.kind === 'settled' ? props.view.comment : null));

// The API rejects a vote on a case that hasn't finished, so the control is
// disabled rather than left to fail on submit.
const isPending = computed(
	() => props.result.status === 'new' || props.result.status === 'running',
);
const votesDisabled = computed(() => props.disabled === true || isPending.value);

/**
 * Execution outcomes only — there is no pass/fail grade in this view.
 *
 * `new` and `running` are told apart deliberately: the runner marks each case
 * running as it picks it up, so this is the only place a waiting reviewer can see
 * which case is actually executing rather than queued behind the concurrency cap.
 */
const statusLabel = computed(() => {
	switch (props.result.status) {
		case 'error':
			return i18n.baseText('agents.builder.agentEvals.review.row.status.errored');
		case 'cancelled':
			return i18n.baseText('agents.builder.agentEvals.review.row.status.cancelled');
		case 'new':
			return i18n.baseText('agents.builder.agentEvals.review.row.status.queued');
		case 'running':
			return i18n.baseText('agents.builder.agentEvals.review.row.status.running');
		default:
			return null;
	}
});

const statusTheme = computed(() => (props.result.status === 'error' ? 'danger' : 'default'));

const toolCalls = computed(() => toDisplayToolCalls(props.result.toolCalls));

/** The edit affordance lives in the reason panel or the edited-answer block when either is open. */
const showFooterEdit = computed(() => !isEditing.value && !settledCorrection.value);

// Rows with neither tool calls nor a footer action get no footer at all, rather
// than an empty strip holding space open.
const showFooter = computed(() => toolCalls.value.length > 0 || showFooterEdit.value);
</script>

<template>
	<div :class="[$style.row, { [$style.editing]: isEditing }]" data-testid="agent-eval-result-row">
		<div :class="$style.header">
			<N8nText size="small" color="text-dark" bold :class="$style.request">
				{{ request }}
			</N8nText>
			<div :class="$style.headerActions">
				<N8nBadge v-if="statusLabel" :theme="statusTheme" data-testid="agent-eval-status-chip">
					{{ statusLabel }}
				</N8nBadge>
				<N8nBadge v-if="isEditing" theme="warning" data-testid="agent-eval-unsaved-pill">
					{{ i18n.baseText('agents.builder.agentEvals.review.row.unsavedPill') }}
				</N8nBadge>
				<N8nBadge v-else-if="isSettled" theme="success" data-testid="agent-eval-saved-pill">
					<span :class="$style.savedPill">
						<N8nIcon icon="circle-check" size="small" />
						{{ i18n.baseText('agents.builder.agentEvals.review.row.savedPill') }}
					</span>
				</N8nBadge>
				<AgentEvalVoteButtons
					:vote="currentVote"
					:disabled="votesDisabled"
					:disabled-reason="
						isPending
							? i18n.baseText('agents.builder.agentEvals.review.row.votePending')
							: undefined
					"
					@vote="emit('vote', $event)"
				/>
			</div>
		</div>

		<!-- Once an edit exists, the agent's answer is labelled and demoted so the
		     reviewer's version reads as the current one. -->
		<N8nText
			v-if="settledCorrection"
			size="xsmall"
			color="text-light"
			:class="$style.blockLabel"
			:bold="true"
		>
			{{ i18n.baseText('agents.builder.agentEvals.review.row.agentAnswered') }}
		</N8nText>
		<div :class="[$style.answer, { [$style.answerMuted]: Boolean(settledCorrection) }]">
			<N8nText v-if="agentAnswer" size="small" color="text-base">{{ agentAnswer }}</N8nText>
			<!-- A case that hasn't finished has no answer *yet*; saying it returned none
			     would report a failure that hasn't happened. -->
			<span v-else-if="isPending" :class="$style.awaiting">
				<N8nSpinner size="small" />
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.agentEvals.review.row.awaitingAnswer') }}
				</N8nText>
			</span>
			<N8nText v-else size="small" color="text-light" :class="$style.noAnswer">
				{{ i18n.baseText('agents.builder.agentEvals.review.row.noAnswer') }}
			</N8nText>
		</div>

		<template v-if="settledCorrection">
			<N8nText size="xsmall" color="text-light" :class="$style.blockLabel" :bold="true">
				{{ i18n.baseText('agents.builder.agentEvals.review.row.yourAnswer') }}
			</N8nText>
			<div :class="$style.correction" data-testid="agent-eval-correction">
				<N8nText size="small" color="text-dark">{{ settledCorrection }}</N8nText>
				<div :class="$style.correctionFooter">
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('agents.builder.agentEvals.review.row.keptWithFeedback') }}
					</N8nText>
					<N8nButton
						variant="subtle"
						size="small"
						icon="pencil"
						:disabled="disabled"
						data-testid="agent-eval-edit-answer"
						@click="emit('edit-answer')"
					>
						{{ i18n.baseText('agents.builder.agentEvals.review.row.editAnswer') }}
					</N8nButton>
				</div>
			</div>
		</template>

		<div v-if="isEditing && view.kind === 'editing'" :class="$style.panel">
			<template v-if="view.showReason">
				<N8nText size="small" color="text-dark" bold>
					{{ i18n.baseText('agents.builder.agentEvals.review.reason.label') }}
				</N8nText>
				<N8nInput
					type="textarea"
					autofocus
					:model-value="view.comment"
					:rows="2"
					:maxlength="AGENT_EVAL_MAX_COMMENT_CHARS"
					:placeholder="i18n.baseText('agents.builder.agentEvals.review.reason.placeholder')"
					data-testid="agent-eval-reason-input"
					@update:model-value="emit('update:comment', $event)"
				/>
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('agents.builder.agentEvals.review.reason.helper') }}
				</N8nText>
			</template>

			<template v-if="view.showAnswerEditor">
				<N8nText size="small" color="text-dark" bold>
					{{ i18n.baseText('agents.builder.agentEvals.review.answer.label') }}
				</N8nText>
				<N8nInput
					type="textarea"
					:model-value="view.correction"
					:rows="3"
					:maxlength="AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS"
					data-testid="agent-eval-answer-input"
					@update:model-value="emit('update:correction', $event)"
				/>
				<!-- Says plainly what the edit does, so nothing implies it becomes the
				     case's expected answer for future runs. -->
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('agents.builder.agentEvals.review.answer.helper') }}
				</N8nText>
			</template>

			<div :class="$style.panelFooter">
				<div :class="$style.panelActions">
					<N8nButton
						variant="solid"
						size="small"
						:disabled="!view.canSave || disabled"
						data-testid="agent-eval-reason-save"
						@click="emit('save')"
					>
						{{ i18n.baseText('agents.builder.agentEvals.review.reason.save') }}
					</N8nButton>
					<N8nButton
						variant="subtle"
						size="small"
						data-testid="agent-eval-reason-cancel"
						@click="emit('cancel')"
					>
						{{ i18n.baseText('generic.cancel') }}
					</N8nButton>
				</div>
				<N8nButton
					v-if="!view.showAnswerEditor"
					variant="subtle"
					size="small"
					icon="pencil"
					:disabled="disabled"
					data-testid="agent-eval-edit-answer"
					@click="emit('edit-answer')"
				>
					{{ i18n.baseText('agents.builder.agentEvals.review.row.editAnswer') }}
				</N8nButton>
			</div>
		</div>

		<div
			v-if="isSettled && settledComment"
			:class="$style.note"
			data-testid="agent-eval-note-strip"
		>
			<N8nText size="xsmall" color="text-base">
				{{ i18n.baseText('agents.builder.agentEvals.review.row.noteLabel') }}
				{{ settledComment }}
			</N8nText>
			<N8nButton
				variant="subtle"
				size="small"
				:disabled="disabled"
				data-testid="agent-eval-edit-note"
				@click="emit('edit-note')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.review.row.editNote') }}
			</N8nButton>
		</div>

		<div v-if="showFooter" :class="$style.footer">
			<AgentEvalToolCalls
				v-if="toolCalls.length > 0"
				:tool-calls="toolCalls"
				:project-id="projectId"
			/>
			<N8nButton
				v-if="showFooterEdit"
				variant="subtle"
				size="small"
				icon="pencil"
				:disabled="disabled"
				:class="$style.footerEdit"
				data-testid="agent-eval-edit-answer"
				@click="emit('edit-answer')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.review.row.editAnswer') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: var(--border);
}

/* A review still being typed is tinted whole, so an unsaved row can't be
   mistaken for a saved one at a glance. */
.editing {
	background-color: var(--background--warning);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.request {
	min-width: 0;
}

.headerActions {
	display: flex;
	flex-shrink: 0;
	align-items: center;
	gap: var(--spacing--3xs);
}

.savedPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.blockLabel {
	text-transform: uppercase;
}

.answer {
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--background--subtle);
	border-radius: var(--radius);
}

.answerMuted {
	opacity: 0.7;
}

.noAnswer {
	font-style: italic;
}

.awaiting {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.correction {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
}

.correctionFooter,
.panelFooter,
.note {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius);
}

.panelActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.note {
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--background--subtle);
	border-radius: var(--radius);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.footerEdit {
	margin-left: auto;
}
</style>
