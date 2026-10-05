<script setup lang="ts">
/**
 * The checks card in the builder thread (Checks prototype). Takes the slot of
 * the "Test your agent" card and is always one card, at the end of the thread.
 * It moves one step at a time: the first try runs on its own; if it needs work,
 * the card shows the judge's suggested fix and applies it only when the person
 * says so; then it checks again, says what improved, and only then offers
 * trickier messages. A run shows as one live line and ends as a summary with one
 * fix for everything that needs work. Finished steps fold into a line on top.
 *
 * What it shows is read back from the agent's checks and runs, so a reload lands
 * where the user left off. Everything goes through the evals API, like the
 * Checks tab: prepared cases, row writes, subset runs and ratings.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { InstanceAiChecksFixHandoffContext } from '@n8n/api-types';
import { N8nAiActivityStep, N8nButton, N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as agentEvalsApi from '../../agentEvals.api';
import { useAgentEvalsStore } from '../../agentEvals.store';
import type { AgentEvalCase, AgentEvalResultRecord } from '../../agentEvals.types';
import { agentsEventBus, type AgentUpdatedEvent } from '../../agents.eventBus';
import { getAgent } from '../../composables/useAgentApi';
import { isDataTableDataset, toCaseSource } from '../../utils/agentEvalCases.utils';
import { runOncePerAgent } from '../../utils/agentChecksOnboarding';
import {
	buildChecks,
	nameFromRule,
	suggestionsOf,
	type AgentCheckExample,
} from '../../utils/agentChecks.utils';
import AgentCheckSlider from './AgentCheckSlider.vue';
import AgentCheckStack from './AgentCheckStack.vue';
import AgentReaction from './AgentReaction.vue';

/** What the thread needs for the chip above the composer while the card is out of view. */
export type AgentChecksOnboardingProgress = {
	running: boolean;
	done: number;
	total: number;
	needLook: number;
	finished: boolean;
	/** All done: the thread can leave the card where it is and let new messages flow below. */
	settled: boolean;
	/** Working again (running, fixing or showing results), so it belongs at the end of the thread. */
	busy: boolean;
};

const props = defineProps<{
	projectId: string;
	agentId: string;
}>();

const emit = defineEmits<{
	openPreview: [];
	openAgent: [];
	openChecks: [rowIds: number[]];
	fix: [message: string, context: InstanceAiChecksFixHandoffContext];
	progress: [progress: AgentChecksOnboardingProgress];
}>();

const PREPARED_COUNT = 8;
const DEFAULT_COUNT = 3;
const POLL_MS = 3000;
const RUN_HISTORY = 5;
const FACES = 6;

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const store = useAgentEvalsStore();

// `later` hides the offer until the agent changes. `fixRows` are the examples a fix
// was applied for; `fixSince` is the agent's updatedAt then, so a newer save means
// the fix is in and those rows run again; `fixed` marks that rerun as finished.
type Progress = {
	firstRowId?: number;
	later?: boolean;
	offerOpen?: boolean;
	fixRows?: number[];
	fixSince?: string;
	fixRunning?: boolean;
	fixed?: boolean;
};
const storageKey = computed(() => `N8N_AGENT_CHECKS_ONBOARDING:${props.agentId}`);
const isProgress = (value: unknown): value is Progress =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const readProgress = (): Progress => {
	try {
		const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey.value) ?? '{}');
		return isProgress(parsed) ? parsed : {};
	} catch {
		return {};
	}
};
const progress = ref<Progress>({});
const writeProgress = (patch: Progress) => {
	progress.value = { ...progress.value, ...patch };
	try {
		window.localStorage.setItem(storageKey.value, JSON.stringify(progress.value));
	} catch {
		// Progress also derives from the checks themselves; storage only remembers the clicks.
	}
};

const loading = ref(true);
const preparing = ref(false);
const runs = ref<AgentEvalResultRecord[][]>([]);
const fineIds = ref(new Set<string>());
const runInFlight = ref(false);
const busy = ref(false);
const count = ref(DEFAULT_COUNT);
const listOpen = ref(false);
const offerChanged = ref(false);
// Checks need the agent's own model; without one the first try waits for it.
const noModel = ref(false);
const isMissingModel = (error: unknown) =>
	error instanceof Error && /configured model/i.test(error.message);
const runStartedAt = ref<number | null>(null);
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let agentPoll: ReturnType<typeof setTimeout> | null = null;

const dataset = computed(() => {
	const newest = store.getDatasets(props.agentId)[0];
	return newest && isDataTableDataset(newest) ? newest : null;
});
const caseSource = computed(() => (dataset.value ? toCaseSource(dataset.value) : null));
const cases = computed(() => (dataset.value ? store.getCases(dataset.value.id) : []));
const suggestions = computed(() => suggestionsOf(cases.value));
const examples = computed<AgentCheckExample[]>(() =>
	buildChecks(cases.value, runs.value, fineIds.value).flatMap((check) => check.examples),
);

