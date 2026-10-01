<script setup lang="ts">
/**
 * The first-check card in the builder thread (Checks prototype). Takes the
 * slot of the "Test your agent" card and changes in place: first try, more
 * examples, the run in the background, the ones that need work, then it folds
 * into "Saved N checks" with the builder's wrap-up.
 *
 * The stage is read back from the agent's checks and runs, so a reload lands
 * where the user left off. Everything goes through the evals API, like the
 * Checks tab: prepared cases, row writes, subset runs and ratings.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nInput } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as agentEvalsApi from '../../agentEvals.api';
import { useAgentEvalsStore } from '../../agentEvals.store';
import type { AgentEvalCase, AgentEvalResultRecord } from '../../agentEvals.types';
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
import AgentCheckThread from './AgentCheckThread.vue';
import AgentReaction from './AgentReaction.vue';

/** What the thread needs for the chip above the composer while the card is out of view. */
export type AgentChecksOnboardingProgress = {
	running: boolean;
	done: number;
	total: number;
	needLook: number;
	finished: boolean;
};

const props = defineProps<{
	projectId: string;
	agentId: string;
}>();

const emit = defineEmits<{
	openPreview: [];
	openChecks: [];
	progress: [progress: AgentChecksOnboardingProgress];
}>();

const PREPARED_COUNT = 8;
const DEFAULT_COUNT = 3;
const POLL_MS = 3000;
const RUN_HISTORY = 5;

type Stage = 'loading' | 'preparing' | 'first' | 'examples' | 'running' | 'done' | 'folded';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const store = useAgentEvalsStore();

const storageKey = computed(() => `N8N_AGENT_CHECKS_ONBOARDING:${props.agentId}`);
type Progress = { confirmed?: boolean; skipped?: boolean; firstRowId?: number };
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
const writeProgress = (patch: Progress) => {
	try {
		window.localStorage.setItem(storageKey.value, JSON.stringify({ ...readProgress(), ...patch }));
	} catch {
		// Progress also derives from the checks themselves; storage only remembers the clicks.
	}
};

const stage = ref<Stage>('loading');
const runs = ref<AgentEvalResultRecord[][]>([]);
const fineIds = ref(new Set<string>());
const runInFlight = ref(false);
const busy = ref(false);
const count = ref(DEFAULT_COUNT);
const ruleDrafts = ref<Record<number, string>>({});
const firstNeedsWork = ref(false);
const firstRule = ref('');
const adding = ref(false);
const ownDraft = ref('');
const folded = ref(true);
const runOpen = ref(false);
const openRow = ref<number | null>(null);
const goodOpen = ref(false);
const runStartedAt = ref<number | null>(null);
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

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
const firstRowId = ref<number | null>(null);
const firstTry = computed(
	() =>
		examples.value.find((ex) => ex.rowId === firstRowId.value) ??
		examples.value.reduce<AgentCheckExample | null>(
			(first, ex) => (!first || ex.rowId < first.rowId ? ex : first),
			null,
		),
);
// The first try's reply isn't in yet: no result, or a result still running.
const firstPending = computed(
	() =>
		!firstTry.value ||
		firstTry.value.state === 'running' ||
		(firstTry.value.state === 'not_run' && runInFlight.value),
);
const laterExamples = computed(() =>
	examples.value.filter((ex) => ex.rowId !== firstTry.value?.rowId),
);
const ran = computed(() => examples.value.filter((ex) => ex.state !== 'not_run'));
const passed = computed(() => ran.value.filter((ex) => ex.state === 'pass'));
const needWork = computed(() => examples.value.filter((ex) => ex.state === 'needs_work'));
const picked = computed(() => suggestions.value.slice(0, count.value));
// Newest first, so the one the slider just added shows at the top.
const pickedNewestFirst = computed(() =>
	[...picked.value]
		.reverse()
		.map((pick) => ({ key: pick.rowId, kind: pick.kind ?? null, input: pick.input })),
);
// "Actually fine" and "Save check" both mark a result fine; those count as saved, not as went well.
const wentWell = computed(() =>
	passed.value.filter((ex) => !(ex.result && fineIds.value.has(ex.result.id))),
);
const savedWithRule = computed(() => passed.value.length - wentWell.value.length);
const settled = computed(() =>
	examples.value.filter((ex) => ex.state !== 'needs_work' && ex.state !== 'not_run'),
);
const lookTotal = ref(0);
const current = computed(() => needWork.value[0] ?? null);
const currentIndex = computed(() => Math.max(1, lookTotal.value - needWork.value.length + 1));
const runDone = computed(() => laterExamples.value.filter((ex) => ex.state !== 'running').length);
const elapsed = computed(() => {
	const seconds = runStartedAt.value
		? Math.max(0, Math.round((now.value - runStartedAt.value) / 1000))
		: 0;
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
});
const sliderMax = computed(() => Math.max(1, suggestions.value.length));

