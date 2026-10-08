<script setup lang="ts">
/**
 * The Checks tab (prototype, behind `N8N_ENV_FEAT_AGENT_CHECKS`). Reads the
 * agent's newest eval dataset as checks: rows grouped by their check name, each
 * example judged against its rule by the eval runner. Prepared rows
 * (`suggested`) wait under the table until the user adds them.
 *
 * Everything goes through the existing evals API: case generation (as
 * suggestions, appended to the dataset), Data Table row writes, runs (whole
 * dataset or a few rows), and ratings for "Actually fine".
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { N8nActionDropdown, N8nButton, N8nLoading, N8nSpinner } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useRouter } from 'vue-router';
import { MODAL_CONFIRM } from '@/app/constants';
import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

import * as agentEvalsApi from '../../agentEvals.api';
import { useAgentEvalsStore } from '../../agentEvals.store';
import { getAgent } from '../../composables/useAgentApi';
import { useAgentChecksSafety } from '../../composables/useAgentChecksSafety';
import { useAgentConfirmationModal } from '../../composables/useAgentConfirmationModal';
import type { AgentEvalCase, AgentEvalResultRecord } from '../../agentEvals.types';
import { isDataTableDataset, toCaseSource } from '../../utils/agentEvalCases.utils';
import {
	buildChecks,
	checkCounts,
	matchesFilter,
	suggestionsOf,
	type AgentCheck,
	type AgentCheckExample,
	type AgentCheckFilter,
} from '../../utils/agentChecks.utils';
import AgentCheckFilters from './AgentCheckFilters.vue';
import AgentCheckRow from './AgentCheckRow.vue';
import AgentCheckSlider from './AgentCheckSlider.vue';
import AgentCheckStack from './AgentCheckStack.vue';
import AgentCheckSuggestions from './AgentCheckSuggestions.vue';
import AgentReaction from './AgentReaction.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	agentName?: string;
	disabled?: boolean;
	canRun?: boolean;
	agentUnsaved?: boolean;
	/** The agent's last save; a change after a requested fix runs every check again. */
	agentUpdatedAt?: string;
}>();

// How many past runs are read to find each example's newest result; runs can
// cover a subset of rows, so one run alone may not hold every example.
const RUN_HISTORY = 5;
const RESULTS_PER_RUN = 200;
const POLL_MS = 3000;
// Prepared up front on a first visit, so the empty state can show real checks.
const PREPARED_COUNT = 8;
const DEFAULT_COUNT = 4;

const i18n = useI18n();
const { load: loadSafety } = useAgentChecksSafety();
const toast = useToast();
const { openAgentConfirmationModal } = useAgentConfirmationModal();
const router = useRouter();
const rootStore = useRootStore();
const store = useAgentEvalsStore();
const { openAgentArtifactThread } = useInstanceAiHandoff();

const loading = ref(true);
const preparing = ref(false);
const runs = ref<AgentEvalResultRecord[][]>([]);
const fineResultIds = ref(new Set<string>());
const openKey = ref<string | null>(null);
const runningRows = ref(new Set<number>());
const runInFlight = ref(false);
const busy = ref(false);
const count = ref(DEFAULT_COUNT);
const filter = ref<AgentCheckFilter>('all');
const suggestionsOpen = ref(false);
const ownDraft = ref('');
const ownInput = ref<HTMLInputElement | null>(null);
const sectionEl = ref<HTMLElement | null>(null);
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const dataset = computed(() => {
	const newest = store.getDatasets(props.agentId)[0];
	return newest && isDataTableDataset(newest) ? newest : null;
});
const caseSource = computed(() => (dataset.value ? toCaseSource(dataset.value) : null));
const cases = computed(() => (dataset.value ? store.getCases(dataset.value.id) : []));
const suggestions = computed(() => suggestionsOf(cases.value));