// The first try is the row the card picked first (remembered, since rows added
// later can have lower ids); without a record, the earliest added row.
const firstTry = computed(
	() =>
		examples.value.find((ex) => ex.rowId === progress.value.firstRowId) ??
		examples.value.reduce<AgentCheckExample | null>(
			(first, ex) => (!first || ex.rowId < first.rowId ? ex : first),
			null,
		),
);
const firstPending = computed(
	() =>
		!firstTry.value ||
		firstTry.value.state === 'running' ||
		(firstTry.value.state === 'not_run' && runInFlight.value),
);
const laterExamples = computed(() =>
	examples.value.filter((ex) => ex.rowId !== firstTry.value?.rowId),
);
// Once trickier messages run, the first try is folded into the batch as one of its results.
const batch = computed(() =>
	laterExamples.value.length > 0 && firstTry.value
		? [firstTry.value, ...laterExamples.value]
		: laterExamples.value,
);
const needWork = computed(() => batch.value.filter((ex) => ex.state === 'needs_work'));
const passed = computed(() => batch.value.filter((ex) => ex.state === 'pass'));
const runDone = computed(
	() => batch.value.filter((ex) => ex.state !== 'running' && ex.state !== 'not_run').length,
);
const runActive = computed(
	() =>
		batch.value.some((ex) => ex.state === 'running') ||
		(runInFlight.value && laterExamples.value.some((ex) => ex.state === 'not_run')),
);

const picked = computed(() => suggestions.value.slice(0, count.value));
// Newest first, so the one the slider just added shows at the top.
const pickedNewestFirst = computed(() =>
	[...picked.value]
		.reverse()
		.map((pick) => ({ key: pick.rowId, kind: pick.kind ?? null, input: pick.input })),
);
const sliderMax = computed(() => Math.max(1, suggestions.value.length));

const fixRows = computed(() => progress.value.fixRows ?? []);
const fixExamples = computed(() => examples.value.filter((ex) => fixRows.value.includes(ex.rowId)));
const fixedCount = computed(() => fixExamples.value.filter((ex) => ex.state === 'pass').length);
const fixWasFirst = computed(
	() => !!firstTry.value && fixRows.value.length === 1 && fixRows.value[0] === firstTry.value.rowId,
);
// The last fix finished and everything it covered passes now.
const fixWorked = computed(
	() =>
		!!progress.value.fixed &&
		fixExamples.value.length > 0 &&
		fixedCount.value === fixExamples.value.length,
);

/**
 * The one step the card shows. Steps follow each other; nothing runs side by side:
 * trying, then the first try's review, then the fix (updating, checking again),
 * then the offer, the run, and its summary.
 */
type Step =
	| 'noModel'
	| 'trying'
	| 'firstReview'
	| 'firstPass'
	| 'updating'
	| 'checking'
	| 'offer'
	| 'later'
	| 'running'
	| 'summary'
	| 'done';
const step = computed<Step>(() => {
	if (progress.value.fixRunning) return 'checking';
	if (progress.value.fixSince) return 'updating';
	if (noModel.value && !firstTry.value) return 'noModel';
	if (loading.value || preparing.value || firstPending.value || !firstTry.value) return 'trying';
	if (firstTry.value.state === 'needs_work' || firstTry.value.state === 'failed') {
		return 'firstReview';
	}
	if (laterExamples.value.length === 0) {
		if (progress.value.later) return 'later';
		// A passing first try is its own moment; trickier messages come when asked for.
		const offerShown =
			progress.value.offerOpen || offerChanged.value || (fixWasFirst.value && fixWorked.value);
		return offerShown ? 'offer' : 'firstPass';
	}
	if (runActive.value) return 'running';
	if (needWork.value.length > 0) return 'summary';
	return 'done';
});
// A fix that ran again and still didn't pass shows its review once more, with a new suggestion.
const stillFailing = computed(() => !!progress.value.fixed && !fixWorked.value);

const elapsed = computed(() => {
	const seconds = runStartedAt.value
		? Math.max(0, Math.round((now.value - runStartedAt.value) / 1000))
		: 0;
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
});

const caseOf = (rowId: number) => cases.value.find((c) => c.rowId === rowId);
const ruleOf = (rowId: number) => caseOf(rowId)?.whatToCheck ?? '';
const nameOf = (rowId: number) =>
	caseOf(rowId)?.check?.trim() || nameFromRule(ruleOf(rowId) || (caseOf(rowId)?.input ?? ''));

const reactionOf = (ex: AgentCheckExample) => {
	if (ex.state === 'running') return 'waiting';
	if (ex.state === 'needs_work') return 'needs_work';
	if (ex.state === 'failed') return 'failed';
	if (ex.state === 'not_run') return 'idle';
	return 'pass';
};

// The folded line for the first try, once the card has moved past it.
const firstLine = computed(() => {
	const first = firstTry.value;
	if (!first) return '';
	if (first.result && fineIds.value.has(first.result.id)) {
		return i18n.baseText('agents.builder.agentChecks.onboarding.triedFine');
	}
	return i18n.baseText('agents.builder.agentChecks.onboarding.triedGood');
});
// After a first-try fix, the congratulation takes the folded line's place.
const showFirstFixed = computed(
	() => fixWasFirst.value && fixWorked.value && !['checking', 'updating'].includes(step.value),
);
const showFirstLine = computed(
	() =>
		!!firstTry.value &&
		!showFirstFixed.value &&
		laterExamples.value.length === 0 &&
		!['trying', 'firstReview', 'firstPass', 'updating', 'checking'].includes(step.value),
);

