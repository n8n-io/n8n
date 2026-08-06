import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';

import {
	AGENT_EVAL_RUN_POLL_INTERVAL,
	AGENT_EVAL_RUN_POLL_MAX_ERRORS,
	AGENT_EVAL_RUN_POLL_TIMEOUT,
} from '@/app/constants/durations';

import { useAgentEvalRunProgress } from '../composables/useAgentEvalRunProgress';
import type {
	AgentEvalRunRecord,
	AgentEvalRunStatus,
	AgentEvalRunSummary,
} from '../agentEvals.types';

const { startRun, getRunSummary, listRuns } = vi.hoisted(() => ({
	startRun: vi.fn(),
	getRunSummary: vi.fn(),
	listRuns: vi.fn(),
}));

const { showMessage, showError } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('../agentEvals.api', () => ({
	getDatasets: vi.fn(),
	generateDraftCases: vi.fn(),
	startRun,
	getRunSummary,
	listRuns,
}));

// The eval store resolves the Data Table store at setup; cases play no part here.
vi.mock('@/features/core/dataTable/dataTable.store', () => ({
	useDataTableStore: vi.fn(() => ({
		fetchDataTableContent: vi.fn(),
		insertRow: vi.fn(),
		updateRow: vi.fn(),
		deleteRows: vi.fn(),
	})),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({ restApiContext: { instanceId: 'test-instance-id' } })),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';
const DATASET_ID = 'd1';
const RUN_ID = 'run-1';

const run = (status: AgentEvalRunStatus = 'running', id = RUN_ID): AgentEvalRunRecord => ({
	id,
	datasetId: DATASET_ID,
	agentVersionId: null,
	status,
	runAt: null,
	completedAt: null,
	metrics: null,
	errorCode: null,
	errorDetails: null,
	createdById: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
});

const summary = (
	counts: Partial<AgentEvalRunSummary['counts']>,
	status: AgentEvalRunStatus = 'running',
): AgentEvalRunSummary => ({
	runId: RUN_ID,
	status,
	counts: { total: 2, success: 0, error: 0, cancelled: 0, pending: 2, ...counts },
});

describe('useAgentEvalRunProgress', () => {
	let scope: EffectScope;
	const datasetId = ref(DATASET_ID);

	// Lets the immediate watch — and any poll it starts — settle before asserting.
	const flush = async () => {
		await vi.advanceTimersByTimeAsync(0);
	};

	const create = () => {
		scope = effectScope();
		const progress = scope.run(() =>
			useAgentEvalRunProgress({
				projectId: PROJECT_ID,
				agentId: AGENT_ID,
				datasetId: () => datasetId.value,
			}),
		);
		if (!progress) throw new Error('composable did not run in scope');
		return progress;
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.useFakeTimers();
		datasetId.value = DATASET_ID;
		listRuns.mockResolvedValue({ count: 0, data: [] });
	});

	afterEach(() => {
		scope?.stop();
		vi.useRealTimers();
	});

	describe('startRun', () => {
		it('polls the summary once per interval while cases are pending', async () => {
			startRun.mockResolvedValue(run());
			getRunSummary.mockResolvedValue(summary({ pending: 2 }));
			const progress = create();
			await flush();

			await progress.startRun();
			// `immediateCallback` means the first poll lands on resume, not an interval later.
			expect(getRunSummary).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL);
			expect(getRunSummary).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL);
			expect(getRunSummary).toHaveBeenCalledTimes(3);
			expect(progress.isRunning.value).toBe(true);
		});

		it('stops and announces once when nothing is left pending', async () => {
			startRun.mockResolvedValue(run());
			getRunSummary
				.mockResolvedValueOnce(summary({ pending: 1, success: 1 }))
				.mockResolvedValueOnce(summary({ pending: 0, success: 2 }, 'completed'));
			const progress = create();
			await flush();

			await progress.startRun();
			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL);

			expect(getRunSummary).toHaveBeenCalledTimes(2);
			expect(progress.isRunning.value).toBe(false);
			expect(showMessage).toHaveBeenCalledTimes(1);
			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'mocked-agents.builder.agentEvals.run.finished',
					type: 'success',
				}),
			);

			// Settled means settled — no further polls after the run finishes.
			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL * 3);
			expect(getRunSummary).toHaveBeenCalledTimes(2);
			expect(showMessage).toHaveBeenCalledTimes(1);
		});

		it('warns rather than congratulates when a case errored', async () => {
			startRun.mockResolvedValue(run());
			getRunSummary.mockResolvedValue(summary({ pending: 0, success: 1, error: 1 }, 'completed'));
			const progress = create();
			await flush();

			await progress.startRun();
			await flush();

			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		});

		it('surfaces a failure to start and never begins polling', async () => {
			startRun.mockRejectedValue(new Error('no cases'));
			const progress = create();
			await flush();

			await progress.startRun();

			expect(showError).toHaveBeenCalledWith(
				expect.any(Error),
				'mocked-agents.builder.agentEvals.run.startError',
			);
			expect(getRunSummary).not.toHaveBeenCalled();
			expect(progress.isRunning.value).toBe(false);
		});
	});

	describe('teardown', () => {
		it('stops polling when the scope is disposed', async () => {
			startRun.mockResolvedValue(run());
			getRunSummary.mockResolvedValue(summary({ pending: 2 }));
			const progress = create();
			await flush();
			await progress.startRun();

			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL);
			const callsWhileMounted = getRunSummary.mock.calls.length;
			expect(callsWhileMounted).toBeGreaterThan(0);

			scope.stop();

			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL * 5);
			expect(getRunSummary).toHaveBeenCalledTimes(callsWhileMounted);
		});
	});

	describe('resilience', () => {
		it('retries a single failed poll without telling the user', async () => {
			startRun.mockResolvedValue(run());
			getRunSummary
				.mockRejectedValueOnce(new Error('offline'))
				.mockResolvedValue(summary({ pending: 2 }));
			const progress = create();
			await flush();

			await progress.startRun();
			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL);

			expect(getRunSummary).toHaveBeenCalledTimes(2);
			expect(progress.lostTrack.value).toBe(false);
			expect(showError).not.toHaveBeenCalled();
		});

		it('gives up after a sustained run of failures', async () => {
			startRun.mockResolvedValue(run());
			getRunSummary.mockRejectedValue(new Error('offline'));
			const progress = create();
			await flush();

			await progress.startRun();
			for (let i = 1; i < AGENT_EVAL_RUN_POLL_MAX_ERRORS; i++) {
				await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL);
			}

			expect(getRunSummary).toHaveBeenCalledTimes(AGENT_EVAL_RUN_POLL_MAX_ERRORS);
			expect(progress.lostTrack.value).toBe(true);

			const callsAtGiveUp = getRunSummary.mock.calls.length;
			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL * 3);
			expect(getRunSummary).toHaveBeenCalledTimes(callsAtGiveUp);
		});

		it('gives up on a run that never settles', async () => {
			startRun.mockResolvedValue(run());
			getRunSummary.mockResolvedValue(summary({ pending: 2 }));
			const progress = create();
			await flush();
			await progress.startRun();

			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_TIMEOUT + AGENT_EVAL_RUN_POLL_INTERVAL);

			expect(progress.lostTrack.value).toBe(true);

			const callsAtGiveUp = getRunSummary.mock.calls.length;
			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL * 3);
			expect(getRunSummary).toHaveBeenCalledTimes(callsAtGiveUp);
		});
	});

	describe('adopting the newest run', () => {
		it('picks an in-flight run back up on mount', async () => {
			listRuns.mockResolvedValue({ count: 1, data: [run('running')] });
			getRunSummary.mockResolvedValue(summary({ pending: 1 }));
			const progress = create();
			await flush();

			expect(listRuns).toHaveBeenCalledWith(
				{ instanceId: 'test-instance-id' },
				PROJECT_ID,
				AGENT_ID,
				DATASET_ID,
				{ skip: 0, take: 1 },
			);
			expect(getRunSummary).toHaveBeenCalledTimes(1);
			expect(progress.isRunning.value).toBe(true);
		});

		it('does not poll a run that already finished', async () => {
			listRuns.mockResolvedValue({ count: 1, data: [run('completed')] });
			const progress = create();
			await flush();

			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL * 3);

			expect(getRunSummary).not.toHaveBeenCalled();
			expect(progress.isRunning.value).toBe(false);
			expect(progress.run.value?.status).toBe('completed');
		});

		it('renders as idle when the run list cannot be read', async () => {
			listRuns.mockRejectedValue(new Error('forbidden'));
			const progress = create();
			await flush();

			expect(progress.run.value).toBeNull();
			expect(progress.isRunning.value).toBe(false);
			expect(showError).not.toHaveBeenCalled();
		});

		it('stops watching the old dataset and adopts the new one', async () => {
			listRuns.mockResolvedValue({ count: 1, data: [run('running')] });
			getRunSummary.mockResolvedValue(summary({ pending: 1 }));
			create();
			await flush();
			const callsBeforeSwitch = getRunSummary.mock.calls.length;

			listRuns.mockResolvedValue({ count: 0, data: [] });
			datasetId.value = 'd2';
			await flush();

			expect(listRuns).toHaveBeenLastCalledWith(
				{ instanceId: 'test-instance-id' },
				PROJECT_ID,
				AGENT_ID,
				'd2',
				{ skip: 0, take: 1 },
			);
			// The previous dataset's poller must not keep running against the new one.
			await vi.advanceTimersByTimeAsync(AGENT_EVAL_RUN_POLL_INTERVAL * 3);
			expect(getRunSummary).toHaveBeenCalledTimes(callsBeforeSwitch);
		});
	});
});