const checks = computed(() =>
	buildChecks(cases.value, runs.value, fineResultIds.value).map((check) => ({
		...check,
		examples: check.examples.map((ex) =>
			runningRows.value.has(ex.rowId) ? { ...ex, state: 'running' as const } : ex,
		),
	})),
);
const counts = computed(() => checkCounts(checks.value));
const visibleChecks = computed(() =>
	checks.value.filter((check) => matchesFilter(check, filter.value)),
);
const sliderMax = computed(() => Math.max(1, suggestions.value.length));
const picked = computed(() => suggestions.value.slice(0, count.value));
// Newest first, so the one the slider just added shows at the top.
const pickedNewestFirst = computed(() =>
	[...picked.value]
		.reverse()
		.map((pick) => ({ key: pick.rowId, kind: pick.kind ?? null, input: pick.input })),
);

// A filter whose count drops to zero falls back to all checks.
watch(counts, (next) => {
	const empty =
		(filter.value === 'needs_work' && !next.needsWork) ||
		(filter.value === 'pass' && !next.pass) ||
		(filter.value === 'not_run' && !next.notRun);
	if (empty) filter.value = 'all';
});

/*
 * A fix sent to the builder is remembered with the agent's last save; once the
 * agent is saved again (the builder applied it), every check runs again, so a
 * fix that breaks another check doesn't go unnoticed.
 */
const fixKey = computed(() => `N8N_AGENT_CHECKS_FIX_PENDING:${props.agentId}`);
const readFixPending = (): string | null => {
	try {
		return window.localStorage.getItem(fixKey.value);
	} catch {
		return null;
	}
};
const fixPending = ref<string | null>(readFixPending());
const setFixPending = (since: string | null) => {
	fixPending.value = since;
	try {
		if (since === null) window.localStorage.removeItem(fixKey.value);
		else window.localStorage.setItem(fixKey.value, since);
	} catch {
		// Without storage the rerun only happens while this tab stays open.
	}
};
// One primary per surface: with two or more to apply, Apply all is it and each row's Apply steps back.
const showFixAll = computed(
	() => counts.value.needsWork > 1 && !runInFlight.value && fixPending.value === null,
);

function schedulePoll() {
	if (pollTimer) clearTimeout(pollTimer);
	pollTimer = setTimeout(() => {
		pollTimer = null;
		void loadRuns().catch(() => undefined);
	}, POLL_MS);
}

async function loadRuns() {
	if (!dataset.value) {
		runs.value = [];
		return;
	}
	const ctx = rootStore.restApiContext;
	const page = await agentEvalsApi.listRuns(ctx, props.projectId, props.agentId, dataset.value.id, {
		take: RUN_HISTORY,
		skip: 0,
	});
	const [details, ratings] = await Promise.all([
		Promise.all(
			page.data.map(
				async (run) =>
					await agentEvalsApi.getRunDetail(ctx, props.projectId, props.agentId, run.id, {
						take: RESULTS_PER_RUN,
						skip: 0,
					}),
			),
		),
		Promise.all(
			page.data.map(
				async (run) =>
					await agentEvalsApi.listLatestRatingsForRun(ctx, props.projectId, props.agentId, run.id),
			),
		),
	]);
	runs.value = details.map((detail) => detail.results.data);
	fineResultIds.value = new Set(
		ratings
			.flat()
			.filter((rating) => rating.vote === 'up')
			.map((rating) => rating.resultId),
	);
	runInFlight.value = page.data.some((run) => run.status === 'new' || run.status === 'running');
	if (runInFlight.value) schedulePoll();
	else runningRows.value = new Set();
}

const loadCases = async () => {
	await store.fetchDatasets(props.projectId, props.agentId);
	if (caseSource.value) await store.fetchCases(props.projectId, caseSource.value);
};