const summaryLine = computed(() => {
	const total = batch.value.length;
	if (runActive.value) {
		return i18n.baseText('agents.builder.agentChecks.onboarding.runningLine', {
			adjustToNumber: total,
			interpolate: { count: String(total), done: String(runDone.value) },
		});
	}
	if (passed.value.length === total) {
		return i18n.baseText('agents.builder.agentChecks.onboarding.summaryAll', {
			adjustToNumber: total,
			interpolate: { count: String(total) },
		});
	}
	return i18n.baseText('agents.builder.agentChecks.onboarding.summarySome', {
		interpolate: { good: String(passed.value.length), total: String(total) },
	});
});

// The finished card collapses to this one line and stays where it finished in the thread.
const doneLine = computed(() => {
	const total = String(batch.value.length);
	const fixed = fixWorked.value ? fixExamples.value.length : 0;
	return fixed > 0
		? i18n.baseText('agents.builder.agentChecks.onboarding.doneFixed', {
				adjustToNumber: fixed,
				interpolate: { total, fixed: String(fixed) },
			})
		: i18n.baseText('agents.builder.agentChecks.onboarding.doneAll', { interpolate: { total } });
});
const kindOf = (ex: AgentCheckExample) =>
	ex.rowId === firstTry.value?.rowId
		? i18n.baseText('agents.builder.agentChecks.onboarding.firstCheck')
		: ex.kind;

// The congratulation, shown once the fix ran again and passed.
const fixedLine = computed(() => {
	if (fixWasFirst.value) {
		return i18n.baseText('agents.builder.agentChecks.onboarding.fixedOne', {
			interpolate: { check: nameOf(fixRows.value[0] ?? -1) },
		});
	}
	const asked = fixExamples.value.length;
	return i18n.baseText('agents.builder.agentChecks.onboarding.fixedAll', {
		adjustToNumber: asked,
		interpolate: { count: String(asked), total: String(batch.value.length) },
	});
});

async function loadRuns() {
	if (!dataset.value) return;
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
						take: 200,
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
	fineIds.value = new Set(
		ratings
			.flat()
			.filter((r) => r.vote === 'up')
			.map((r) => r.resultId),
	);
	const wasInFlight = runInFlight.value;
	runInFlight.value = page.data.some((run) => run.status === 'new' || run.status === 'running');
	if (wasInFlight && !runInFlight.value) store.bumpChecks();
	if (runInFlight.value) schedulePoll();
	else if (progress.value.fixRunning) finishFixRun();
}

function schedulePoll() {
	if (pollTimer) clearTimeout(pollTimer);
	pollTimer = setTimeout(() => {
		pollTimer = null;
		void loadRuns().catch(() => undefined);
	}, POLL_MS);
}

const loadCases = async () => {
	await store.fetchDatasets(props.projectId, props.agentId);
	if (caseSource.value) await store.fetchCases(props.projectId, caseSource.value);
};

const runRows = async (rowIds: number[]) => {
	if (!dataset.value || rowIds.length === 0) return;
	await store.startRun(props.projectId, props.agentId, dataset.value.id, {
		rowIds: rowIds.map(String),
	});
	runInFlight.value = true;
	store.bumpChecks();
	await loadRuns();
	schedulePoll();
};

const addRows = async (picks: AgentEvalCase[]) => {
	if (!caseSource.value) return;
	for (const pick of picks) {
		await store.updateCase(props.projectId, caseSource.value, pick.rowId, {
			input: pick.input,
			whatToCheck: pick.whatToCheck,
			suggested: false,
		});
	}
};

/** First visit: prepare checks, then try the most ordinary one once. */
const startFirstTry = async () => {
	preparing.value = true;
	try {
		if (!dataset.value || suggestions.value.length === 0) {
			await store.generateDraftCases(props.projectId, props.agentId, {
				count: PREPARED_COUNT,
				asSuggestions: true,
				...(dataset.value ? { datasetId: dataset.value.id } : {}),
			});
			await loadCases();
		}
		const pick =
			suggestions.value.find((s) => s.kind === 'Typical request') ?? suggestions.value[0];
		if (!pick) return;
		await addRows([pick]);
		writeProgress({ firstRowId: pick.rowId });
		await runRows([pick.rowId]);
	} catch (error) {
		if (isMissingModel(error)) noModel.value = true;
		else toast.showError(error, i18n.baseText('agents.builder.agentChecks.generateError'));
	} finally {
		preparing.value = false;
	}
};

const retryFirstTry = async () => {
	noModel.value = false;
	await runOncePerAgent(props.agentId, startFirstTry);
	await loadCases();
	await loadRuns();
};

const load = async () => {
	try {
		await loadCases();
		await loadRuns();
	} catch {
		// A failed read falls back to starting fresh below.
	}
	loading.value = false;
	if (!firstTry.value) {
		await runOncePerAgent(props.agentId, startFirstTry);
		// A second mount that joined the work picks up its result.
		progress.value = { ...readProgress(), ...progress.value };
		await loadCases();
		await loadRuns();
	}
};

