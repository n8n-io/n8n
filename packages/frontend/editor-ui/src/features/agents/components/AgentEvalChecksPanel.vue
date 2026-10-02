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
import { N8nButton } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n, type BaseTextKey } from '@n8n/i18n';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalResultStatus } from '../agentEvals.types';
import { readAgentAnswer, readCaseRequest, readErrorMessage } from '../utils/agent-eval-review';
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
	runAt: string | null;
	errorMessage: string | null;
};

const rows = computed<CheckRow[]>(() =>
	results.value.map((result) => {
		const override = manualStatusOverrides.value[result.id];
		return {
			id: result.id,
			status: override ?? resultStatusToKind(result.status),
			input: readCaseRequest(result.input),
			output: readAgentAnswer(result.output),
			runAt: result.runAt,
			errorMessage: readErrorMessage(result.errorDetails),
		};
	}),
);

const passedCount = computed(() => rows.value.filter((row) => row.status === 'pass').length);
const needsWorkCount = computed(
	() => rows.value.filter((row) => row.status === 'work' || row.status === 'fail').length,
);

type StatusFilter = 'all' | 'pass' | 'needs-work';
const statusFilter = ref<StatusFilter>('all');

type StatusFilterOption = {
	key: StatusFilter;
	/** No avatar for "All" — it isn't one of `AgentAvatar`'s statuses. */
	avatarKind?: AgentAvatarKind;
	count: number;
	labelKey: BaseTextKey;
	/** "All" stays up regardless of count; the status pills only earn their
	 *  place once there's at least one row in that status. */
	alwaysShown?: boolean;
};

// One definition per pill, each carrying its own live count — rendered by
// looping over this instead of hand-writing a button per status, so a pill
// only ever exists when its count backs it up.
const statusFilterOptions = computed<StatusFilterOption[]>(() => [
	{
		key: 'needs-work',
		avatarKind: 'work',
		count: needsWorkCount.value,
		labelKey: 'agents.builder.agentEvals.checks.needsWork',
	},
	{
		key: 'pass',
		avatarKind: 'pass',
		count: passedCount.value,
		labelKey: 'agents.builder.agentEvals.checks.pass',
	},
	{
		key: 'all',
		count: rows.value.length,
		labelKey: 'agents.builder.agentEvals.checks.all',
		alwaysShown: true,
	},
]);

const visibleStatusFilters = computed(() =>
	statusFilterOptions.value.filter((option) => option.alwaysShown || option.count > 0),
);

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
	// Guarded by the live count, not just which pill is selected: if the
	// filtered-on status's count drops to 0 (its pill disappears, e.g. every
	// "needs work" row got fixed), this falls back to unfiltered instead of
	// leaving the list empty behind a filter with no pill left to clear it.
	if (statusFilter.value === 'pass' && passedCount.value > 0) {
		return sortedRows.value.filter((row) => row.status === 'pass');
	}
	if (statusFilter.value === 'needs-work' && needsWorkCount.value > 0) {
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
			<div v-if="rows.length > 0" :class="$style.filters">
				<N8nButton
					v-for="option in visibleStatusFilters"
					:key="option.key"
					type="button"
					size="small"
					:variant="statusFilter === option.key ? 'outline' : 'subtle'"
					:data-testid="`agent-eval-checks-filter-${option.key}`"
					@click="setStatusFilter(option.key)"
				>
					<template v-if="option.avatarKind" #icon>
						<AgentAvatar :kind="option.avatarKind" size="xs" />
					</template>
					{{
						i18n.baseText(option.labelKey, {
							adjustToNumber: option.count,
							interpolate: { count: String(option.count) },
						})
					}}
				</N8nButton>
			</div>
			<N8nButton
				variant="subtle"
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
				:date="row.runAt"
				:error-message="row.errorMessage"
				view="complete"
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

.list {
	display: flex;
	flex-direction: column;
	width: 100%;
	border-radius: var(--radius--xl);
	border: var(--border);
	background-color: white;
}

.list > * {
	padding: 11px 16px;
	border-bottom: var(--border);
}

.list > *:first-of-type {
	border-radius: var(--radius--xl) var(--radius--xl) 0 0;
}

.list > *:last-of-type {
	border-radius: 0 0 var(--radius--xl) var(--radius--xl);
	border-bottom: none;
}

.list > *:hover {
	background-color: var(--color--background);
}

.loadMore {
	display: flex;
	justify-content: center;
	padding-top: var(--spacing--xs);
}
</style>