// A first visit with nothing to show prepares checks, so the empty state lists
// real ones. Uses the agent's own model, like "Generate test cases".
const prepare = async (datasetId?: string) => {
	preparing.value = true;
	try {
		await store.generateDraftCases(props.projectId, props.agentId, {
			count: PREPARED_COUNT,
			asSuggestions: true,
			...(datasetId ? { datasetId } : {}),
		});
		await loadCases();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.generateError'));
	} finally {
		preparing.value = false;
	}
};

const load = async () => {
	if (!props.agentId || props.agentUnsaved) {
		loading.value = false;
		return;
	}
	loading.value = true;
	try {
		await loadCases();
		await loadRuns();
		openKey.value ??= checks.value.find((check) => check.needsWork > 0)?.key ?? null;
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.loadError'));
	} finally {
		loading.value = false;
	}
	if (!dataset.value && !props.disabled) await prepare();
};

const startRun = async (rowIds?: number[]) => {
	if (!dataset.value) return;
	try {
		runningRows.value = new Set(
			rowIds ?? checks.value.flatMap((check) => check.examples.map((ex) => ex.rowId)),
		);
		await store.startRun(props.projectId, props.agentId, dataset.value.id, {
			...(rowIds ? { rowIds: rowIds.map(String) } : {}),
		});
		runInFlight.value = true;
		schedulePoll();
	} catch (error) {
		runningRows.value = new Set();
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.runError'));
	}
};

/** Turns prepared rows into checks, then runs just those rows. */
const addSuggestions = async (picks: AgentEvalCase[]) => {
	if (!caseSource.value || picks.length === 0) return;
	busy.value = true;
	try {
		for (const pick of picks) {
			await store.updateCase(props.projectId, caseSource.value, pick.rowId, {
				input: pick.input,
				whatToCheck: pick.whatToCheck,
				suggested: false,
			});
		}
		await startRun(picks.map((pick) => pick.rowId));
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.addError'));
	} finally {
		busy.value = false;
	}
};

/**
 * A check of the user's own, typed as a rule: the agent's model writes one
 * message that tests it, the check runs, and a failure opens with Fix the agent.
 */
const writingOwn = ref(false);
const addOwn = async (rule: string) => {
	writingOwn.value = true;
	try {
		const before = new Set(cases.value.map((evalCase) => evalCase.rowId));
		await store.generateDraftCases(props.projectId, props.agentId, {
			count: 1,
			rule,
			...(dataset.value ? { datasetId: dataset.value.id } : {}),
		});
		await loadCases();
		const created = cases.value.find((evalCase) => !before.has(evalCase.rowId));
		if (created) {
			openKey.value = created.check?.trim() || created.whatToCheck.trim() || null;
			filter.value = 'all';
			await startRun([created.rowId]);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.addError'));
	} finally {
		writingOwn.value = false;
	}
};

const onAddExample = async (check: AgentCheck, input: string) => {
	if (!caseSource.value) return;
	busy.value = true;
	try {
		const created = await store.createCase(props.projectId, caseSource.value, {
			input,
			whatToCheck: check.rule,
			check: check.name,
			kind: i18n.baseText('agents.builder.agentChecks.kind.yours'),
			suggested: false,
		});
		if (created) await startRun([created.rowId]);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.addError'));
	} finally {
		busy.value = false;
	}
};

// Deleting a check removes every example under it, so it asks first, like deleting an agent.
const onRemove = async (check: AgentCheck) => {
	const source = caseSource.value;
	if (!source) return;
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.builder.agentChecks.delete.title', {
			interpolate: { name: check.name },
		}),
		description: i18n.baseText('agents.builder.agentChecks.delete.description', {
			adjustToNumber: check.examples.length,
			interpolate: { count: String(check.examples.length) },
		}),
		confirmButtonText: i18n.baseText('agents.builder.agentChecks.delete.confirm'),
		cancelButtonText: i18n.baseText('generic.cancel'),
	});
	if (confirmed !== MODAL_CONFIRM) return;
	busy.value = true;
	try {
		for (const example of check.examples) {
			await store.deleteCase(props.projectId, source, example.rowId);
		}
		if (openKey.value === check.key) openKey.value = null;
		await loadCases();
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.delete.error'));
	} finally {
		busy.value = false;
	}
};