async function rate(resultId: string) {
	await agentEvalsApi.rateResult(
		rootStore.restApiContext,
		props.projectId,
		props.agentId,
		resultId,
		{ vote: 'up' },
	);
	fineIds.value = new Set([...fineIds.value, resultId]);
}

const withBusy = async (work: () => Promise<void>) => {
	busy.value = true;
	try {
		await work();
	} finally {
		busy.value = false;
	}
};

const seeRows = (rowIds: number[]) => emit('openChecks', rowIds);

// First try

const onFine = async (example: AgentCheckExample | null) => {
	const resultId = example?.result?.id;
	if (!resultId) return;
	await withBusy(async () => {
		await rate(resultId);
		// A fine verdict closes any fix that covered it.
		if (progress.value.fixed && !fixWorked.value) {
			writeProgress({ fixed: false, fixRows: undefined });
		}
	});
};

const onRetryFirst = async () => {
	const first = firstTry.value;
	if (first) await runRows([first.rowId]);
};

// More checks

const onLater = () => {
	offerChanged.value = false;
	writeProgress({ later: true });
};

const onOfferAgain = () => writeProgress({ later: false, offerOpen: true });

const onTryTrickier = () => writeProgress({ offerOpen: true });

// A change to the agent is the moment to offer the trickier messages again.
const onAgentUpdated = (event?: AgentUpdatedEvent) => {
	if (event?.agentId !== props.agentId) return;
	// A model was just set: try the agent right away.
	if (noModel.value) {
		void retryFirstTry();
		return;
	}
	if (!progress.value.later) return;
	if (laterExamples.value.length > 0) return;
	offerChanged.value = true;
	writeProgress({ later: false });
};

const onRun = async () => {
	if (picked.value.length === 0) return;
	await withBusy(async () => {
		try {
			const picks = [...picked.value];
			await addRows(picks);
			runStartedAt.value = Date.now();
			const rowIds = picks.map((p) => p.rowId);
			// A new run starts a new story: the last fix's congratulation has been seen.
			writeProgress({ fixed: false, fixRows: undefined });
			await runRows(rowIds);
			seeRows(rowIds);
		} catch (error) {
			toast.showError(error, i18n.baseText('agents.builder.agentChecks.runError'));
		}
	});
};

// Fix: the person read the suggested fix and applied it, so the builder must not ask again.

// One short line in the thread; the builder reads each check, rule and fix from the context.
const fixHandoff = (list: AgentCheckExample[]) => ({
	message: i18n.baseText('agents.builder.agentChecks.applyFixShort', {
		adjustToNumber: list.length,
		interpolate: { count: String(list.length) },
	}),
	context: {
		source: 'agent-checks-fix' as const,
		agentId: props.agentId,
		fixes: list.map((ex) => ({
			check: nameOf(ex.rowId),
			rule: ruleOf(ex.rowId),
			input: ex.input,
			reason: ex.reason ?? '',
			fix:
				ex.suggestedFix ||
				i18n.baseText('agents.builder.agentChecks.applyFixFallback', {
					interpolate: { rule: ruleOf(ex.rowId) },
				}),
		})),
	},
});

const agentUpdatedAt = async () =>
	(await getAgent(rootStore.restApiContext, props.projectId, props.agentId)).updatedAt;

const applyFix = async (list: AgentCheckExample[]) => {
	if (list.length === 0) return;
	await withBusy(async () => {
		const fixSince = (await agentUpdatedAt()) ?? new Date().toISOString();
		writeProgress({
			fixRows: list.map((ex) => ex.rowId),
			fixSince,
			fixRunning: false,
			fixed: false,
		});
		const handoff = fixHandoff(list);
		emit('fix', handoff.message, handoff.context);
		pollAgent();
	});
};

const onCancelFix = () => {
	if (agentPoll) clearTimeout(agentPoll);
	writeProgress({ fixSince: undefined, fixRows: undefined });
};

// The builder saves the agent once it has made the change; then those examples run again.
function pollAgent() {
	if (agentPoll) clearTimeout(agentPoll);
	agentPoll = setTimeout(() => {
		agentPoll = null;
		void (async () => {
			const since = progress.value.fixSince;
			if (!since || progress.value.fixRunning) return;
			const updatedAt = await agentUpdatedAt().catch(() => since);
			if (updatedAt && updatedAt !== since) {
				writeProgress({ fixRunning: true });
				await runRows(fixRows.value);
				return;
			}
			pollAgent();
		})();
	}, POLL_MS);
}

function finishFixRun() {
	writeProgress({ fixRunning: false, fixSince: undefined, fixed: true });
}

// Start from the default count when prepared checks arrive; never past what's prepared.
watch(
	() => suggestions.value.length,
	(length, previous) => {
		if (length === 0) return;
		if (!previous) count.value = Math.min(DEFAULT_COUNT, length);
		else if (count.value > length) count.value = length;
	},
	{ immediate: true },
);

watch(
	[runActive, runDone, step, () => laterExamples.value.length, () => needWork.value.length],
	() =>
		emit('progress', {
			running: runActive.value,
			done: runDone.value,
			total: laterExamples.value.length,
			needLook: needWork.value.length,
			finished: laterExamples.value.length > 0 && !runActive.value,
			settled: step.value === 'done',
			busy: ['running', 'summary', 'updating', 'checking'].includes(step.value),
		}),
	{ immediate: true },
);

