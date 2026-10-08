<script setup lang="ts">
/**
 * The checks-have-run view behind `useTestAgentPreviewExperiment`: status
 * filter pills plus "Add a check" and "Run all checks" buttons up top, then each case as an
 * `AgentEvalTryRow` — replaces `AgentEvalResultsPanel`'s vote/comment review
 * model with the simpler row the rest of the experiment already uses.
 *
 * Rows have no scenario tag here — a run's result only ever carries
 * `input`/`output`/`status` (the Data Table has no column for it), so this
 * never passes `label` to `AgentEvalTryRow`.
 */
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { agentsEventBus } from '../agents.eventBus';
import { useAgentEvalsStore } from '../agentEvals.store';
import { MAX_APPLY_SUGGESTIONS } from '../agentEvals.types';
import {
	readAgentAnswer,
	readCaseRequest,
	readCaseWhatToCheck,
	readErrorMessage,
	readVerdictReasoning,
	readVerdictSuggestion,
	toAvatarKind,
} from '../utils/agent-eval-review';
import { toDisplayToolCalls } from '../utils/agent-eval-tool-calls';
import { isDataTableDataset, toCaseSource } from '../utils/agentEvalCases.utils';
import AgentAvatar, { type AgentAvatarKind } from './AgentAvatar.vue';
import AgentEvalAddCheckPanel from './AgentEvalAddCheckPanel.vue';
import { AGENT_CONFIG_FLUSH_KEY } from './agentBuilderInjectionKeys';
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

const review = computed(() => store.getReview(props.runId));
const results = computed(() => review.value.results);
const hasMore = computed(() => results.value.length < review.value.resultsCount);

// What the rows are drawn from. A run that has just started — "Run all checks", or
// an added check — has an empty review until its first read lands. Drawing from it
// would blank the whole view for a moment: the list collapses, the filters vanish,
// and everything below jumps. So the previous review stays on screen until the new
// one has something to show. Pagination keeps reading the live review above.
const shownReview = ref(review.value);
// The run the shown rows belong to.
const shownRunId = ref(props.runId);
watch(review, (next) => {
	if (next.run !== null || next.results.length > 0) {
		shownReview.value = next;
		shownRunId.value = props.runId;
	}
});
// The rows still belong to an earlier run, so acting on them would change a result the
// current run no longer holds (a delete would remove its dataset row and leave the
// new run's copy on screen). They stay visible but cannot be changed until the new
// run's review has loaded.
const showingPreviousRun = computed(() => shownRunId.value !== props.runId);
const inFlight = computed(() => store.isRunInFlight(props.runId));

type CheckRow = {
	id: string;
	/** The Data Table row this result came from — null if the run predates
	 *  `sourceRowId` or the case was created some other way. Deleting the
	 *  check needs this; nothing else in this row does. */
	sourceRowId: string | null;
	status: AgentAvatarKind;
	input: string;
	output: string | null;
	runAt: string | null;
	errorMessage: string | null;
	toolCalls: ToolCall[];
	whatToCheck: string | null;
	/** The judge's proposed instruction for a failed check, if it made one. */
	fixSuggestion: string | null;
};