const onEditRule = async (check: AgentCheck, rule: string, recheck = false) => {
	if (!caseSource.value) return;
	busy.value = true;
	try {
		for (const example of check.examples) {
			await store.updateCase(props.projectId, caseSource.value, example.rowId, {
				input: example.input,
				whatToCheck: rule,
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.ruleError'));
		return;
	} finally {
		busy.value = false;
	}
	// From "Not right": the check now says what should have happened, so check again.
	if (recheck) await startRun(check.examples.map((ex) => ex.rowId));
};

const onRunCheck = async (check: AgentCheck) => {
	await startRun(check.examples.map((ex) => ex.rowId));
};

const onFine = async (example: AgentCheckExample) => {
	if (!example.result) return;
	try {
		await agentEvalsApi.rateResult(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			example.result.id,
			{ vote: 'up' },
		);
		fineResultIds.value = new Set([...fineResultIds.value, example.result.id]);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.fineError'));
	}
};

const agentAttachment = () => ({
	type: 'agent' as const,
	id: props.agentId,
	name: props.agentName,
	projectId: props.projectId,
});
const builderLaunch = () =>
	({
		source: 'agent_builder_page',
		origin: 'internal',
		sourceContext: { agentId: props.agentId },
	}) as const;

// The person read the suggested fix (in the row, or in each row behind "Apply N fixes")
// and applied it, so the builder makes the change without asking again. Once the
// agent is saved, every check runs again.
const fixItem = (check: AgentCheck, example: AgentCheckExample) => ({
	check: check.name,
	rule: check.rule,
	input: example.input,
	reason: example.reason ?? '',
	fix:
		example.suggestedFix ||
		i18n.baseText('agents.builder.agentChecks.applyFixFallback', {
			interpolate: { rule: check.rule },
		}),
});

// One short line in the new builder thread; the builder reads the fixes from the context.
const sendFix = async (fixes: Array<ReturnType<typeof fixItem>>) => {
	if (fixes.length === 0) return;
	const opened = await openAgentArtifactThread(agentAttachment(), builderLaunch(), {
		sendMessage: i18n.baseText('agents.builder.agentChecks.applyFixShort', {
			adjustToNumber: fixes.length,
			interpolate: { count: String(fixes.length) },
		}),
		context: { source: 'agent-checks-fix', agentId: props.agentId, fixes },
		// The builder works in the background; the person stays on Checks and the rows rerun here.
		stay: true,
		onThread: (threadId) => (fixThreadId.value = threadId),
	});
	if (!opened) return;
	fixingCount.value = fixes.length;
	const since = (await currentUpdatedAt()) ?? props.agentUpdatedAt ?? new Date().toISOString();
	setFixPending(since);
	pollAgent();
};

const fixingCount = ref(0);
const fixThreadId = ref<string | null>(null);
let agentPoll: ReturnType<typeof setTimeout> | null = null;

const currentUpdatedAt = async () =>
	await getAgent(rootStore.restApiContext, props.projectId, props.agentId)
		.then((agent) => agent.updatedAt)
		.catch(() => null);

// The builder saves the agent once the fix is in; then every check runs again here.
const onAgentSaved = async (updatedAt: string | null | undefined) => {
	if (!fixPending.value || !updatedAt || updatedAt === fixPending.value) return;
	setFixPending(null);
	if (agentPoll) clearTimeout(agentPoll);
	filter.value = 'all';
	await startRun();
};

function pollAgent() {
	if (agentPoll) clearTimeout(agentPoll);
	agentPoll = setTimeout(() => {
		agentPoll = null;
		void (async () => {
			if (!fixPending.value) return;
			await onAgentSaved(await currentUpdatedAt());
			if (fixPending.value) pollAgent();
		})();
	}, POLL_MS);
}

const onFix = async (check: AgentCheck, example: AgentCheckExample) =>
	await sendFix([fixItem(check, example)]);

const onFixAll = async () =>
	await sendFix(
		checks.value.flatMap((check) => {
			const bad = check.examples.find((ex) => ex.state === 'needs_work');
			return bad ? [fixItem(check, bad)] : [];
		}),
	);

// With fixes to apply, Run all moves into the menu so the toolbar has one primary action.
type ToolbarAction = 'run-all' | 'view-builder';
const toolbarMenu = computed(
	(): Array<ActionDropdownItem<ToolbarAction>> => [
		...(fixPending.value && fixThreadId.value
			? [
					{
						id: 'view-builder' as const,
						label: i18n.baseText('agents.builder.agentChecks.viewInBuilder'),
					},
				]
			: []),
		{
			id: 'run-all',
			label: i18n.baseText('agents.builder.agentChecks.runAll'),
			disabled: !props.canRun || runInFlight.value || busy.value || !!fixPending.value,
		},
	],
);
const onToolbarMenu = async (action: ToolbarAction) => {
	if (action === 'run-all') await startRun();
	else if (fixThreadId.value) {
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId: fixThreadId.value } });
	}
};

