import { CASE_INPUT_FLAVORS, type AgentEvalVote } from '@n8n/api-types';
import { useStorage } from '@vueuse/core';
import { computed, onScopeDispose, ref, watch, type Ref } from 'vue';

import { useAgentEvalsStore } from '../agentEvals.store';
import type { AgentEvalCase, AgentEvalResultRecord } from '../agentEvals.types';
import type { AgentJsonConfig } from '../types';
import { readAgentAnswer } from '../utils/agent-eval-review';
import {
	isDataTableDataset,
	toCaseSource,
	type AgentEvalCaseSource,
} from '../utils/agentEvalCases.utils';

export type AgentCheckState = 'idle' | 'running' | 'needsEye' | 'ok' | 'flagged' | 'error';

export type AgentCheck = AgentEvalCase & {
	state: AgentCheckState;
	result: AgentEvalResultRecord | null;
	answer: string | null;
	vote: AgentEvalVote | null;
};

export type AgentChecksCadence = 'auto' | 'every' | 'before-publish' | 'manual';

const AUTO_DEBOUNCE_MS = 3000;
const EVERY_DEBOUNCE_MS = 1500;
const DEFAULT_CHECK_COUNT = 4;

/**
 * A change worth re-checking for: model, credential, tools/skills, or a
 * substantial instruction rewrite. Typos and small edits don't count.
 */
function isMaterialChange(before: AgentJsonConfig | null, after: AgentJsonConfig | null): boolean {
	if (!before || !after) return true;
	if (before.model !== after.model || before.credential !== after.credential) return true;
	if ((before.tools?.length ?? 0) !== (after.tools?.length ?? 0)) return true;
	if ((before.skills?.length ?? 0) !== (after.skills?.length ?? 0)) return true;
	const a = before.instructions ?? '';
	const b = after.instructions ?? '';
	const delta = Math.abs(a.length - b.length);
	return delta > Math.max(40, a.length * 0.15);
}

/**
 * Wireframe: the eval agent as one reviewer. A "check run" is an eval run on the
 * agent's checks dataset — the runner already isolates memory and stores results,
 * and votes are the existing ratings. This composable only decides *when* to run
 * and folds cases + results + ratings into one per-check state.
 */