// A reload mid-run starts the clock at the first sight of the run.
watch(runActive, (active) => {
	if (active) runStartedAt.value ??= Date.now();
});

onMounted(() => {
	progress.value = readProgress();
	clock = setInterval(() => (now.value = Date.now()), 1000);
	agentsEventBus.on('agentUpdated', onAgentUpdated);
	void load().then(() => {
		if (progress.value.fixSince && !progress.value.fixRunning) pollAgent();
	});
});
onBeforeUnmount(() => {
	agentsEventBus.off('agentUpdated', onAgentUpdated);
	if (pollTimer) clearTimeout(pollTimer);
	if (agentPoll) clearTimeout(agentPoll);
	if (clock) clearInterval(clock);
});
</script>

<template>
	<div :class="$style.card" data-testid="agent-checks-onboarding" :data-step="step">
		<!-- Finished steps, folded to a line. -->
		<div
			v-if="showFirstLine && firstTry"
			:class="$style.past"
			data-testid="agent-checks-first-line"
		>
			<AgentReaction :kind="reactionOf(firstTry)" size="sm" />
			<span :class="$style.pastText">{{ firstLine }}</span>
			<N8nIconButton
				icon="message-square-share"
				variant="outline"
				size="small"
				:aria-label="i18n.baseText('agents.builder.agentChecks.onboarding.seeConversation')"
				:title="i18n.baseText('agents.builder.agentChecks.onboarding.seeConversation')"
				data-testid="agent-checks-see-first"
				@click="seeRows([firstTry.rowId])"
			/>
		</div>

		<!-- The congratulation after a fix: its own moment, before anything new is offered. -->
		<div v-if="showFirstFixed" :class="$style.won" data-testid="agent-checks-fixed">
			<AgentReaction kind="pass" size="sm" />
			<span>{{ fixedLine }}</span>
		</div>

		<!-- No model yet: say so and point at where to pick one, instead of trying forever. -->
		<template v-if="step === 'noModel'">
			<b :class="$style.title">{{
				i18n.baseText('agents.builder.agentChecks.onboarding.tryOnce')
			}}</b>
			<p :class="$style.verdict">
				<AgentReaction kind="idle" size="sm" />
				<span>{{ i18n.baseText('agents.builder.agentChecks.onboarding.noModel') }}</span>
			</p>
			<div :class="$style.acts">
				<N8nButton
					variant="solid"
					size="small"
					data-testid="agent-checks-choose-model"
					@click="emit('openAgent')"
				>
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.chooseModel') }}
				</N8nButton>
				<N8nButton
					variant="ghost"
					size="small"
					:loading="preparing"
					data-testid="agent-checks-retry-first"
					@click="retryFirstTry"
				>
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.tryAgain') }}
				</N8nButton>
			</div>
		</template>

		<!-- Trying the agent once. -->
		<template v-else-if="step === 'trying'">
			<b :class="$style.title">{{
				i18n.baseText('agents.builder.agentChecks.onboarding.tryOnce')
			}}</b>
			<div :class="$style.status">
				<AgentReaction kind="waiting" size="sm" />
				{{ i18n.baseText('agents.builder.agentChecks.onboarding.trying') }}
			</div>
		</template>

		<!-- The first try needs work: the message, what went wrong, the fix to apply. -->
		<template v-else-if="step === 'firstReview' && firstTry">
			<div :class="$style.head">
				<AgentReaction :kind="firstTry.state === 'failed' ? 'failed' : 'needs_work'" size="sm" />
				<b :class="$style.title">{{
					stillFailing && fixWasFirst
						? i18n.baseText('agents.builder.agentChecks.onboarding.stillNeedsWork')
						: i18n.baseText('agents.builder.agentChecks.onboarding.firstNeedsWork')
				}}</b>
			</div>
			<template v-if="firstTry.state === 'failed'">
				<p :class="$style.muted">
					{{ i18n.baseText('agents.builder.agentChecks.verdict.failed') }}
				</p>
				<div :class="$style.acts">
					<N8nButton variant="outline" size="small" @click="onRetryFirst">
						{{ i18n.baseText('agents.builder.agentChecks.onboarding.tryAgain') }}
					</N8nButton>
				</div>
			</template>
			<template v-else>
				<div :class="$style.field">
					<span :class="$style.label">{{
						i18n.baseText('agents.builder.agentChecks.onboarding.theMessage')
					}}</span>
					<p :class="$style.message">“{{ firstTry.input }}”</p>
				</div>
				<div :class="$style.field">
					<span :class="$style.label">{{
						i18n.baseText('agents.builder.agentChecks.onboarding.whatWentWrong')
					}}</span>
					<div :class="$style.found">
						<span>{{
							firstTry.reason || i18n.baseText('agents.builder.agentChecks.verdict.breaks')
						}}</span>
						<N8nIconButton
							icon="message-square-share"
							variant="outline"
							size="small"
							:aria-label="i18n.baseText('agents.builder.agentChecks.onboarding.seeConversation')"
							:title="i18n.baseText('agents.builder.agentChecks.onboarding.seeConversation')"
							data-testid="agent-checks-see-first"
							@click="seeRows([firstTry.rowId])"
						/>
					</div>
				</div>
				<!-- The change and the decision about it, together in one box. -->
				<div :class="$style.proposal">
					<span :class="$style.label">{{
						i18n.baseText('agents.builder.agentChecks.onboarding.suggestedFix')
					}}</span>
					<p :class="$style.fix">
						{{
							firstTry.suggestedFix ||
							i18n.baseText('agents.builder.agentChecks.onboarding.noFixText')
						}}
					</p>
					<div :class="$style.acts">
						<N8nButton
							variant="solid"
							size="small"
							:loading="busy"
							data-testid="agent-checks-fix-first"
							@click="applyFix([firstTry])"
						>
							{{ i18n.baseText('agents.builder.agentChecks.onboarding.applyFix') }}
						</N8nButton>
						<N8nButton variant="ghost" size="small" :disabled="busy" @click="onFine(firstTry)">
							{{ i18n.baseText('agents.builder.agentChecks.onboarding.thatsFine') }}
						</N8nButton>
					</div>
				</div>
			</template>
		</template>

		<!-- The first try passed: what was tried and what we found, then the next step on request. -->
		<template v-else-if="step === 'firstPass' && firstTry">
			<div :class="$style.head">
				<AgentReaction kind="pass" size="sm" />
				<b :class="$style.title">{{
					i18n.baseText('agents.builder.agentChecks.onboarding.firstPassed')
				}}</b>
			</div>
			<div :class="$style.field">
				<span :class="$style.label">{{
					i18n.baseText('agents.builder.agentChecks.onboarding.theMessage')
				}}</span>
				<p :class="$style.message">“{{ firstTry.input }}”</p>
			</div>
			<div :class="$style.field">
				<span :class="$style.label">{{
					i18n.baseText('agents.builder.agentChecks.onboarding.whatWentWrong')
				}}</span>
				<div :class="$style.found">
					<span>{{
						firstTry.reason || i18n.baseText('agents.builder.agentChecks.onboarding.passedFallback')
					}}</span>
					<span :class="$style.foundActs">
						<N8nIconButton
							icon="message-square-share"
							variant="outline"
							size="small"
							:aria-label="i18n.baseText('agents.builder.agentChecks.onboarding.seeConversation')"
							:title="i18n.baseText('agents.builder.agentChecks.onboarding.seeConversation')"
							data-testid="agent-checks-see-first"
							@click="seeRows([firstTry.rowId])"
						/>
					</span>
				</div>
			</div>
			<p v-if="suggestions.length" :class="$style.muted">
				{{ i18n.baseText('agents.builder.agentChecks.onboarding.morePossible') }}
			</p>
			<div v-if="suggestions.length" :class="$style.acts">
				<N8nButton
					variant="solid"
					size="small"
					data-testid="agent-checks-try-trickier"
					@click="onTryTrickier"
				>
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.tryTrickier') }}
				</N8nButton>
				<N8nButton variant="ghost" size="small" data-testid="agent-checks-later" @click="onLater">
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.later') }}
				</N8nButton>
			</div>
		</template>

		<!-- The fix is going in, then the examples it covers run again. -->
		<template v-else-if="step === 'updating' || step === 'checking'">
			<!-- One head tells it: worried and busy while the builder edits, looking again while it
			     checks; the smile comes with the result. -->
			<div :class="$style.head">
				<AgentReaction
					:kind="step === 'updating' ? 'needs_work' : 'waiting'"
					size="sm"
					:moving="step === 'updating'"
				/>
				<b :class="$style.title">{{
					i18n.baseText('agents.builder.agentChecks.onboarding.fixingTitle', {
						adjustToNumber: fixRows.length,
						interpolate: { count: String(fixRows.length) },
					})
				}}</b>
			</div>
			<!-- The same step rows the builder uses for its own work: the running one shimmers. -->
			<div :class="$style.steps">
				<N8nAiActivityStep
					:label="i18n.baseText('agents.builder.agentChecks.onboarding.updating')"
					:loading="step === 'updating'"
					:has-content="false"
				/>
				<N8nAiActivityStep
					v-if="step === 'checking'"
					:label="i18n.baseText('agents.builder.agentChecks.onboarding.checkingAgain')"
					loading
					:has-content="false"
				/>
			</div>
			<div v-if="step === 'updating'" :class="$style.acts">
				<N8nButton variant="ghost" size="small" @click="onCancelFix">
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.fixCancel') }}
				</N8nButton>
			</div>
		</template>

		<!-- Trickier messages, offered: the slider shows the variety; Later puts it away. -->
		<template v-else-if="step === 'offer'">
			<div :class="$style.offerHead" data-testid="agent-checks-offer">
				<b :class="$style.title">{{
					offerChanged
						? i18n.baseText('agents.builder.agentChecks.onboarding.offerChanged')
						: showFirstFixed
							? i18n.baseText('agents.builder.agentChecks.onboarding.offerAfterFix')
							: i18n.baseText('agents.builder.agentChecks.onboarding.offerTitle')
				}}</b>
			</div>
			<AgentCheckSlider
				v-model="count"
				:max="sliderMax"
				:label="
					i18n.baseText('agents.builder.agentChecks.onboarding.count', {
						adjustToNumber: count,
						interpolate: { count: String(count) },
					})
				"
				:accessible-label="i18n.baseText('agents.builder.agentChecks.onboarding.countLabel')"
			/>
			<AgentCheckStack :items="pickedNewestFirst" :reserve="suggestions.length" />
			<div :class="$style.acts">
				<N8nButton
					variant="solid"
					size="small"
					:loading="busy"
					:disabled="picked.length === 0"
					data-testid="agent-checks-check-agent"
					@click="onRun"
				>
					{{
						i18n.baseText('agents.builder.agentChecks.onboarding.runCount', {
							adjustToNumber: picked.length,
							interpolate: { count: String(picked.length) },
						})
					}}
				</N8nButton>
				<N8nButton variant="ghost" size="small" data-testid="agent-checks-later" @click="onLater">
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.later') }}
				</N8nButton>
			</div>
		</template>

		<!-- Put away for now: one quiet line that brings the offer back. -->
		<div v-else-if="step === 'later'" :class="$style.past" data-testid="agent-checks-later-line">
			<AgentReaction kind="idle" size="xs" />
			<span :class="$style.pastText">{{
				i18n.baseText('agents.builder.agentChecks.onboarding.laterLine')
			}}</span>
			<N8nButton variant="outline" size="small" @click="onOfferAgain">
				{{ i18n.baseText('agents.builder.agentChecks.onboarding.offerOpen') }}
			</N8nButton>
		</div>

		<!-- Done: one line that stays where it finished in the thread, and the next thing to do. -->
		<div v-else-if="step === 'done'" :class="$style.past" data-testid="agent-checks-done-line">
			<AgentReaction kind="pass" size="sm" />
			<div :class="$style.pastBody">
				<div :class="[$style.found, $style.doneText]">
					<span>{{ doneLine }}</span>
					<N8nIconButton
						icon="external-link"
						variant="outline"
						size="small"
						:aria-label="i18n.baseText('agents.builder.agentChecks.onboarding.seeInChecks')"
						:title="i18n.baseText('agents.builder.agentChecks.onboarding.seeInChecks')"
						data-testid="agent-checks-see-in-checks"
						@click="seeRows(batch.map((ex) => ex.rowId))"
					/>
				</div>
				<N8nButton
					variant="solid"
					size="small"
					data-testid="agent-checks-try-agent"
					@click="emit('openPreview')"
				>
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.tryYourAgent') }}
				</N8nButton>
			</div>
		</div>

		<!-- The run (the first try folded in): one live line, then its summary. -->
		<template v-else-if="step === 'running' || step === 'summary'">
			<button
				type="button"
				:class="$style.sumHead"
				:aria-expanded="listOpen"
				data-testid="agent-checks-run-row"
				@click="listOpen = !listOpen"
			>
				<span :class="$style.faces">
					<AgentReaction
						v-for="ex in batch.slice(0, FACES)"
						:key="ex.rowId"
						:kind="reactionOf(ex)"
						size="sm"
					/>
					<span v-if="batch.length > FACES" :class="$style.facesMore"
						>+{{ batch.length - FACES }}</span
					>
				</span>
				<span :class="$style.sumText">
					<b>{{ summaryLine }}</b>
					<small v-if="runActive">{{ elapsed }}</small>
				</span>
				<N8nIcon
					:icon="listOpen ? 'chevron-up' : 'chevron-down'"
					size="small"
					:class="$style.chev"
				/>
			</button>

			<div v-if="listOpen" :class="$style.sumRows">
				<button
					v-for="ex in batch"
					:key="ex.rowId"
					type="button"
					:class="$style.sumRow"
					@click="seeRows([ex.rowId])"
				>
					<AgentReaction :kind="reactionOf(ex)" size="sm" />
					<span :class="$style.rowText">
						<span :class="$style.kind">{{ kindOf(ex) }}</span>
						<span :class="$style.prompt">{{ ex.input }}</span>
					</span>
					<N8nIcon icon="chevron-right" size="small" :class="$style.chev" />
				</button>
			</div>

			<!-- Each one that needs work, laid out like the Checks tab: what we found, the
			     conversation, and the suggested instruction with its decision inside. -->
			<template v-if="step === 'summary'">
				<div
					v-for="ex in needWork"
					:key="ex.rowId"
					:class="$style.fail"
					data-testid="agent-checks-failure"
				>
					<AgentReaction kind="needs_work" size="sm" />
					<div :class="$style.failBody">
						<b :class="$style.failName">{{ nameOf(ex.rowId) }}</b>
						<div :class="$style.found">
							<span :class="$style.failReason">{{
								ex.reason || i18n.baseText('agents.builder.agentChecks.verdict.breaks')
							}}</span>
							<N8nIconButton
								icon="message-square-share"
								variant="outline"
								size="small"
								:aria-label="i18n.baseText('agents.builder.agentChecks.onboarding.seeConversation')"
								:title="i18n.baseText('agents.builder.agentChecks.onboarding.seeConversation')"
								@click="seeRows([ex.rowId])"
							/>
						</div>
						<div :class="$style.proposal">
							<span :class="$style.label">{{
								i18n.baseText('agents.builder.agentChecks.onboarding.suggestedFix')
							}}</span>
							<p :class="$style.fix">
								{{
									ex.suggestedFix ||
									i18n.baseText('agents.builder.agentChecks.onboarding.noFixText')
								}}
							</p>
							<div :class="$style.acts">
								<N8nButton
									variant="solid"
									size="small"
									:loading="busy"
									data-testid="agent-checks-fix-one"
									@click="applyFix([ex])"
								>
									{{ i18n.baseText('agents.builder.agentChecks.onboarding.applyFix') }}
								</N8nButton>
								<N8nButton
									variant="ghost"
									size="small"
									:disabled="busy"
									data-testid="agent-checks-not-problem"
									@click="onFine(ex)"
								>
									{{ i18n.baseText('agents.builder.agentChecks.onboarding.thatsFine') }}
								</N8nButton>
							</div>
						</div>
					</div>
				</div>
			</template>

			<div :class="$style.acts">
				<N8nButton
					v-if="step === 'summary' && needWork.length > 1"
					variant="solid"
					size="small"
					:loading="busy"
					data-testid="agent-checks-fix-caught"
					@click="applyFix(needWork)"
				>
					{{
						i18n.baseText('agents.builder.agentChecks.onboarding.applyFixes', {
							adjustToNumber: needWork.length,
							interpolate: { count: String(needWork.length) },
						})
					}}
				</N8nButton>
				<N8nButton
					v-if="runActive"
					variant="outline"
					size="small"
					data-testid="agent-checks-see-in-checks"
					@click="seeRows(batch.map((ex) => ex.rowId))"
				>
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.seeInChecks') }}
				</N8nButton>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.card {
	container-type: inline-size;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	margin: var(--spacing--2xs) 0;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	font-size: var(--font-size--sm);
}