const ruleOf = (rowId: number) => cases.value.find((c) => c.rowId === rowId)?.whatToCheck ?? '';

const title = computed(() => {
	if (stage.value === 'running') {
		return i18n.baseText('agents.builder.agentChecks.onboarding.running', {
			interpolate: { count: String(laterExamples.value.length) },
		});
	}
	if (stage.value === 'done') {
		const total = ran.value.length;
		const good = wentWell.value.length;
		const left = needWork.value.length;
		if (left === 0) {
			return i18n.baseText('agents.builder.agentChecks.onboarding.allWent', {
				interpolate: { count: String(total) },
			});
		}
		return i18n.baseText('agents.builder.agentChecks.onboarding.someWent', {
			adjustToNumber: left,
			interpolate: { good: String(good), total: String(total), bad: String(left) },
		});
	}
	return i18n.baseText('agents.builder.agentChecks.onboarding.tryOnce');
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
	runInFlight.value = page.data.some((run) => run.status === 'new' || run.status === 'running');
	if (runInFlight.value) schedulePoll();
}

function schedulePoll() {
	if (pollTimer) clearTimeout(pollTimer);
	pollTimer = setTimeout(() => {
		pollTimer = null;
		void loadRuns()
			.then(deriveStage)
			.catch(() => undefined);
	}, POLL_MS);
}

const loadCases = async () => {
	await store.fetchDatasets(props.projectId, props.agentId);
	if (caseSource.value) await store.fetchCases(props.projectId, caseSource.value);
};

/** Reads the stage back from the checks and runs (plus the two remembered clicks). */
function deriveStage() {
	const progress = readProgress();
	const first = firstTry.value;
	if (!first) return;
	if (firstPending.value) {
		stage.value = 'first';
		return;
	}
	if (!progress.confirmed && laterExamples.value.length === 0) {
		stage.value = 'first';
		return;
	}
	if (laterExamples.value.length === 0) {
		stage.value = 'examples';
		return;
	}
	if (runInFlight.value || laterExamples.value.some((ex) => ex.state === 'running')) {
		stage.value = 'running';
		return;
	}
	if (needWork.value.length > 0 && !progress.skipped) {
		if (stage.value !== 'done') lookTotal.value = needWork.value.length;
		stage.value = 'done';
		return;
	}
	stage.value = 'folded';
}

const runRows = async (rowIds: number[]) => {
	if (!dataset.value) return;
	await store.startRun(props.projectId, props.agentId, dataset.value.id, {
		rowIds: rowIds.map(String),
	});
	runInFlight.value = true;
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
	stage.value = 'preparing';
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
		firstRowId.value = pick.rowId;
		writeProgress({ firstRowId: pick.rowId });
		stage.value = 'first';
		await runRows([pick.rowId]);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.generateError'));
		stage.value = 'first';
	}
};

const load = async () => {
	firstRowId.value = readProgress().firstRowId ?? null;
	try {
		await loadCases();
		await loadRuns();
	} catch {
		// A failed read falls back to starting fresh below.
	}
	if (!firstTry.value) {
		stage.value = 'preparing';
		await runOncePerAgent(props.agentId, startFirstTry);
		// A second mount that joined the work picks up its result.
		await loadCases();
		await loadRuns();
		firstRowId.value = readProgress().firstRowId ?? firstRowId.value;
	}
	deriveStage();
};

const onLooksGood = async () => {
	const first = firstTry.value;
	if (first?.state === 'needs_work' && first.result) await rate(first.result.id);
	writeProgress({ confirmed: true });
	stage.value = 'examples';
};

const onRetryFirst = async () => {
	const first = firstTry.value;
	if (!first) return;
	await runRows([first.rowId]);
};

const onFirstNeedsWork = () => {
	firstRule.value = ruleOf(firstTry.value?.rowId ?? -1);
	firstNeedsWork.value = true;
};

