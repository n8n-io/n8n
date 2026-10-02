<script setup lang="ts">
/**
 * The checks-have-run view behind `useTestAgentPreviewExperiment`: status
 * filter pills plus a "Run all checks" button up top, then each case as an
 * `AgentEvalTryRow` — replaces `AgentEvalResultsPanel`'s vote/comment review
 * model with the simpler row the rest of the experiment already uses.
 *
 * Rows have no scenario tag here — a run's result only ever carries
 * `input`/`output`/`status` (the Data Table has no column for it), so this
 * never passes `label` to `AgentEvalTryRow`.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalResultStatus } from '../agentEvals.types';
import { readAgentAnswer, readCaseRequest } from '../utils/agent-eval-review';
import AgentAvatar, { type AgentAvatarKind } from './AgentAvatar.vue';
import AgentEvalTryRow from './AgentEvalTryRow.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	runId: string;
	disabled?: boolean;
	rerunning?: boolean;
}>();

const emit = defineEmits<{
	rerun: [];
	/** "Save check" on a failing row — not wired to a backend action yet; the
	 *  committed-run runner has no per-row rerun primitive, so a real fix here
	 *  is a follow-up. Forwarded so a caller can act on it once that exists. */
	'revise-case': [payload: { resultId: string; suggestion: string }];
}>();

const i18n = useI18n();
const toast = useToast();
const store = useAgentEvalsStore();

/** How a settled result's status reads as a row's avatar state. */
function resultStatusToKind(status: AgentEvalResultStatus): AgentAvatarKind {
	switch (status) {
		case 'success':
			return 'pass';
		case 'error':
			return 'fail';
		case 'cancelled':
			return 'work';
		case 'new':
		case 'running':
			return 'waiting';
	}
}

const review = computed(() => store.getReview(props.runId));
const results = computed(() => review.value.results);
const hasMore = computed(() => results.value.length < review.value.resultsCount);
const inFlight = computed(() => store.isRunInFlight(props.runId));

// "Actually fine" is a local judgment call, not a data mutation — no request
// backs it, so it only overrides how a row's own status renders. Same pattern
// as `InstanceAiTestAgentExamplesPanel`.
const manualStatusOverrides = ref<Record<string, AgentAvatarKind>>({});

type CheckRow = {
	id: string;
	status: AgentAvatarKind;
	input: string;
	output: string | null;
};

const rows = computed<CheckRow[]>(() =>
	results.value.map((result) => {
		const override = manualStatusOverrides.value[result.id];
		return {
			id: result.id,
			status: override ?? resultStatusToKind(result.status),
			input: readCaseRequest(result.input),
			output: readAgentAnswer(result.output),
		};
	}),
);

const passedCount = computed(() => rows.value.filter((row) => row.status === 'pass').length);
const needsWorkCount = computed(
	() => rows.value.filter((row) => row.status === 'work' || row.status === 'fail').length,
);

type StatusFilter = 'all' | 'pass' | 'needs-work';
const statusFilter = ref<StatusFilter>('all');

// Needs-work first, then pass, so the rows a reviewer should act on are
// never buried below the ones that already look fine — regardless of filter.
const STATUS_RANK: Record<AgentAvatarKind, number> = {
	work: 0,
	fail: 0,
	waiting: 1,
	idle: 1,
	pass: 2,
	strong: 2,
};

const sortedRows = computed(() =>
	[...rows.value].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]),
);

const filteredRows = computed(() => {
	if (statusFilter.value === 'pass') return sortedRows.value.filter((row) => row.status === 'pass');
	if (statusFilter.value === 'needs-work') {
		return sortedRows.value.filter((row) => row.status === 'work' || row.status === 'fail');
	}
	return sortedRows.value;
});

function setStatusFilter(filter: StatusFilter) {
	statusFilter.value = filter;
}

function onActuallyFine(resultId: string) {
	manualStatusOverrides.value = { ...manualStatusOverrides.value, [resultId]: 'pass' };
}

function onSaveCheck(resultId: string, suggestion: string) {
	emit('revise-case', { resultId, suggestion });
}

const load = async () => {
	store.stopPollingRun();
	try {
		await store.openRun(props.projectId, props.agentId, props.runId);
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

onMounted(load);
watch(() => props.runId, load);
onBeforeUnmount(store.stopPollingRun);
</script>

<template>
	<section :class="$style.panel" data-testid="agent-eval-checks-panel">
		<header :class="$style.header">
			<div :class="$style.filters">
				<button
					type="button"
					:class="[$style.filterPill, statusFilter === 'needs-work' && $style.filterPillActive]"
					data-testid="agent-eval-checks-filter-needs-work"
					@click="setStatusFilter('needs-work')"
				>
					<AgentAvatar kind="work" size="xs" />
					<N8nText size="small">
						{{
							i18n.baseText('agents.builder.agentEvals.checks.needsWork', {
								adjustToNumber: needsWorkCount,
								interpolate: { count: String(needsWorkCount) },
							})
						}}
					</N8nText>
				</button>
				<button
					type="button"
					:class="[$style.filterPill, statusFilter === 'pass' && $style.filterPillActive]"
					data-testid="agent-eval-checks-filter-pass"
					@click="setStatusFilter('pass')"
				>
					<AgentAvatar kind="pass" size="xs" />
					<N8nText size="small">
						{{
							i18n.baseText('agents.builder.agentEvals.checks.pass', {
								interpolate: { count: String(passedCount) },
							})
						}}
					</N8nText>
				</button>
				<button
					type="button"
					:class="[$style.filterPill, statusFilter === 'all' && $style.filterPillActive]"
					data-testid="agent-eval-checks-filter-all"
					@click="setStatusFilter('all')"
				>
					<N8nText size="small">
						{{
							i18n.baseText('agents.builder.agentEvals.checks.all', {
								interpolate: { count: String(rows.length) },
							})
						}}
					</N8nText>
				</button>
			</div>
			<N8nButton
				variant="outline"
				size="small"
				:disabled="disabled || rerunning"
				:loading="rerunning || inFlight"
				data-testid="agent-eval-checks-run-all"
				@click="emit('rerun')"
			>
				{{ i18n.baseText('agents.builder.agentEvals.checks.runAll') }}
			</N8nButton>
		</header>

		<div :class="$style.list">
			<AgentEvalTryRow
				v-for="row in filteredRows"
				:key="row.id"
				:status="row.status"
				:input="row.input"
				:output="row.output"
				:test-id="`agent-eval-check-${row.id}`"
				@save-check="onSaveCheck(row.id, $event)"
				@actually-fine="onActuallyFine(row.id)"
			/>
		</div>

		<div v-if="hasMore" :class="$style.loadMore">
			<N8nButton variant="subtle" size="small" :loading="review.loadingMore" @click="onLoadMore">
				{{ i18n.baseText('agents.builder.agentEvals.review.loadMore') }}
			</N8nButton>
		</div>
	</section>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.filters {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.filterPill {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	background: none;
	border: var(--border);
	border-radius: var(--radius--lg);
	cursor: pointer;
	color: var(--text-color--base);
}

.filterPillActive {
	background-color: var(--background--base);
	border-color: var(--border-color--dark, var(--border-color));
	color: var(--text-color--dark);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.list > * {
	border: var(--border);
	// 10px (right) has no matching token between 8px and 12px — kept as a
	// literal for the extra breathing room next to the row's chevron/icon.
	padding: var(--spacing--3xs) 10px var(--spacing--3xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);
}

.loadMore {
	display: flex;
	justify-content: center;
	padding-top: var(--spacing--xs);
}
</style>
