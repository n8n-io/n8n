import type { InstanceAiEvalExecutionResult, InstanceAiEvalNodeResult } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import * as scenarioRunnerApi from './scenarioRunner.api';

export type ScenarioRunStatus = 'passed' | 'passedWithIssues' | 'failed';

export type ScenarioExpectation = 'pass' | 'fail' | 'any';

/**
 * Display-level status derived from (expected, actual).
 * Drives the status dot + label in the UI. Expectations are the cheap MVP of
 * judgment — they catch the "scenario said this should fail but it passed"
 * hollow-green class without needing an LLM judge.
 */
export type ScenarioDisplayStatus =
	| 'unrun'
	| 'passed'
	| 'passedWithIssues'
	| 'failed' // observed + expected=any
	| 'expectedFail' // observed failure, expected failure — the happy path for failure tests
	| 'unexpectedFail' // observed failure, expected pass
	| 'unexpectedPass'; // observed pass, expected fail — the hollow-green catcher

export interface ScenarioRecord {
	id: string;
	workflowId: string;
	name: string;
	description: string;
	expectedOutcome: ScenarioExpectation;
	lastExecutionId?: string;
	lastRunStatus?: ScenarioRunStatus;
	lastRunAt?: string;
	lastRunDurationMs?: number;
	createdAt: string;
	updatedAt: string;
}

export function deriveDisplayStatus(scenario: ScenarioRecord): ScenarioDisplayStatus {
	if (!scenario.lastRunStatus) return 'unrun';
	if (scenario.expectedOutcome === 'any') return scenario.lastRunStatus;
	if (scenario.expectedOutcome === 'pass') {
		return scenario.lastRunStatus === 'failed' ? 'unexpectedFail' : scenario.lastRunStatus;
	}
	// expected === 'fail'
	return scenario.lastRunStatus === 'failed' ? 'expectedFail' : 'unexpectedPass';
}

/**
 * localStorage-backed scenarios store. Prototype-scope: device-bound, not synced,
 * lost on clear-site-data. The shape mirrors what a server-backed entity would
 * carry, so promoting to a real backend later is a store-impl swap.
 */
const STORAGE_KEY = 'N8N_SCENARIOS_BY_WORKFLOW';

type StorageShape = Record<string, ScenarioRecord[]>;

function loadFromStorage(): StorageShape {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		if (typeof parsed !== 'object' || parsed === null) return {};
		// Normalize: older records predate `expectedOutcome` — default to 'pass'
		// so every loaded scenario has a well-defined expectation.
		const normalized: StorageShape = {};
		for (const [workflowId, scenarios] of Object.entries(parsed as StorageShape)) {
			normalized[workflowId] = (scenarios ?? []).map((s) => ({
				...s,
				expectedOutcome: (s.expectedOutcome as ScenarioExpectation) ?? 'pass',
			}));
		}
		return normalized;
	} catch {
		return {};
	}
}

function deriveStatus(result: InstanceAiEvalExecutionResult): ScenarioRunStatus {
	if (!result.success || result.errors.length > 0) return 'failed';
	const warningCount = result.hints?.warnings?.length ?? 0;
	const configIssueCount = Object.values(result.nodeResults ?? {}).reduce(
		(sum, node) => sum + (node.configIssues ? Object.keys(node.configIssues).length : 0),
		0,
	);
	return warningCount + configIssueCount > 0 ? 'passedWithIssues' : 'passed';
}