const onSaveFirst = async () => {
	const first = firstTry.value;
	if (!first || !caseSource.value) return;
	const rule = firstRule.value.trim();
	busy.value = true;
	try {
		if (rule) {
			await store.updateCase(props.projectId, caseSource.value, first.rowId, {
				input: first.input,
				whatToCheck: rule,
				check: nameFromRule(rule),
			});
		}
		writeProgress({ confirmed: true });
		firstNeedsWork.value = false;
		stage.value = 'examples';
	} finally {
		busy.value = false;
	}
};

const onCheckAgent = async () => {
	if (picked.value.length === 0) return;
	busy.value = true;
	try {
		const picks = [...picked.value];
		await addRows(picks);
		stage.value = 'running';
		runStartedAt.value = Date.now();
		runOpen.value = false;
		await runRows(picks.map((p) => p.rowId));
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.runError'));
	} finally {
		busy.value = false;
	}
};

const onAddOwn = async () => {
	const input = ownDraft.value.trim();
	if (!input || !caseSource.value) return;
	busy.value = true;
	try {
		await store.createCase(props.projectId, caseSource.value, {
			input,
			whatToCheck: '',
			check: nameFromRule(input),
			kind: i18n.baseText('agents.builder.agentChecks.kind.yours'),
			suggested: true,
		});
		ownDraft.value = '';
		adding.value = false;
		count.value = Math.min(count.value + 1, suggestions.value.length);
	} finally {
		busy.value = false;
	}
};

async function rate(resultId: string) {
	await agentEvalsApi.rateResult(
		rootStore.restApiContext,
		props.projectId,
		props.agentId,
		resultId,
		{
			vote: 'up',
		},
	);
	fineIds.value = new Set([...fineIds.value, resultId]);
}

// After a save, the next example that needs a look takes its place.
const settleRow = () => deriveStage();

/** Saves every example still waiting with its suggested rule. */
const onSaveRest = async () => {
	for (const example of [...needWork.value]) await onSaveCheck(example);
};

const onSaveCheck = async (example: AgentCheckExample) => {
	if (!caseSource.value) return;
	const rule = (ruleDrafts.value[example.rowId] ?? ruleOf(example.rowId)).trim();
	busy.value = true;
	try {
		await store.updateCase(props.projectId, caseSource.value, example.rowId, {
			input: example.input,
			whatToCheck: rule,
		});
		// Saved as a check that still needs work; it waits in the Checks tab for a fix.
		if (example.result) await rate(example.result.id);
		settleRow();
	} finally {
		busy.value = false;
	}
};

const onActuallyFine = async (example: AgentCheckExample) => {
	if (!example.result) return;
	busy.value = true;
	try {
		await rate(example.result.id);
		settleRow();
	} finally {
		busy.value = false;
	}
};

const onRemove = async (example: AgentCheckExample) => {
	if (!caseSource.value) return;
	busy.value = true;
	try {
		await store.deleteCase(props.projectId, caseSource.value, example.rowId);
		settleRow();
	} finally {
		busy.value = false;
	}
};

const onRuleInput = (rowId: number, event: Event) => {
	if (event.target instanceof HTMLTextAreaElement) {
		ruleDrafts.value = { ...ruleDrafts.value, [rowId]: event.target.value };
	}
};

const onSkip = () => {
	writeProgress({ skipped: true });
	stage.value = 'folded';
};

const reactionOf = (ex: AgentCheckExample) => {
	if (ex.state === 'running') return 'waiting';
	if (ex.state === 'needs_work') return 'needs_work';
	if (ex.state === 'failed') return 'failed';
	if (ex.state === 'not_run') return 'idle';
	return 'pass';
};

const wrapUp = computed(() => {
	const total = ran.value.length;
	const good = passed.value.length;
	if (good === total) {
		return i18n.baseText('agents.builder.agentChecks.onboarding.wrapAll', {
			interpolate: { count: String(total) },
		});
	}
	return i18n.baseText('agents.builder.agentChecks.onboarding.wrapSome', {
		interpolate: { good: String(good), total: String(total) },
	});
});

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
	[stage, runDone, () => laterExamples.value.length, () => needWork.value.length],
	() =>
		emit('progress', {
			running: stage.value === 'running',
			done: runDone.value,
			total: laterExamples.value.length,
			needLook: needWork.value.length,
			finished: stage.value === 'done' || stage.value === 'folded',
		}),
	{ immediate: true },
);

