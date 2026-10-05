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

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalResultStatus } from '../agentEvals.types';
import {
	readAgentAnswer,
	readCaseRequest,
	readCaseWhatToCheck,
	readErrorMessage,
} from '../utils/agent-eval-review';
import { toDisplayToolCalls } from '../utils/agent-eval-tool-calls';
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
	toolCalls: ToolCall[];
	whatToCheck: string | null;
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
			toolCalls: toDisplayToolCalls(result.toolCalls),
			whatToCheck: readCaseWhatToCheck(result.input),
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
	if (statusFilter.value === 'pass') return sortedRows.value.filter((row) => row.status === 'pass');
	if (statusFilter.value === 'needs-work') {
		return sortedRows.value.filter((row) => row.status === 'work' || row.status === 'fail');
	}
	return sortedRows.value;
});

// If the filtered-on status's count drops to 0 (its pill disappears, e.g.
// every "needs work" row got fixed), reset to "all" rather than leaving the
// filter pointed at a pill that no longer exists — `filteredRows` would still
// show every row either way, but with no pill reading as selected.
watch([needsWorkCount, passedCount], ([needsWork, passed]) => {
	if (statusFilter.value === 'needs-work' && needsWork === 0) statusFilter.value = 'all';
	if (statusFilter.value === 'pass' && passed === 0) statusFilter.value = 'all';
});

function setStatusFilter(filter: StatusFilter) {
	statusFilter.value = filter;
}

function onActuallyFine(resultId: string) {
	manualStatusOverrides.value = { ...manualStatusOverrides.value, [resultId]: 'pass' };
}

async function onRerunCheck(resultId: string) {
	try {
		await store.rerunResult(props.projectId, props.agentId, resultId);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.rerunCaseError'));
	}
}

// There is no editable case row to write the rule to here — only this
// result's own snapshot — so the backend persists it directly as part of the
// same request that reruns the case with it.
async function onSaveWhatToCheck(resultId: string, whatToCheck: string) {
	try {
		await store.rerunResult(props.projectId, props.agentId, resultId, { whatToCheck });
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.rerunCaseError'));
	}
}

// Bumped by every `load()` call (including a run switch), and checked after
// every await in both `load` and `loadRemainingResults` — a response that
// lands after the run has moved on is discarded rather than patched into (or
// read back from) a review nobody is looking at anymore, and a background
// pagination loop for the old run stops instead of racing `openRun`'s own
// wholesale replace of `results` for the new one.
let loadGeneration = 0;
// The generation whose `openRun` has actually resolved — `getReview` can
// still be returning a *previous* visit's retained cache for the new runId
// before that happens, so this is what a retry gates on, not just "is this
// generation current."
let openedGeneration = 0;

const load = async () => {
	const generation = ++loadGeneration;
	store.stopPollingRun();
	try {
		await store.openRun(props.projectId, props.agentId, props.runId);
		if (generation !== loadGeneration) return;
		openedGeneration = generation;
		if (store.isRunInFlight(props.runId)) {
			store.startPollingRun(props.projectId, props.agentId, props.runId);
		} else {
			await loadRemainingResults(generation);
		}
	} catch (error) {
		if (generation !== loadGeneration) return;
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

// The status pills and `filteredRows` only ever see `rows`, which is built
// from the loaded page — left to manual "Show more cases" clicks, a run
// bigger than one page would under-count every pill and hide matching rows
// until the reviewer paged them all in by hand. Pulls in the rest on its own
// once the run has settled, so counts and filtering always reflect the whole
// run.
//
// Only one loop runs at a time, tracked by which generation currently holds
// it (not a plain boolean): a call for a newer generation arriving while an
// older one's loop is still draining its last `loadMoreResults` await can't
// just join in, but it must not be silently dropped either — the active
// loop's `finally` is what retries for whichever generation is actually
// current once it lets go, so the newest run is never permanently skipped
// just because it showed up while someone else held the lock.
let activeGeneration: number | null = null;
const loadRemainingResults = async (generation: number) => {
	if (activeGeneration !== null) return;
	activeGeneration = generation;
	try {
		let loadedCount = results.value.length;
		while (generation === loadGeneration && !inFlight.value && hasMore.value) {
			await store.loadMoreResults(props.projectId, props.agentId, props.runId);
			if (generation !== loadGeneration) break;
			// A call that doesn't grow the page can't ever satisfy `hasMore` —
			// stop rather than spin forever against a backend (or test double)
			// that keeps reporting more without actually returning any.
			if (results.value.length === loadedCount) break;
			loadedCount = results.value.length;
		}
	} catch (error) {
		if (generation === loadGeneration) {
			toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.loadError'));
		}
	} finally {
		activeGeneration = null;
		// Whoever's current now didn't get a turn while this loop held the lock —
		// give it one before letting go, rather than leaving it to wait for a
		// reactive trigger that may never come again. Gated on `openedGeneration`,
		// not just "is this generation current": if the current generation's own
		// `openRun` hasn't resolved yet, `load()`'s own sequential call picks it
		// up once it does — retrying here instead would race that same `openRun`.
		if (
			generation !== loadGeneration &&
			openedGeneration === loadGeneration &&
			!inFlight.value &&
			hasMore.value
		) {
			void loadRemainingResults(loadGeneration);
		}
	}
};

onMounted(load);
watch(() => props.runId, load);
// Only the in-flight → settled transition — a run that was already settled
// when `load()` opened it is paginated there directly; this covers the other
// case, where polling is what first learns the run has finished. Gated on
// `openedGeneration` for the same reason as the retry above: `inFlight` reads
// through `props.runId` immediately on a switch, so it can reflect a previous
// visit's retained cache before the new run's own `openRun` has resolved.
watch(inFlight, (isInFlight, wasInFlight) => {
	if (wasInFlight && !isInFlight && openedGeneration === loadGeneration) {
		void loadRemainingResults(loadGeneration);
	}
});
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
				:tool-calls="row.toolCalls"
				:project-id="projectId"
				:what-to-check="row.whatToCheck"
				:disabled="disabled"
				:running-check="row.status === 'waiting'"
				view="complete"
				:test-id="`agent-eval-check-${row.id}`"
				@actually-fine="onActuallyFine(row.id)"
				@rerun-check="onRerunCheck(row.id)"
				@save-what-to-check="onSaveWhatToCheck(row.id, $event)"
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
	background-color: var(--background--base);
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