export const useScenariosStore = defineStore(STORES.SCENARIOS, () => {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();

	const byWorkflowId = ref<StorageShape>(loadFromStorage());
	const runningScenarioId = ref<string | null>(null);

	// In-session cache of degraded results reconstructed from persisted
	// executions. Keyed by executionId. Lost on reload — that's fine, the
	// fetch is cheap and avoids duplicating data we already persisted as
	// part of the normal execution record.
	const historicalByExecutionId = ref<Record<string, InstanceAiEvalExecutionResult>>({});
	const fetchingExecutionId = ref<string | null>(null);

	watch(
		byWorkflowId,
		(value) => {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			} catch {
				// quota exceeded — silent for prototype
			}
		},
		{ deep: true },
	);

	function scenariosFor(workflowId: string): ScenarioRecord[] {
		return byWorkflowId.value[workflowId] ?? [];
	}

	const hasScenariosFor = (workflowId: string) =>
		computed(() => scenariosFor(workflowId).length > 0);

	function create(
		workflowId: string,
		input: { name: string; description: string; expectedOutcome?: ScenarioExpectation },
	): ScenarioRecord {
		const now = new Date().toISOString();
		const scenario: ScenarioRecord = {
			id:
				typeof crypto !== 'undefined' && 'randomUUID' in crypto
					? crypto.randomUUID()
					: `scn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
			workflowId,
			name: input.name.trim() || 'Untitled scenario',
			description: input.description.trim(),
			expectedOutcome: input.expectedOutcome ?? 'pass',
			createdAt: now,
			updatedAt: now,
		};
		const list = byWorkflowId.value[workflowId] ?? [];
		byWorkflowId.value = {
			...byWorkflowId.value,
			[workflowId]: [...list, scenario],
		};
		return scenario;
	}

	function update(
		workflowId: string,
		id: string,
		patch: Partial<Pick<ScenarioRecord, 'name' | 'description' | 'expectedOutcome'>>,
	): void {
		const list = byWorkflowId.value[workflowId];
		if (!list) return;
		const next = list.map((s) =>
			s.id === id
				? {
						...s,
						...patch,
						updatedAt: new Date().toISOString(),
					}
				: s,
		);
		byWorkflowId.value = { ...byWorkflowId.value, [workflowId]: next };
	}

	function remove(workflowId: string, id: string): void {
		const list = byWorkflowId.value[workflowId];
		if (!list) return;
		byWorkflowId.value = {
			...byWorkflowId.value,
			[workflowId]: list.filter((s) => s.id !== id),
		};
	}

	function persistRunResult(
		workflowId: string,
		id: string,
		result: InstanceAiEvalExecutionResult,
		durationMs?: number,
	): void {
		const list = byWorkflowId.value[workflowId];
		if (!list) return;
		const now = new Date().toISOString();
		byWorkflowId.value = {
			...byWorkflowId.value,
			[workflowId]: list.map((s) =>
				s.id === id
					? {
							...s,
							lastExecutionId: result.executionId,
							lastRunStatus: deriveStatus(result),
							lastRunAt: now,
							lastRunDurationMs: durationMs,
							updatedAt: now,
						}
					: s,
			),
		};
	}

	async function run(
		workflowId: string,
		id: string,
	): Promise<InstanceAiEvalExecutionResult | null> {
		const list = byWorkflowId.value[workflowId];
		const scenario = list?.find((s) => s.id === id);
		if (!scenario) return null;

		runningScenarioId.value = id;
		const startedAt = performance.now();
		try {
			const result = await scenarioRunnerApi.executeWithScenario(
				rootStore.restApiContext,
				workflowId,
				scenario.description || undefined,
			);
			persistRunResult(workflowId, id, result, Math.round(performance.now() - startedAt));
			return result;
		} finally {
			runningScenarioId.value = null;
		}
	}

	/**
	 * Build a degraded InstanceAiEvalExecutionResult from a persisted execution
	 * record. Node outputs and start times come from runData; intercepted
	 * requests and hints were never persisted so they come back empty (that's
	 * what the `degraded` flag in ScenarioRunResult acknowledges).
	 */
	function mapExecutionToResult(
		executionId: string,
		execution: {
			data?: {
				resultData?: {
					runData?: Record<string, unknown>;
					error?: { message?: string };
				};
			};
		},
	): InstanceAiEvalExecutionResult {
		const runData =
			(execution.data?.resultData?.runData as
				| Record<string, Array<{ startTime?: number; data?: { main?: unknown[][] } }>>
				| undefined) ?? {};
		const nodeResults: Record<string, InstanceAiEvalNodeResult> = {};

		for (const [nodeName, tasks] of Object.entries(runData)) {
			const lastTask = tasks?.[tasks.length - 1];
			const mainOutput = lastTask?.data?.main?.[0] as Array<{ json?: unknown }> | undefined;
			const items = Array.isArray(mainOutput) ? mainOutput : [];
			nodeResults[nodeName] = {
				output: items.slice(0, 10).map((i) => i?.json ?? null),
				outputCount: items.length,
				interceptedRequests: [],
				executionMode: 'mocked',
				startTime: lastTask?.startTime,
			};
		}

		const errorMessage = execution.data?.resultData?.error?.message;
		return {
			executionId,
			success: !errorMessage,
			nodeResults,
			errors: errorMessage ? [errorMessage] : [],
			hints: {
				globalContext: '',
				triggerContent: {},
				nodeHints: {},
				warnings: [],
				bypassPinData: {},
			},
		};
	}

	async function fetchHistoricalResult(
		executionId: string,
	): Promise<InstanceAiEvalExecutionResult | null> {
		const cached = historicalByExecutionId.value[executionId];
		if (cached) return cached;

		fetchingExecutionId.value = executionId;
		try {
			const execution = await workflowsStore.getExecution(executionId);
			if (!execution) return null;
			const mapped = mapExecutionToResult(executionId, execution);
			historicalByExecutionId.value = {
				...historicalByExecutionId.value,
				[executionId]: mapped,
			};
			return mapped;
		} finally {
			fetchingExecutionId.value = null;
		}
	}

	function cachedHistoricalResult(
		executionId: string | undefined,
	): InstanceAiEvalExecutionResult | null {
		if (!executionId) return null;
		return historicalByExecutionId.value[executionId] ?? null;
	}

	return {
		byWorkflowId,
		runningScenarioId,
		fetchingExecutionId,
		scenariosFor,
		hasScenariosFor,
		create,
		update,
		remove,
		run,
		persistRunResult,
		fetchHistoricalResult,
		cachedHistoricalResult,
	};
});