const rows = computed<CheckRow[]>(() =>
	shownReview.value.results.map((result) => {
		return {
			id: result.id,
			sourceRowId: result.sourceRowId,
			status: toAvatarKind(result.status, result.verdict),
			input: readCaseRequest(result.input),
			output: readAgentAnswer(result.output),
			runAt: result.runAt,
			// Execution failures and a graded verdict never both exist for the
			// same row (a case that errored is never judged), so either reader
			// filling this in is unambiguous.
			errorMessage: readErrorMessage(result.errorDetails) ?? readVerdictReasoning(result.verdict),
			toolCalls: toDisplayToolCalls(result.toolCalls),
			whatToCheck: readCaseWhatToCheck(result.input),
			fixSuggestion: readVerdictSuggestion(result.verdict),
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

// Set when another surface (the chat's small rows) opened this view on one
// check. Claimed straight from the store, since the request was consumed
// before this panel mounted. The "all" filter keeps the row from being hidden.
const focusedResultId = ref<string | null>(null);

watch(
	() => store.focusedEvalResult,
	() => {
		const resultId = store.consumeFocusedEvalResult(props.agentId);
		if (!resultId) return;
		statusFilter.value = 'all';
		focusedResultId.value = resultId;
	},
	{ immediate: true },
);

async function onActuallyFine(resultId: string) {
	try {
		await store.acceptResult(props.projectId, props.agentId, resultId);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.acceptCaseError'));
	}
}

async function onRerunCheck(resultId: string) {
	try {
		await store.rerunResult(props.projectId, props.agentId, resultId);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.rerunCaseError'));
	}
}

const flushAgentConfig = inject(AGENT_CONFIG_FLUSH_KEY, null);
const applyingSuggestionIds = ref<string[]>([]);
const applyingAll = ref(false);

// One request takes at most MAX_APPLY_SUGGESTIONS results; any beyond that keep their
// suggestion and the button stays for the next press.
const applicableSuggestionIds = computed(() =>
	rows.value
		.filter((row) => row.fixSuggestion !== null && row.status !== 'waiting')
		.map((row) => row.id)
		.slice(0, MAX_APPLY_SUGGESTIONS),
);

// The backend rewrites the agent's instructions from the *saved* config, so pending
// local edits are flushed first. It then reruns just these results. The builder does not
// hear about its own tab's write over push, so it is told to refetch the config.
async function applySuggestions(resultIds: string[]) {
	if (resultIds.length === 0 || resultIds.some((id) => applyingSuggestionIds.value.includes(id))) {
		return;
	}
	applyingSuggestionIds.value = [...applyingSuggestionIds.value, ...resultIds];
	try {
		await flushAgentConfig?.();
		const applied = await store.applySuggestions(props.projectId, props.agentId, resultIds);
		if (applied) {
			agentsEventBus.emit('agentUpdated', { agentId: props.agentId, source: 'agent-evals' });
		}
	} catch (error) {
		const conflict = error instanceof ResponseError && error.httpStatusCode === 409;
		toast.showError(
			error,
			i18n.baseText(
				conflict
					? 'agents.builder.agentEvals.suggestion.conflictError'
					: 'agents.builder.agentEvals.suggestion.applyError',
			),
		);
	} finally {
		applyingSuggestionIds.value = applyingSuggestionIds.value.filter(
			(id) => !resultIds.includes(id),
		);
	}
}

async function onApplySuggestion(resultId: string) {
	await applySuggestions([resultId]);
}

async function onApplyAllSuggestions() {
	applyingAll.value = true;
	try {
		await applySuggestions(applicableSuggestionIds.value);
	} finally {
		applyingAll.value = false;
	}
}

// The rule is saved to the check's own dataset row first, so "Run all checks" — which
// reads the rows, not the snapshots — keeps the edit. The rerun then also saves it onto
// this result's snapshot. A result with no row to write to (an older run, or a dataset
// with no rule column) keeps the snapshot-only edit.
async function onSaveWhatToCheck(resultId: string, whatToCheck: string) {
	// `Number(null)` is 0, which would aim the write at a row that is not this check's.
	const sourceRowId = rows.value.find((row) => row.id === resultId)?.sourceRowId;
	const rowId = sourceRowId ? Number(sourceRowId) : Number.NaN;
	const source = addCheckSource.value;
	if (source && Number.isInteger(rowId)) {
		try {
			const saved = await store.updateCaseRule(props.projectId, source, rowId, whatToCheck);
			// Rerunning without the row saved would show the new rule now and lose it on the next full run.
			if (!saved) throw new Error('The check was not saved');
		} catch (error) {
			toast.showError(error, i18n.baseText('agents.builder.agentEvals.case.saveError'));
			return;
		}
	}
	try {
		await store.rerunResult(props.projectId, props.agentId, resultId, { whatToCheck });
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.review.rerunCaseError'));
	}
}

/** Resolves the run's own dataset into a writable case source — the only
 *  path "delete the check" has to the Data Table row, since this view never
 *  loads a case list of its own. */
function resolveCaseSource() {
	const datasetId = shownReview.value.run?.datasetId;
	if (!datasetId) return null;
	const dataset = store.getDatasets(props.agentId).find((d) => d.id === datasetId);
	return dataset && isDataTableDataset(dataset) ? toCaseSource(dataset) : null;
}

// Where a new check is written. Needs a column to store its rule in, since a
// check without a rule has nothing for the judge to grade it against.
const addCheckSource = computed(() => {
	const source = resolveCaseSource();
	return source?.columns.whatToCheck ? source : null;
});

const addCheckOpen = ref(false);
// Mounted on first open and kept after that, so closing and reopening the panel,
// or a rerun that briefly empties the review, doesn't draft a new batch of
// prepared cases.
const addCheckMounted = ref(false);

function toggleAddCheck() {
	addCheckMounted.value = true;
	addCheckOpen.value = !addCheckOpen.value;
}

async function onDeleteCheck(row: CheckRow) {
	const source = resolveCaseSource();
	if (!source || !row.sourceRowId) {
		toast.showError(
			new Error('Could not resolve this check’s dataset row'),
			i18n.baseText('agents.builder.agentEvals.case.removeError'),
		);
		return;
	}

	try {
		const deleted = await store.deleteCase(props.projectId, source, Number(row.sourceRowId));
		if (!deleted) {
			toast.showError(
				new Error('Failed to remove the test case'),
				i18n.baseText('agents.builder.agentEvals.case.removeError'),
			);
			return;
		}
		await store.deleteResult(props.projectId, props.agentId, row.id);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentEvals.case.removeError'));
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
		// The new run could not be read, so the earlier run's rows would stay on
		// screen for good. Show what the current run actually holds instead.
		shownReview.value = review.value;
		shownRunId.value = props.runId;
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
			<div :class="$style.actions">
				<N8nButton
					v-if="applicableSuggestionIds.length > 0 && !showingPreviousRun"
					variant="solid"
					size="small"
					:disabled="disabled || rerunning || inFlight || applyingSuggestionIds.length > 0"
					:loading="applyingAll"
					data-testid="agent-eval-checks-apply-all-suggestions"
					@click="onApplyAllSuggestions"
				>
					{{ i18n.baseText('agents.builder.agentEvals.suggestion.applyAll') }}
				</N8nButton>
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
			</div>
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
				:fix-suggestion="row.fixSuggestion"
				:applying-suggestion="applyingSuggestionIds.includes(row.id)"
				:disabled="disabled || showingPreviousRun"
				:running-check="row.status === 'waiting'"
				hide-revise
				view="complete"
				:focused="row.id === focusedResultId"
				:test-id="`agent-eval-check-${row.id}`"
				@actually-fine="onActuallyFine(row.id)"
				@rerun-check="onRerunCheck(row.id)"
				@apply-suggestion="onApplySuggestion(row.id)"
				@save-what-to-check="onSaveWhatToCheck(row.id, $event)"
				@delete-check="onDeleteCheck(row)"
			/>
		</div>

		<!-- Not tied to `addCheckSource`: a new run's review is empty until it loads, so the
		     source is briefly null after an add. Unmounting here would draft the prepared
		     cases again. The panel disables adding while its source is null. -->
		<AgentEvalAddCheckPanel
			v-if="addCheckMounted"
			v-show="addCheckOpen"
			:project-id="projectId"
			:agent-id="agentId"
			:case-source="addCheckSource"
			:disabled="disabled || showingPreviousRun"
			:busy="rerunning || inFlight"
			@close="addCheckOpen = false"
			@added="emit('rerun')"
		/>

		<!-- Gives way to the panel while it is open, and comes back when it is closed. -->
		<N8nButton
			v-if="addCheckSource && !addCheckOpen"
			variant="ghost"
			size="small"
			:disabled="disabled"
			data-testid="agent-eval-checks-add-check"
			@click="toggleAddCheck"
		>
			<template #icon>
				<N8nIcon icon="plus" size="small" />
			</template>
			{{ i18n.baseText('agents.builder.agentEvals.checks.addCheck') }}
		</N8nButton>

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

.actions {
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
	background-color: var(--background--surface);
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