// A reload mid-run starts the clock at the first sight of the run.
watch(stage, (next) => {
	if (next === 'running') runStartedAt.value ??= Date.now();
});

onMounted(() => {
	clock = setInterval(() => (now.value = Date.now()), 1000);
	void load();
});
onBeforeUnmount(() => {
	if (pollTimer) clearTimeout(pollTimer);
	if (clock) clearInterval(clock);
});
</script>

<template>
	<div :class="$style.wrap" data-testid="agent-checks-onboarding">
		<!-- Folded: a small stack, one line, the rows open again on click. -->
		<template v-if="stage === 'folded'">
			<div :class="[$style.stack, { [$style.stackOpen]: !folded }]">
				<div :class="[$style.card, $style.foldCard]">
					<button
						type="button"
						:class="$style.foldHead"
						:aria-expanded="!folded"
						data-testid="agent-checks-onboarding-fold"
						@click="folded = !folded"
					>
						<span :class="$style.faces">
							<AgentReaction v-for="ex in ran" :key="ex.rowId" :kind="reactionOf(ex)" size="sm" />
						</span>
						<span :class="$style.foldLine">{{
							i18n.baseText('agents.builder.agentChecks.onboarding.saved', {
								adjustToNumber: passed.length,
								interpolate: { count: String(passed.length) },
							})
						}}</span>
						<N8nIcon :icon="folded ? 'chevron-down' : 'chevron-up'" size="small" />
					</button>
					<div v-if="!folded" :class="$style.rows">
						<div v-for="ex in examples" :key="ex.rowId" :class="$style.row">
							<div :class="$style.rowHead">
								<AgentReaction :kind="reactionOf(ex)" size="row" />
								<span :class="$style.kind">{{ ex.kind }}</span>
								<span :class="$style.prompt">{{ ex.input }}</span>
							</div>
						</div>
					</div>
				</div>
				<i :class="[$style.edge, $style.edge1]" aria-hidden="true" />
				<i :class="[$style.edge, $style.edge2]" aria-hidden="true" />
			</div>
			<p :class="$style.wrapUp">
				{{ wrapUp }}
				<button type="button" :class="$style.link" @click="emit('openChecks')">
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.checksTab') }}</button
				>.
			</p>
			<div>
				<N8nButton
					variant="outline"
					size="small"
					data-testid="agent-checks-open-preview"
					@click="emit('openPreview')"
				>
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.openPreview') }}
				</N8nButton>
			</div>
		</template>

		<div v-else :class="$style.card">
			<b v-if="stage !== 'examples' && stage !== 'running'" :class="$style.title">{{ title }}</b>

			<!-- First try: one sentence, the thread, the question. -->
			<template v-if="stage === 'loading' || stage === 'preparing' || stage === 'first'">
				<p :class="$style.intro">
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.intro') }}
				</p>
				<AgentCheckThread v-if="!firstPending && firstTry" :example="firstTry" />
				<div v-else :class="$style.trying">
					<AgentReaction kind="waiting" size="sm" />
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.trying') }}
				</div>
				<template v-if="!firstPending && firstTry">
					<template v-if="firstNeedsWork">
						<b :class="$style.ask">{{
							i18n.baseText('agents.builder.agentChecks.onboarding.shouldHave')
						}}</b>
						<N8nInput v-model="firstRule" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" />
						<div :class="$style.acts">
							<N8nButton variant="solid" size="small" :loading="busy" @click="onSaveFirst">
								{{ i18n.baseText('agents.builder.agentChecks.onboarding.saveCheck') }}
							</N8nButton>
						</div>
					</template>
					<template v-else-if="firstTry.state === 'failed'">
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
						<b :class="$style.ask">{{
							i18n.baseText('agents.builder.agentChecks.onboarding.lookRight')
						}}</b>
						<div :class="$style.acts">
							<N8nButton
								variant="outline"
								size="small"
								data-testid="agent-checks-looks-good"
								@click="onLooksGood"
							>
								{{ i18n.baseText('agents.builder.agentChecks.onboarding.looksGood') }}
							</N8nButton>
							<N8nButton variant="ghost" size="small" @click="onFirstNeedsWork">
								{{ i18n.baseText('agents.builder.agentChecks.onboarding.needsWork') }}
							</N8nButton>
						</div>
					</template>
				</template>
			</template>

			<!-- More examples: the saved first try, then the slider over the suggested checks, newest first. -->
			<template v-else-if="stage === 'examples'">
				<div v-if="firstTry" :class="$style.row">
					<div :class="$style.rowHead">
						<AgentReaction :kind="reactionOf(firstTry)" size="row" />
						<span :class="$style.kind">{{
							i18n.baseText('agents.builder.agentChecks.onboarding.yourTry')
						}}</span>
						<span :class="$style.prompt">{{ firstTry.input }}</span>
					</div>
				</div>
				<p :class="$style.muted">
					{{ i18n.baseText('agents.builder.agentChecks.onboarding.savedFirst') }}
				</p>
				<hr :class="$style.hr" />
				<b :class="$style.title">{{
					i18n.baseText('agents.builder.agentChecks.onboarding.more')
				}}</b>
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
				<AgentCheckStack :items="pickedNewestFirst">
					<template v-if="adding" #top>
						<label :class="$style.addRow">
							<N8nIcon icon="plus" size="small" />
							<input
								v-model="ownDraft"
								:class="$style.addInput"
								type="text"
								autofocus
								:placeholder="i18n.baseText('agents.builder.agentChecks.onboarding.ownPlaceholder')"
								data-testid="agent-checks-own-example"
								@keydown.enter.prevent="onAddOwn"
								@keydown.esc="adding = false"
							/>
						</label>
					</template>
				</AgentCheckStack>
				<div :class="$style.acts">
					<N8nButton
						variant="solid"
						size="small"
						:loading="busy"
						:disabled="picked.length === 0"
						data-testid="agent-checks-check-agent"
						@click="onCheckAgent"
					>
						{{ i18n.baseText('agents.builder.agentChecks.onboarding.checkAgent') }}
					</N8nButton>
					<N8nButton
						variant="ghost"
						size="small"
						data-testid="agent-checks-add-own"
						@click="adding = true"
					>
						{{ i18n.baseText('agents.builder.agentChecks.onboarding.addOwn') }}
					</N8nButton>
				</div>
			</template>

			<!-- Running: folded into one row, with a nudge to try the preview meanwhile. -->
			<template v-else-if="stage === 'running'">
				<button
					type="button"
					:class="$style.runHead"
					:aria-expanded="runOpen"
					data-testid="agent-checks-run-row"
					@click="runOpen = !runOpen"
				>
					<span :class="$style.faces">
						<AgentReaction
							v-for="ex in laterExamples.slice(0, 5)"
							:key="ex.rowId"
							:kind="reactionOf(ex)"
							size="xs"
						/>
						<span v-if="laterExamples.length > 5" :class="$style.facesMore"
							>+{{ laterExamples.length - 5 }}</span
						>
					</span>
					<span :class="$style.runText">
						<b>{{ title }}</b>
						<small>{{
							i18n.baseText('agents.builder.agentChecks.onboarding.progress', {
								interpolate: {
									done: String(runDone),
									total: String(laterExamples.length),
									elapsed,
								},
							})
						}}</small>
					</span>
					<N8nIcon
						:icon="runOpen ? 'chevron-up' : 'chevron-down'"
						size="small"
						:class="$style.chev"
					/>
				</button>
				<div v-if="runOpen" :class="$style.rows">
					<div v-for="ex in laterExamples" :key="ex.rowId" :class="$style.row">
						<div :class="$style.rowHead">
							<AgentReaction :kind="reactionOf(ex)" size="row" />
							<span :class="$style.kind">{{ ex.kind }}</span>
							<span :class="$style.prompt">{{ ex.input }}</span>
						</div>
					</div>
				</div>
				<div :class="$style.nudge">
					<span>{{ i18n.baseText('agents.builder.agentChecks.onboarding.nudge') }}</span>
					<N8nButton
						variant="outline"
						size="small"
						data-testid="agent-checks-run-preview"
						@click="emit('openPreview')"
					>
						{{ i18n.baseText('agents.builder.agentChecks.onboarding.openPreview') }}
					</N8nButton>
				</div>
			</template>

			<!-- After the run: what went well folds into one row; the rest come one at a time. -->
			<template v-else>
				<div v-if="settled.length" :class="[$style.good, { [$style.goodOpen]: goodOpen }]">
					<button
						type="button"
						:class="$style.goodHead"
						:aria-expanded="goodOpen"
						data-testid="agent-checks-went-well"
						@click="goodOpen = !goodOpen"
					>
						<span :class="$style.faces">
							<AgentReaction
								v-for="ex in settled.slice(0, 6)"
								:key="ex.rowId"
								:kind="reactionOf(ex)"
								size="xs"
							/>
							<span v-if="settled.length > 6" :class="$style.facesMore"
								>+{{ settled.length - 6 }}</span
							>
						</span>
						<span :class="$style.goodLine">{{
							savedWithRule > 0
								? i18n.baseText('agents.builder.agentChecks.onboarding.wentWellSaved', {
										interpolate: { count: String(wentWell.length), saved: String(savedWithRule) },
									})
								: i18n.baseText('agents.builder.agentChecks.onboarding.wentWell', {
										interpolate: { count: String(wentWell.length) },
									})
						}}</span>
						<N8nIcon
							:icon="goodOpen ? 'chevron-up' : 'chevron-down'"
							size="small"
							:class="$style.chev"
						/>
					</button>
					<div v-if="goodOpen" :class="$style.goodRows">
						<div v-for="ex in settled" :key="ex.rowId" :class="$style.goodRow">
							<button
								type="button"
								:class="$style.rowHead"
								:aria-expanded="openRow === ex.rowId"
								@click="openRow = openRow === ex.rowId ? null : ex.rowId"
							>
								<AgentReaction :kind="reactionOf(ex)" size="row" />
								<span :class="$style.kind">{{ ex.kind }}</span>
								<span :class="$style.prompt">{{ ex.input }}</span>
								<N8nIcon
									:icon="openRow === ex.rowId ? 'chevron-up' : 'chevron-down'"
									size="small"
									:class="$style.chev"
								/>
							</button>
							<div v-if="openRow === ex.rowId" :class="$style.rowBody">
								<AgentCheckThread :example="ex" />
							</div>
						</div>
					</div>
				</div>

				<div
					v-if="current"
					:key="current.rowId"
					:class="$style.current"
					data-testid="agent-checks-current"
				>
					<div :class="$style.currentHead">
						<span :class="$style.step">
							<AgentReaction kind="needs_work" size="xs" />
							{{
								i18n.baseText('agents.builder.agentChecks.onboarding.step', {
									interpolate: {
										index: String(currentIndex),
										total: String(Math.max(lookTotal, needWork.length)),
									},
								})
							}}
						</span>
						<span :class="$style.stepKind">{{ current.kind }}</span>
					</div>
					<AgentCheckThread :example="current" />
					<b :class="$style.ask">{{
						i18n.baseText('agents.builder.agentChecks.onboarding.shouldHave')
					}}</b>
					<div :class="$style.suggested">
						<span :class="$style.suggestedLabel"
							>✦ {{ i18n.baseText('agents.builder.agentChecks.onboarding.suggested') }}</span
						>
						<textarea
							:class="$style.suggestedInput"
							rows="3"
							:value="ruleDrafts[current.rowId] ?? ruleOf(current.rowId)"
							@input="onRuleInput(current.rowId, $event)"
						/>
					</div>
					<div :class="$style.acts">
						<N8nButton
							variant="solid"
							size="small"
							:disabled="busy"
							data-testid="agent-checks-save-check"
							@click="onSaveCheck(current)"
						>
							{{ i18n.baseText('agents.builder.agentChecks.onboarding.saveCheck') }}
						</N8nButton>
						<N8nButton
							variant="ghost"
							size="small"
							:disabled="busy"
							@click="onActuallyFine(current)"
						>
							{{ i18n.baseText('agents.builder.agentChecks.fine') }}
						</N8nButton>
						<N8nButton variant="ghost" size="small" :disabled="busy" @click="onRemove(current)">
							{{ i18n.baseText('agents.builder.agentChecks.onboarding.remove') }}
						</N8nButton>
					</div>
				</div>

				<div :class="$style.foot">
					<span>{{
						i18n.baseText('agents.builder.agentChecks.onboarding.savedCount', {
							adjustToNumber: passed.length,
							interpolate: { count: String(passed.length) },
						})
					}}</span>
					<N8nButton
						v-if="needWork.length > 1"
						variant="ghost"
						size="small"
						:disabled="busy"
						data-testid="agent-checks-save-rest"
						@click="onSaveRest"
					>
						{{ i18n.baseText('agents.builder.agentChecks.onboarding.saveRest') }}
					</N8nButton>
					<N8nButton
						v-else-if="needWork.length === 1"
						variant="ghost"
						size="small"
						data-testid="agent-checks-skip"
						@click="onSkip"
					>
						{{ i18n.baseText('agents.builder.agentChecks.onboarding.skip') }}
					</N8nButton>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.wrap {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin: var(--spacing--2xs) 0;
}