watch(() => props.agentUpdatedAt, onAgentSaved);

// The thread card ran checks: pick up its rows and results here too.
watch(
	() => store.checksVersion,
	async () => {
		await loadCases();
		await loadRuns();
	},
);

const submitOwnFromEmpty = async () => {
	const value = ownDraft.value.trim();
	if (!value) return;
	ownDraft.value = '';
	await addOwn(value);
};

// Keep the slider inside what's prepared; when prepared checks first arrive,
// start from the default count.
watch(
	() => suggestions.value.length,
	(length, previous) => {
		if (length === 0) return;
		if (!previous) count.value = Math.min(DEFAULT_COUNT, length);
		else if (count.value > length) count.value = length;
	},
);

// The builder thread asks to show rows here (a run it started, an example to see, or
// "See in Checks" while this tab is already open): reload, then point at those checks
// for a moment. One check opens; several are only highlighted, so the list stays scannable.
const flashKeys = ref(new Set<string>());
let flashTimer: ReturnType<typeof setTimeout> | null = null;
const focusRows = async (rowIds: number[]) => {
	await loadCases();
	await loadRuns();
	const targets = checks.value.filter((check) =>
		check.examples.some((ex) => rowIds.includes(ex.rowId)),
	);
	const [first] = targets;
	if (!first) return;
	filter.value = 'all';
	if (targets.length === 1) openKey.value = first.key;
	flashKeys.value = new Set(targets.map((check) => check.key));
	if (flashTimer) clearTimeout(flashTimer);
	flashTimer = setTimeout(() => (flashKeys.value = new Set()), 1600);
	await nextTick();
	sectionEl.value
		?.querySelector(`[data-check-key="${CSS.escape(first.key)}"]`)
		?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};
watch(
	() => store.checksFocus,
	(request) => {
		if (request?.agentId === props.agentId) void focusRows(request.rowIds);
	},
);

onMounted(async () => {
	void loadSafety(props.projectId, props.agentId);
	await load();
	// A fix asked for before a reload is still on its way: keep watching for the save.
	if (fixPending.value) pollAgent();
	const request = store.checksFocus;
	if (request?.agentId === props.agentId) await focusRows(request.rowIds);
});
watch(() => props.agentId, load);
onBeforeUnmount(() => {
	if (pollTimer) clearTimeout(pollTimer);
	if (agentPoll) clearTimeout(agentPoll);
	if (flashTimer) clearTimeout(flashTimer);
});
</script>