// A card's title with its head beside it.
.head {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

// A finding with its conversation button at the end of the line.
.found {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	line-height: var(--line-height--xl);

	> :first-child {
		flex: 1;
		min-width: 0;
	}

	> button,
	.foundActs {
		flex-shrink: 0;
		margin-top: calc(-1 * var(--spacing--5xs));
	}
}

.doneText {
	align-self: stretch;
	color: var(--text-color);
}

.foundActs {
	display: inline-flex;
	gap: var(--spacing--5xs);
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	text-wrap: balance;
}

.muted {
	margin: 0;
	color: var(--text-color--subtle);
	line-height: var(--line-height--xl);
}

.status {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--text-color--subtle);
}

// A finished step: a head, one sentence and its button under it, over a hairline.
.past {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	min-height: var(--height--md);
	color: var(--text-color--subtle);

	&:not(:last-child) {
		padding-bottom: var(--spacing--2xs);
		border-bottom: var(--border-width) var(--border-style) var(--border-color--subtle);
	}
}

.pastBody {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.pastText {
	flex: 1;
	min-width: 0;
	line-height: var(--line-height--xl);
}

.won {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	background: var(--background--success);
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xl);
}

// Labelled fields, stacked: the label on top, the content right under it.
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.label {
	color: var(--text-color);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
}

