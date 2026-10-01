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
import { N8nButton, N8nLoading } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

import * as agentEvalsApi from '../../agentEvals.api';
import { useAgentEvalsStore } from '../../agentEvals.store';
import type { AgentEvalCase, AgentEvalResultRecord } from '../../agentEvals.types';
import { isDataTableDataset, toCaseSource } from '../../utils/agentEvalCases.utils';
import {
	LOW_COVERAGE_THRESHOLD,
	buildChecks,
	checkCounts,
	matchesFilter,
	nameFromRule,
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
const toast = useToast();
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
const lowCoverage = computed(
	() => counts.value.total < LOW_COVERAGE_THRESHOLD && !runInFlight.value,
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
const showFixAll = computed(
	() =>
		counts.value.needsWork > 0 &&
		(filter.value === 'needs_work' || counts.value.needsWork === counts.value.total) &&
		!runInFlight.value &&
		fixPending.value === null,
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

/** A check of the user's own: the message is the example, the rule comes later. */
const addOwn = async (input: string) => {
	if (!caseSource.value) return;
	busy.value = true;
	try {
		const created = await store.createCase(props.projectId, caseSource.value, {
			input,
			whatToCheck: '',
			check: nameFromRule(input),
			kind: i18n.baseText('agents.builder.agentChecks.kind.yours'),
			suggested: false,
		});
		if (created) {
			openKey.value = created.check ?? null;
			await startRun([created.rowId]);
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.agentChecks.addError'));
	} finally {
		busy.value = false;
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

const onEditRule = async (check: AgentCheck, rule: string) => {
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
	} finally {
		busy.value = false;
	}
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

const fixItem = (check: AgentCheck, example: AgentCheckExample) =>
	i18n.baseText('agents.builder.agentChecks.fixAllItem', {
		interpolate: {
			check: check.name,
			rule: check.rule,
			input: example.input,
			reply: example.reply ?? '',
			reason: example.reason ?? '',
		},
	});

// Sends the fix request to the builder right away; the builder proposes the
// change and asks before applying it. Once the agent is saved, every check runs again.
const sendFix = async (message: string) => {
	const opened = await openAgentArtifactThread(agentAttachment(), builderLaunch(), {
		sendMessage: message,
	});
	if (opened) setFixPending(props.agentUpdatedAt ?? new Date().toISOString());
};

const onFix = async (check: AgentCheck, example: AgentCheckExample) => {
	await sendFix(
		i18n.baseText('agents.builder.agentChecks.fixPrompt', {
			interpolate: {
				check: check.name,
				rule: check.rule,
				input: example.input,
				reply: example.reply ?? '',
				reason: example.reason ?? '',
			},
		}),
	);
};

const onFixAll = async () => {
	const failing = checks.value.filter((check) => check.needsWork > 0);
	const items = failing.flatMap((check) => {
		const bad = check.examples.find((ex) => ex.state === 'needs_work');
		return bad ? [fixItem(check, bad)] : [];
	});
	if (items.length === 0) return;
	await sendFix(
		i18n.baseText('agents.builder.agentChecks.fixAllPrompt', {
			interpolate: { count: String(items.length), list: items.join('\n\n') },
		}),
	);
};

watch(
	() => props.agentUpdatedAt,
	async (updatedAt) => {
		if (!fixPending.value || !updatedAt || updatedAt === fixPending.value) return;
		setFixPending(null);
		filter.value = 'all';
		await startRun();
	},
);

const scrollTo = async (testId: string) => {
	await nextTick();
	sectionEl.value
		?.querySelector(`[data-testid="${testId}"]`)
		?.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

const onSeeSuggestions = async () => {
	suggestionsOpen.value = true;
	await scrollTo('agent-check-suggestions');
};

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

onMounted(load);
watch(() => props.agentId, load);
onBeforeUnmount(() => {
	if (pollTimer) clearTimeout(pollTimer);
});
</script>

<template>
	<div ref="sectionEl" :class="$style.section" data-testid="agent-checks-section">
		<N8nLoading v-if="loading" :rows="4" />

		<template v-else-if="checks.length > 0">
			<div :class="$style.toolbar">
				<span :class="$style.tools">
					<AgentCheckFilters v-model="filter" :counts="counts" :running="runInFlight" />
					<template v-if="lowCoverage">
						<span :class="$style.low">{{
							i18n.baseText('agents.builder.agentChecks.health.lowCoverage', {
								adjustToNumber: counts.total,
								interpolate: { count: String(counts.total) },
							})
						}}</span>
						<N8nButton
							v-if="suggestions.length > 0"
							variant="outline"
							size="small"
							data-testid="agent-checks-see-suggestions"
							@click="onSeeSuggestions"
						>
							{{ i18n.baseText('agents.builder.agentChecks.health.seeSuggestions') }}
						</N8nButton>
					</template>
				</span>
				<span :class="$style.tools">
					<span v-if="fixPending" :class="$style.low" data-testid="agent-checks-fix-pending">{{
						i18n.baseText('agents.builder.agentChecks.fixPending')
					}}</span>
					<N8nButton
						v-if="showFixAll"
						variant="solid"
						size="small"
						:disabled="disabled || busy"
						data-testid="agent-checks-fix-all"
						@click="onFixAll"
					>
						{{
							i18n.baseText('agents.builder.agentChecks.fixAll', {
								interpolate: { count: String(counts.needsWork) },
							})
						}}
					</N8nButton>
					<N8nButton
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
					:check="check"
					:open="openKey === check.key"
					:running="check.examples.some((ex) => ex.state === 'running')"
					:disabled="disabled || busy"
					:can-run="canRun && !runInFlight"
					@toggle="openKey = openKey === check.key ? null : check.key"
					@run="onRunCheck"
					@fix="onFix"
					@fine="onFine"
					@edit-rule="onEditRule"
					@add-example="onAddExample"
				/>
			</div>

			<AgentCheckSuggestions
				:suggestions="suggestions"
				:open="suggestionsOpen"
				:disabled="disabled || busy"
				@toggle="suggestionsOpen = !suggestionsOpen"
				@add="addSuggestions([$event])"
				@add-all="addSuggestions(suggestions)"
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
							<AgentReaction kind="idle" size="row" />
							<span :class="$style.pickKind">{{
								i18n.baseText('agents.builder.agentChecks.suggestions.custom')
							}}</span>
							<input
								ref="ownInput"
								v-model="ownDraft"
								:class="$style.ownInput"
								type="text"
								:disabled="disabled || busy"
								:placeholder="i18n.baseText('agents.builder.agentChecks.empty.ownPlaceholder')"
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
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.list {
	overflow: hidden;
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
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
