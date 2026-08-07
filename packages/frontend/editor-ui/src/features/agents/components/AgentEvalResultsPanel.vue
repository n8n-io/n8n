<script setup lang="ts">
/**
 * The results card for one eval run: what ran, how much of it has been reviewed,
 * a row per case, and the handoff back to the assistant.
 *
 * Owns persistence for the rows beneath it — they report intent, this reads and
 * writes the store. Counts come from the run's page envelope, never from the
 * loaded page, so paging can't change what the header claims.
 */
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { N8nBadge, N8nButton, N8nSpinner, N8nText, N8nTooltip } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalVote } from '../agentEvals.types';
import { resolveReviewRowView } from '../utils/agent-eval-review';
import { useRelativeTimestamp } from '../utils/relative-time';
import AgentEvalResultRow from './AgentEvalResultRow.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	runId: string;
	disabled?: boolean;
	rerunning?: boolean;
}>();

// Which run is shown belongs to the surface above, so re-running asks rather
// than switching the view out from under itself.
const emit = defineEmits<{
	rerun: [];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useAgentEvalsStore();
const formatRelative = useRelativeTimestamp();

const review = computed(() => store.getReview(props.runId));
const results = computed(() => review.value.results);
const reviewedCount = computed(() => store.reviewedCount(props.runId));
const remaining = computed(() => Math.max(0, review.value.resultsCount - reviewedCount.value));
const hasMore = computed(() => results.value.length < review.value.resultsCount);

// A run reports when it finished; a run still going has only a start.
const counts = computed(() => review.value.counts);

// A run in flight reports how far it has got, so a multi-minute wait doesn't look
// like nothing happening. Falls back to the settled phrasing once it's done.
const inFlight = computed(() => store.isRunInFlight(props.runId));
const settledCases = computed(() => {
	const c = counts.value;
	return c ? c.total - c.pending : 0;
});

const relativeRunTime = computed(() => {
	const run = review.value.run;
	const timestamp = run?.completedAt ?? run?.runAt ?? run?.createdAt;
	return timestamp ? formatRelative(timestamp) : null;
});

const viewFor = (resultId: string) =>
	resolveReviewRowView({
		rating: review.value.ratingsByResultId[resultId],
		pending: review.value.pendingByResultId[resultId],
		draft: store.getDraft(props.runId, resultId),
	});

const load = async () => {
	// Abandon any previous watcher first. Without this, moving to a run that is
	// already settled leaves the old timer alive, and when *it* settles its own
	// reload steals this one's stale-response guard — leaving the card blank.
	store.stopPollingRun();
	try {
		await store.openRun(props.projectId, props.agentId, props.runId);
		// A run opened mid-flight — usually one just started from here — is watched
		// until it settles, then read again for its answers.
		if (store.isRunInFlight(props.runId)) {
			store.startPollingRun(props.projectId, props.agentId, props.runId);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.loadError'));
	}
};

const onLoadMore = async () => {
	try {
		await store.loadMoreResults(props.projectId, props.agentId, props.runId);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.loadError'));
	}
};

const onSave = async (resultId: string) => {
	try {
		await store.saveReview(props.projectId, props.agentId, props.runId, resultId);
	} catch (error) {
		// The store has already put the draft back, so the reviewer's words are
		// still on screen when they read this.
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.saveError'));
	}
};

const onVote = async (resultId: string, vote: AgentEvalVote) => {
	// Asked before the draft is written, and answered from the persisted rating
	// rather than the row's view — a view is shadowed by any open draft, so reading
	// it here would treat a row whose note editor happens to be open as unrated.
	const discardsWork = store.wouldDiscardOnAgreement(props.runId, resultId);

	store.beginVote(props.runId, resultId, vote);

	// Agreement is a one-click action — there is nothing further to ask, so it
	// persists straight away rather than parking the row behind a Save button.
	//
	// Unless it would throw away a note or a rewrite the reviewer already saved.
	// Agreement carries neither, so switching to it drops both, and doing that
	// silently on one click is not a change anyone can review. That case falls
	// through to the panel, where the row reads Unsaved until they confirm.
	//
	// Disagreement always stops here: its reason is what the Save is waiting on.
	if (vote === 'up' && !discardsWork) await onSave(resultId);
};

onMounted(load);
watch(() => props.runId, load);
onBeforeUnmount(store.stopPollingRun);
</script>

<template>
	<section :class="$style.card" data-testid="agent-eval-results-panel">
		<header :class="$style.header">
			<div :class="$style.headerRow">
				<N8nText tag="h3" size="large" color="text-dark" bold :class="$style.title">
					{{ i18n.baseText('agents.builder.agentEvals.review.title') }}
				</N8nText>
				<N8nButton
					variant="ghost"
					size="xsmall"
					icon="refresh-cw"
					:disabled="disabled || rerunning"
					:loading="rerunning"
					data-testid="agent-eval-rerun-button"
					@click="emit('rerun')"
				>
					{{ i18n.baseText('agents.builder.agentEvals.review.rerun') }}
				</N8nButton>
			</div>
			<div :class="$style.meta">
				<!-- "cases run" is past tense, so a run still working says so instead.
				     Keyed on the run's own status, not on the tallies: the first poll may
				     not have landed, and repeated poll failures would otherwise leave a
				     working run claiming it had finished. -->
				<N8nBadge v-if="inFlight" data-testid="agent-eval-progress-chip">
					<span :class="$style.progressChip">
						<N8nSpinner size="small" />
						{{
							counts
								? i18n.baseText('agents.builder.agentEvals.review.progress', {
										interpolate: { done: settledCases, total: counts.total },
									})
								: i18n.baseText('agents.builder.agentEvals.review.running')
						}}
					</span>
				</N8nBadge>
				<N8nBadge v-else data-testid="agent-eval-cases-run-chip">
					{{
						i18n.baseText('agents.builder.agentEvals.review.casesRun', {
							adjustToNumber: review.resultsCount,
							interpolate: { count: review.resultsCount },
						})
					}}
				</N8nBadge>
				<N8nBadge data-testid="agent-eval-reviewed-chip">
					{{
						i18n.baseText('agents.builder.agentEvals.review.reviewed', {
							interpolate: { reviewed: reviewedCount, total: review.resultsCount },
						})
					}}
				</N8nBadge>
				<N8nText v-if="relativeRunTime" size="xsmall" color="text-light">
					· {{ relativeRunTime }}
				</N8nText>
			</div>
		</header>

		<AgentEvalResultRow
			v-for="result in results"
			:key="result.id"
			:result="result"
			:view="viewFor(result.id)"
			:disabled="disabled"
			:project-id="projectId"
			@vote="onVote(result.id, $event)"
			@update:comment="store.setDraftComment(runId, result.id, $event)"
			@update:correction="store.setDraftCorrection(runId, result.id, $event)"
			@edit-answer="store.beginAnswerEdit(runId, result.id)"
			@edit-note="store.beginNoteEdit(runId, result.id)"
			@save="onSave(result.id)"
			@cancel="store.cancelDraft(runId, result.id)"
		/>

		<div v-if="hasMore" :class="$style.loadMore">
			<N8nButton
				variant="subtle"
				size="small"
				:loading="review.loadingMore"
				data-testid="agent-eval-load-more"
				@click="onLoadMore"
			>
				{{ i18n.baseText('agents.builder.agentEvals.review.loadMore') }}
			</N8nButton>
		</div>

		<footer :class="$style.footer">
			<div :class="$style.progress">
				<N8nText size="small" color="text-dark" bold>
					{{
						i18n.baseText('agents.builder.agentEvals.review.reviewed', {
							interpolate: { reviewed: reviewedCount, total: review.resultsCount },
						})
					}}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{
						remaining === 0
							? i18n.baseText('agents.builder.agentEvals.review.footer.allReviewed')
							: i18n.baseText('agents.builder.agentEvals.review.footer.remaining', {
									adjustToNumber: remaining,
									interpolate: { count: remaining },
								})
					}}
				</N8nText>
			</div>
			<!-- Disabled until the assistant can act on a run's feedback: nothing
			     reads these ratings back yet, so a working button would be a lie. -->
			<N8nTooltip
				:content="i18n.baseText('agents.builder.agentEvals.review.footer.sendUnavailable')"
				placement="top"
			>
				<N8nButton variant="solid" size="medium" disabled data-testid="agent-eval-send-feedback">
					{{ i18n.baseText('agents.builder.agentEvals.review.footer.send') }}
				</N8nButton>
			</N8nTooltip>
		</footer>
	</section>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	width: 100%;
	box-sizing: border-box;
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius);
}

/* Rows and the footer carry their own top border, so the card needs no dividers
   of its own — and adding a case can't get the separators wrong. */
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
}

.headerRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.title {
	margin: 0;
}

.progressChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.loadMore {
	display: flex;
	justify-content: center;
	padding: var(--spacing--xs);
	border-top: var(--border);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) var(--spacing--md);
	border-top: var(--border);
}

.progress {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}
</style>