<template>
	<div ref="sectionEl" :class="$style.section" data-testid="agent-checks-section">
		<N8nLoading v-if="loading" :rows="4" />

		<template v-else-if="checks.length > 0">
			<div :class="$style.toolbar">
				<AgentCheckFilters v-model="filter" :counts="counts" :running="runInFlight" />
				<span :class="$style.tools">
					<!-- While the builder fixes, the main button says so (no status text in the toolbar). -->
					<template v-if="fixPending">
						<N8nButton
							variant="outline"
							size="small"
							disabled
							data-testid="agent-checks-fix-pending"
						>
							<N8nSpinner size="small" :class="$style.spin" />
							{{
								fixingCount
									? i18n.baseText('agents.builder.agentChecks.fixingCount', {
											adjustToNumber: fixingCount,
											interpolate: { count: String(fixingCount) },
										})
									: i18n.baseText('agents.builder.agentChecks.fixingChecks')
							}}
						</N8nButton>
						<N8nActionDropdown
							:items="toolbarMenu"
							activator-icon="ellipsis"
							data-testid="agent-checks-toolbar-more"
							@select="onToolbarMenu"
						/>
					</template>
					<template v-else-if="showFixAll">
						<N8nButton
							variant="solid"
							size="small"
							:disabled="disabled || busy"
							data-testid="agent-checks-fix-all"
							@click="onFixAll"
						>
							{{
								i18n.baseText('agents.builder.agentChecks.onboarding.applyFixes', {
									adjustToNumber: counts.needsWork,
									interpolate: { count: String(counts.needsWork) },
								})
							}}
						</N8nButton>
						<N8nActionDropdown
							:items="toolbarMenu"
							activator-icon="ellipsis"
							data-testid="agent-checks-toolbar-more"
							@select="onToolbarMenu"
						/>
					</template>
					<N8nButton
						v-else
						variant="outline"
						size="small"
						:disabled="!canRun || runInFlight || busy"
						:loading="runInFlight"
						data-testid="agent-checks-run-all"
						@click="startRun()"
					>
						{{ i18n.baseText('agents.builder.agentChecks.runAll') }}
					</N8nButton>
				</span>
			</div>

			<div :class="$style.list" role="list">
				<AgentCheckRow
					v-for="check in visibleChecks"
					:key="check.key"
					role="listitem"
					:data-check-key="check.key"
					:class="{ [$style.flash]: flashKeys.has(check.key) }"
					:check="check"
					:open="openKey === check.key"
					:running="check.examples.some((ex) => ex.state === 'running')"
					:disabled="disabled || busy || !!fixPending"
					:can-run="canRun && !runInFlight && !fixPending"
					:secondary-apply="showFixAll"
					@toggle="openKey = openKey === check.key ? null : check.key"
					@run="onRunCheck"
					@fix="onFix"
					@fine="onFine"
					@edit-rule="onEditRule"
					@remove="onRemove"
					@add-example="onAddExample"
				/>
			</div>

			<AgentCheckSuggestions
				:suggestions="suggestions"
				:open="suggestionsOpen"
				:disabled="disabled || busy"
				:writing="writingOwn"
				@toggle="suggestionsOpen = !suggestionsOpen"
				@add="addSuggestions([$event])"
				@add-own="addOwn"
			/>
		</template>

		<div v-else :class="$style.empty" data-testid="agent-checks-empty">
			<div :class="$style.heads">
				<AgentReaction kind="waiting" size="md" />
				<AgentReaction kind="waiting" size="md" />
				<AgentReaction kind="waiting" size="md" />
			</div>
			<b :class="$style.emptyTitle">{{
				i18n.baseText('agents.builder.agentChecks.empty.title')
			}}</b>
			<p :class="$style.emptyText">
				{{
					preparing
						? i18n.baseText('agents.builder.agentChecks.empty.preparing')
						: i18n.baseText('agents.builder.agentChecks.empty.description')
				}}
			</p>

			<template v-if="suggestions.length > 0">
				<AgentCheckSlider
					v-model="count"
					:class="$style.emptySlider"
					:max="sliderMax"
					:label="
						i18n.baseText('agents.builder.agentChecks.empty.count', {
							adjustToNumber: count,
							interpolate: { count: String(count) },
						})
					"
					:accessible-label="i18n.baseText('agents.builder.agentChecks.empty.countLabel')"
				/>
				<AgentCheckStack :items="pickedNewestFirst" :class="$style.picks">
					<template #top>
						<label :class="$style.ownPick">
							<AgentReaction :kind="writingOwn ? 'waiting' : 'idle'" size="row" />
							<input
								ref="ownInput"
								v-model="ownDraft"
								:class="$style.ownInput"
								type="text"
								:disabled="disabled || busy || writingOwn"
								:placeholder="
									writingOwn
										? i18n.baseText('agents.builder.agentChecks.suggestions.writing')
										: i18n.baseText('agents.builder.agentChecks.suggestions.own')
								"
								data-testid="agent-checks-own"
								@keydown.enter.prevent="submitOwnFromEmpty"
							/>
						</label>
					</template>
				</AgentCheckStack>
				<div :class="$style.emptyActions">
					<N8nButton
						variant="solid"
						:disabled="disabled || busy"
						:loading="busy"
						data-testid="agent-checks-add"
						@click="addSuggestions(picked)"
					>
						{{
							i18n.baseText('agents.builder.agentChecks.empty.add', {
								adjustToNumber: count,
								interpolate: { count: String(count) },
							})
						}}
					</N8nButton>
					<N8nButton variant="ghost" :disabled="disabled || busy" @click="ownInput?.focus()">
						{{ i18n.baseText('agents.builder.agentChecks.empty.addOwn') }}
					</N8nButton>
				</div>
			</template>

			<N8nButton
				v-else-if="!preparing"
				variant="solid"
				:disabled="disabled"
				data-testid="agent-checks-prepare"
				@click="prepare(dataset?.id)"
			>
				{{ i18n.baseText('agents.builder.agentChecks.empty.prepare') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.section {
	container: checks / inline-size;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
}

.spin {
	margin-inline-end: var(--spacing--4xs);
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

// Same corner radius as the filter buttons and toolbar above it.
.list {
	overflow: hidden;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);
}

// With one check open, the closed ones step back so the open one is the focus.
.list:has(> [data-open]) > :not([data-open]) {
	background: var(--background--subtle);
}

.flash {
	animation: flash 1.6s ease-out;
}

@keyframes flash {
	0%,
	40% {
		background-color: color-mix(in srgb, var(--color--primary) 8%, transparent);
	}
	100% {
		background-color: transparent;
	}
}

@media (prefers-reduced-motion: reduce) {
	.flash {
		animation: none;
	}
}

.low {
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
}

.emptySlider {
	width: 100%;
}

.tools {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	max-width: 30rem;
	margin: 0 auto;
	padding: var(--spacing--xl) var(--spacing--sm);
	text-align: center;
}

.heads {
	display: flex;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--4xs);
}

.emptyTitle {
	font-size: var(--font-size--md);
}

.emptyText {
	margin: 0 0 var(--spacing--sm);
	max-width: 36ch;
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.picks {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	width: 100%;
	text-align: left;
}

.pickKind {
	flex-shrink: 0;
	max-width: 38%;
	overflow: hidden;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.ownPick {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	font-size: var(--font-size--sm);
	cursor: text;

	&:focus-within {
		border-color: var(--color--primary);
	}
}

.ownInput {
	flex: 1;
	min-width: 0;
	border: 0;
	outline: 0;
	background: transparent;
	font: inherit;
	color: var(--text-color);

	&::placeholder {
		color: var(--text-color--subtler);
	}
}

.emptyActions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
}
</style>