.message,
.verdict,
.fix {
	margin: 0;
	line-height: var(--line-height--xl);
	overflow-wrap: anywhere;
}

.message {
	white-space: pre-wrap;
}

.verdict {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.proposal {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius--lg);
	background: var(--background--subtle);

	.acts {
		margin-top: var(--spacing--2xs);
	}
}

.acts {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.push {
	margin-left: auto;
}

.steps {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		display: flex;
		align-items: center;
		gap: var(--spacing--2xs);
		line-height: var(--line-height--xl);
	}
}

.stepDone {
	color: var(--text-color--subtle);
}

.stepLater {
	color: var(--text-color--subtler);
}

.offerHead {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.flag {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sumHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	color: var(--text-color);
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: 2px;
	}
}

.sumText {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	line-height: var(--line-height--md);

	b {
		font-weight: var(--font-weight--bold);
	}

	small {
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-variant-numeric: tabular-nums;
	}
}

.faces {
	display: inline-flex;
	flex-shrink: 0;

	> * + * {
		margin-left: calc(-1 * var(--spacing--4xs));
	}

	> .facesMore {
		align-self: center;
		margin-left: var(--spacing--3xs);
		color: var(--text-color--subtler);
		font-size: var(--font-size--2xs);
	}
}

// Plain divided rows, like the stack, so the open list doesn't nest boxes in the card.
.sumRows {
	overflow: hidden;
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);

	> * + * {
		border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	}
}

// Kind on top, the message under it on up to two lines, so the list shows the words.
.rowText {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.sumRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: 0;
	background: var(--background--surface);
	font: inherit;
	color: var(--text-color);
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: -2px;
	}
}

.kind {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}

.prompt {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	line-height: var(--line-height--xl);
}

.chev {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.fail {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: start;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	line-height: var(--line-height--xl);
}

.failBody {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.failName {
	font-weight: var(--font-weight--bold);
}

.failReason {
	color: var(--text-color--subtle);
}

// Narrow threads: the failure's button moves under its text.
@container (max-width: 380px) {
	.push {
		margin-left: 0;
	}
}
</style>