export function useAgentChecks(params: {
	projectId: Ref<string>;
	agentId: Ref<string>;
	config: Ref<AgentJsonConfig | null>;
	versionId: Ref<string | null | undefined>;
	isRunnable: Ref<boolean>;
	editingLocked: Ref<boolean>;
}) {
	const store = useAgentEvalsStore();

	const source = ref<AgentEvalCaseSource | null>(null);
	const resolving = ref(false);
	const failed = ref(false);
	const attemptedGenerate = new Set<string>();

	// Manual until the user opts into auto after seeing the first results.
	const cadence = useStorage<AgentChecksCadence>(
		computed(() => `N8N_AGENT_CHECKS_CADENCE:${params.agentId.value}`),
		'manual',
	);
	const cadenceAsked = useStorage<boolean>(
		computed(() => `N8N_AGENT_CHECKS_CADENCE_ASKED:${params.agentId.value}`),
		false,
	);

	const runId = computed(() =>
		source.value ? (store.getLatestRunId(source.value.datasetId) ?? null) : null,
	);
	const review = computed(() => (runId.value ? store.getReview(runId.value) : null));
	const isRunning = computed(
		() =>
			(source.value ? store.isStartingRun(source.value.datasetId) : false) ||
			(runId.value ? store.isRunInFlight(runId.value) : false),
	);

	const cases = computed<AgentEvalCase[]>(() =>
		source.value ? store.getCases(source.value.datasetId) : [],
	);

	const checks = computed<AgentCheck[]>(() => {
		const results = new Map<string, AgentEvalResultRecord>();
		for (const r of review.value?.results ?? []) {
			if (r.sourceRowId !== null) results.set(String(r.sourceRowId), r);
		}
		return cases.value.map((c) => {
			const result = results.get(String(c.rowId)) ?? null;
			const vote = result ? (review.value?.ratingsByResultId[result.id]?.vote ?? null) : null;
			let state: AgentCheckState = 'idle';
			if (result) {
				if (result.status === 'new' || result.status === 'running') state = 'running';
				else if (result.status !== 'success') state = 'error';
				else if (vote === 'up') state = 'ok';
				else if (vote === 'down') state = 'flagged';
				else state = 'needsEye';
			} else if (isRunning.value) {
				state = 'running';
			}
			return { ...c, state, result, vote, answer: result ? readAgentAnswer(result.output) : null };
		});
	});

	const summary = computed(() => {
		const s = { total: checks.value.length, ok: 0, flagged: 0, needsEye: 0, running: 0, error: 0 };
		for (const c of checks.value) {
			if (c.state === 'ok') s.ok++;
			else if (c.state === 'flagged') s.flagged++;
			else if (c.state === 'needsEye') s.needsEye++;
			else if (c.state === 'running') s.running++;
			else if (c.state === 'error') s.error++;
		}
		return s;
	});

	const hasRun = computed(() => runId.value !== null);
	/** Offer auto mode once, right after the first results land. */
	const shouldOfferAuto = computed(
		() => hasRun.value && !isRunning.value && !cadenceAsked.value && cadence.value === 'manual',
	);
	function answerAutoOffer(accept: boolean) {
		cadenceAsked.value = true;
		if (accept) cadence.value = 'auto';
	}

	const lastRunAt = computed(
		() => review.value?.run?.runAt ?? review.value?.run?.createdAt ?? null,
	);

	function findSource(agentId: string): AgentEvalCaseSource | null {
		const candidates: AgentEvalCaseSource[] = [];
		for (const dataset of store.getDatasets(agentId)) {
			if (!isDataTableDataset(dataset)) continue;
			const s = toCaseSource(dataset);
			if (s) candidates.push(s);
		}
		// Prefer a dataset whose cases carry a kind — that's the one the eval agent drafted.
		return (
			candidates.find((s) => store.getCases(s.datasetId).some((c) => c.flavor)) ??
			candidates[0] ??
			null
		);
	}

	async function loadSources(projectId: string, agentId: string) {
		if (!store.isLoaded(agentId)) await store.fetchDatasets(projectId, agentId);
		const all = store
			.getDatasets(agentId)
			.filter(isDataTableDataset)
			.map(toCaseSource)
			.filter((s): s is AgentEvalCaseSource => s !== null);
		await Promise.all(
			all
				.filter((s) => !store.areCasesLoaded(s.datasetId))
				.map(async (s) => await store.fetchCases(projectId, s)),
		);
		source.value = findSource(agentId);
	}

	async function adoptLatestRun() {
		const s = source.value;
		if (!s) return;
		const id =
			store.getLatestRunId(s.datasetId) ??
			(await store.resolveLatestRunId(params.projectId.value, params.agentId.value, s.datasetId));
		if (!id) return;
		await store.openRun(params.projectId.value, params.agentId.value, id);
		if (store.isRunInFlight(id)) {
			store.startPollingRun(params.projectId.value, params.agentId.value, id);
		}
	}

	async function run() {
		const s = source.value;
		if (!s || isRunning.value || params.editingLocked.value) return;
		try {
			await store.startRun(params.projectId.value, params.agentId.value, s.datasetId);
			await adoptLatestRun();
		} catch {
			// A run that can't start leaves the previous results standing; nothing to interrupt for.
		}
	}

	async function resolve() {
		const projectId = params.projectId.value;
		const agentId = params.agentId.value;
		if (!projectId || !agentId) return;
		resolving.value = true;
		try {
			await loadSources(projectId, agentId);
			if (!source.value && params.isRunnable.value && !attemptedGenerate.has(agentId)) {
				attemptedGenerate.add(agentId);
				await store.generateDraftCases(projectId, agentId, {
					count: DEFAULT_CHECK_COUNT,
					flavors: [...CASE_INPUT_FLAVORS],
				});
				await loadSources(projectId, agentId);
			}
			// The first run is the user's call: drafted checks sit ready until they press Run.
			await adoptLatestRun();
		} catch {
			failed.value = true;
		} finally {
			resolving.value = false;
		}
	}

	async function vote(check: AgentCheck, value: AgentEvalVote, note?: string) {
		if (!runId.value || !check.result) return;
		store.beginVote(runId.value, check.result.id, value);
		// A "not right" needs the one sentence that says why — it doubles as the new rule.
		if (value === 'down' && note) store.setDraftComment(runId.value, check.result.id, note);
		await store.saveReview(
			params.projectId.value,
			params.agentId.value,
			runId.value,
			check.result.id,
		);
	}

	/** A rule is just another check row: the request that went wrong plus one sentence of what to check. */
	async function addCheck(input: string, whatToCheck: string) {
		if (!source.value) return null;
		return await store.createCase(params.projectId.value, source.value, { input, whatToCheck });
	}

	/** Feed a verdict back into the check it came from. */
	async function updateCheck(rowId: number, value: { input: string; whatToCheck: string }) {
		if (!source.value) return false;
		return await store.updateCase(params.projectId.value, source.value, rowId, value);
	}

	async function removeCheck(rowId: number) {
		if (!source.value) return false;
		return await store.deleteCase(params.projectId.value, source.value, rowId);
	}

	// Re-run on saved changes, filtered by cadence.
	let debounce: ReturnType<typeof setTimeout> | undefined;
	let lastCheckedConfig: AgentJsonConfig | null = null;
	watch(
		() => params.versionId.value,
		(next, previous) => {
			if (!next || next === previous || !source.value) return;
			if (cadence.value === 'manual' || cadence.value === 'before-publish') return;
			if (cadence.value === 'auto' && !isMaterialChange(lastCheckedConfig, params.config.value)) {
				return;
			}
			clearTimeout(debounce);
			debounce = setTimeout(
				() => {
					if (!params.isRunnable.value || params.editingLocked.value || isRunning.value) return;
					lastCheckedConfig = params.config.value;
					void run();
				},
				cadence.value === 'every' ? EVERY_DEBOUNCE_MS : AUTO_DEBOUNCE_MS,
			);
		},
	);

	watch(
		[params.agentId, params.isRunnable],
		([agentId], [previousAgentId]) => {
			if (agentId !== previousAgentId) {
				source.value = null;
				failed.value = false;
				lastCheckedConfig = params.config.value;
			}
			if (agentId) void resolve();
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		clearTimeout(debounce);
		store.stopPollingRun();
	});

	return {
		checks,
		summary,
		cadence,
		hasRun,
		shouldOfferAuto,
		answerAutoOffer,
		isRunning,
		resolving,
		failed,
		lastRunAt,
		run,
		vote,
		addCheck,
		updateCheck,
		removeCheck,
	};
}

export type AgentChecksApi = ReturnType<typeof useAgentChecks>;