.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	font-size: var(--font-size--sm);
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.intro,
.muted {
	margin: 0;
	color: var(--text-color--subtle);
	line-height: var(--line-height--xl);
}

.muted {
	font-size: var(--font-size--xs);
}

.trying {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--text-color--subtle);
}

.ask {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
}

.acts {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.hr {
	width: 100%;
	margin: 0;
	border: 0;
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.row {
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.rowHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--md);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 0;
	border-radius: inherit;
	background: none;
	font: inherit;
	text-align: left;
	color: var(--text-color);

	&:is(button) {
		cursor: pointer;
	}

	&:is(button):hover:not(:disabled) {
		background: var(--background--hover);
	}
}

.kind {
	flex-shrink: 0;
	max-width: 38%;
	overflow: hidden;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.prompt {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chev {
	color: var(--text-color--subtler);
}

.rowBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs) var(--spacing--xs);
}

.suggested {
	position: relative;
}

.suggestedLabel {
	position: absolute;
	top: var(--spacing--3xs);
	left: var(--spacing--2xs);
	color: var(--text-color--warning);
	font-size: var(--font-size--2xs);
}

.suggestedInput {
	width: 100%;
	box-sizing: border-box;
	padding: var(--spacing--md) var(--spacing--2xs) var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);
	font: inherit;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color);
	resize: vertical;

	&:focus {
		outline: 0;
		border-color: var(--color--primary);
	}
}

.addRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	box-shadow: inset 0 0 0 1px var(--color--primary);
	color: var(--text-color--subtler);
	cursor: text;
}

.runHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
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

.runText {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;

	b {
		font-weight: var(--font-weight--bold);
	}

	small {
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-variant-numeric: tabular-nums;
	}
}

.facesMore {
	align-self: center;
	margin-left: var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.nudge {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin: 0 calc(-1 * var(--spacing--sm)) calc(-1 * var(--spacing--sm));
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) var(--spacing--sm);
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);

	span {
		flex: 1;
		min-width: 0;
	}
}

.good {
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.goodHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--height--lg);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: 0;
	background: none;
	font: inherit;
	color: var(--text-color);
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
	}
}

.goodLine {
	flex: 1;
	min-width: 0;
	color: var(--text-color--subtle);
}

.goodRows {
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
}

.goodRow + .goodRow {
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
}

.current {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color--warning);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.currentHead {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.step {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	font-weight: var(--font-weight--bold);
	font-variant-numeric: tabular-nums;
}

.stepKind {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}

.addInput {
	flex: 1;
	min-width: 0;
	border: 0;
	outline: 0;
	background: transparent;
	font: inherit;
	color: var(--text-color);
}

.foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--2xs);
	border-top: var(--border-width) var(--border-style) var(--border-color--subtle);
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
}

.stack {
	position: relative;
	padding-bottom: var(--spacing--2xs);
}

.foldCard {
	position: relative;
	z-index: 2;
	gap: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.foldHead {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	border: 0;
	background: none;
	font: inherit;
	text-align: left;
	cursor: pointer;
}

.faces {
	display: inline-flex;

	> * + * {
		margin-left: calc(-1 * var(--spacing--4xs));
	}
}

.foldLine {
	flex: 1;
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtle);
}

.edge {
	position: absolute;
	left: var(--spacing--3xs);
	right: var(--spacing--3xs);
	bottom: var(--spacing--4xs);
	height: var(--spacing--sm);
	border: var(--border);
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	background: var(--background--surface);
	z-index: 1;
}

.edge2 {
	left: var(--spacing--xs);
	right: var(--spacing--xs);
	bottom: 0;
	z-index: 0;
	background: var(--background--subtle);
}

.stackOpen .edge {
	display: none;
}

.wrapUp {
	margin: var(--spacing--2xs) 0 0;
	font-size: var(--font-size--md);
	line-height: var(--line-height--xl);
}

.link {
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	color: inherit;
	text-decoration: underline;
	text-underline-offset: 3px;
	cursor: pointer;
}
</style>
