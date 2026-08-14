import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';

import { useAgentEvalRunProgress } from '../composables/useAgentEvalRunProgress';

/**
 * The store owns the polling — it refreshes the run's per-case rows as well as its
 * counts, which the review view depends on, so there is one poller per run rather
 * than one per surface. What this composable owns, and what these tests cover, is
 * the lifecycle around it: when to start a watch, when to stop, and what to say
 * when a run settles. Poll cadence and give-up live in the store's own suite.
 */
const store = vi.hoisted(() => ({
	getLatestRunId: vi.fn(),
	getReview: vi.fn(),
	isRunInFlight: vi.fn(),
	hasLostTrackOfRun: vi.fn(),
	isStartingRun: vi.fn(),
	isCancellingRun: vi.fn(),
	resolveLatestRunId: vi.fn(),
	openRun: vi.fn(),
	startPollingRun: vi.fn(),
	stopPollingRun: vi.fn(),
	startRun: vi.fn(),
	cancelRun: vi.fn(),
}));

const { showMessage, showError } = vi.hoisted(() => ({
	showMessage: vi.fn(),
	showError: vi.fn(),
}));

vi.mock('../agentEvals.store', () => ({ useAgentEvalsStore: () => store }));

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

const counts = (over: Partial<Record<string, number>> = {}) => ({
	total: 2,
	success: 0,
	error: 0,
	cancelled: 0,
	pending: 2,
	...over,
});

describe('useAgentEvalRunProgress', () => {
	let scope: EffectScope;
	const datasetId = ref(DATASET_ID);

	const flush = async () => {
		await Promise.resolve();
		await Promise.resolve();
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

	// The store's reads are backed by refs so the composable's computeds invalidate
	// the way they do against the real store — a plain mock return never would.
	const state = {
		runId: ref<string | null>(null),
		counts: ref<ReturnType<typeof counts> | null>(null),
		inFlight: ref(false),
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		datasetId.value = DATASET_ID;
		state.runId.value = null;
		state.counts.value = null;
		state.inFlight.value = false;
		store.getLatestRunId.mockImplementation(() => state.runId.value);
		store.getReview.mockImplementation(() => ({ counts: state.counts.value }));
		store.isRunInFlight.mockImplementation(() => state.inFlight.value);
		store.hasLostTrackOfRun.mockReturnValue(false);
		store.isStartingRun.mockReturnValue(false);
		store.isCancellingRun.mockReturnValue(false);
		store.resolveLatestRunId.mockResolvedValue(null);
		store.openRun.mockResolvedValue(undefined);
		store.startRun.mockResolvedValue({ id: RUN_ID, status: 'running' });
		store.cancelRun.mockResolvedValue({ id: RUN_ID, status: 'cancelled' });
	});

	afterEach(() => scope?.stop());

	describe('startRun', () => {
		it('starts the run, hydrates it, and asks the store to watch it', async () => {
			store.startRun.mockImplementation(async () => {
				state.runId.value = RUN_ID;
				return { id: RUN_ID, status: 'running' };
			});
			const progress = create();
			await flush();

			await progress.startRun();

			expect(store.startRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, DATASET_ID);
			// The review state has to exist before the poll refreshes it, and it is what
			// the results view reads when it takes over.
			expect(store.openRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, RUN_ID);
			expect(store.startPollingRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, RUN_ID);
		});

		it('surfaces a failure to start and never begins watching', async () => {
			store.startRun.mockRejectedValue(new Error('no cases'));
			const progress = create();
			await flush();

			await progress.startRun();

			expect(showError).toHaveBeenCalledWith(
				expect.any(Error),
				'mocked-agents.builder.agentEvals.run.startError',
			);
			expect(store.startPollingRun).not.toHaveBeenCalled();
		});

		// `resolveLatestRunId` writes its answer into the store, so a "no run yet"
		// result landing after a run started would wipe the new run's id and leave it
		// unwatched — no progress, no stop control.
		it('will not start a run while the existing one is still being resolved', async () => {
			let release: (value: string | null) => void = () => {};
			store.resolveLatestRunId.mockReturnValue(
				new Promise<string | null>((resolve) => {
					release = resolve;
				}),
			);
			const progress = create();

			await progress.startRun();
			expect(store.startRun).not.toHaveBeenCalled();

			release(null);
			await flush();

			await progress.startRun();
			expect(store.startRun).toHaveBeenCalledTimes(1);
		});
	});

	describe('cancelRun', () => {
		it('asks the store to stop the run it is watching', async () => {
			state.runId.value = RUN_ID;
			const progress = create();
			await flush();

			await progress.cancelRun();

			expect(store.cancelRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, DATASET_ID, RUN_ID);
			// Cancelling is a request, not the end — the cases in flight still settle, so
			// the watch is deliberately left running.
			expect(store.stopPollingRun).not.toHaveBeenCalledTimes(2);
		});

		it('does nothing when there is no run to stop', async () => {
			const progress = create();
			await flush();

			await progress.cancelRun();

			expect(store.cancelRun).not.toHaveBeenCalled();
		});

		it('surfaces a failure to stop', async () => {
			state.runId.value = RUN_ID;
			store.cancelRun.mockRejectedValue(new Error('gone'));
			const progress = create();
			await flush();

			await progress.cancelRun();

			expect(showError).toHaveBeenCalledWith(
				expect.any(Error),
				'mocked-agents.builder.agentEvals.run.cancelError',
			);
		});
	});

	describe('announcing the result', () => {
		const settleWith = async (c: ReturnType<typeof counts>) => {
			state.runId.value = RUN_ID;
			const progress = create();
			await flush();

			state.counts.value = c;
			await flush();
			return progress;
		};

		it('reports a clean run as a pass tally', async () => {
			await settleWith(counts({ pending: 0, success: 2 }));

			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'mocked-agents.builder.agentEvals.run.finished',
					type: 'success',
				}),
			);
		});

		it('warns rather than congratulates when a case errored', async () => {
			await settleWith(counts({ pending: 0, success: 1, error: 1 }));

			expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		});

		// A stopped run has no meaningful pass tally — "1 of 5 passed" reads as a
		// result when it was an interruption.
		it('reports a stopped run as stopped', async () => {
			await settleWith(counts({ pending: 0, success: 1, cancelled: 1 }));

			expect(showMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'mocked-agents.builder.agentEvals.run.cancelled',
					type: 'info',
				}),
			);
		});

		it('says nothing while cases are still pending', async () => {
			await settleWith(counts({ pending: 1, success: 1 }));

			expect(showMessage).not.toHaveBeenCalled();
		});
	});

	describe('adopting the newest run', () => {
		it('picks an in-flight run back up on mount', async () => {
			store.resolveLatestRunId.mockResolvedValue(RUN_ID);
			state.inFlight.value = true;
			create();
			await flush();

			expect(store.openRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, RUN_ID);
			expect(store.startPollingRun).toHaveBeenCalledWith(PROJECT_ID, AGENT_ID, RUN_ID);
		});

		it('does not watch a run that already finished', async () => {
			store.resolveLatestRunId.mockResolvedValue(RUN_ID);
			state.inFlight.value = false;
			create();
			await flush();

			expect(store.startPollingRun).not.toHaveBeenCalled();
		});

		it('renders as idle when the run list cannot be read', async () => {
			store.resolveLatestRunId.mockRejectedValue(new Error('forbidden'));
			create();
			await flush();

			expect(store.startPollingRun).not.toHaveBeenCalled();
			expect(showError).not.toHaveBeenCalled();
		});

		it('stops the previous watch before adopting a new dataset', async () => {
			create();
			await flush();
			store.stopPollingRun.mockClear();

			datasetId.value = 'd2';
			await flush();

			expect(store.stopPollingRun).toHaveBeenCalled();
			expect(store.resolveLatestRunId).toHaveBeenLastCalledWith(PROJECT_ID, AGENT_ID, 'd2');
		});
	});

	// A leaked poller is silent: it keeps issuing requests for a view nobody is
	// looking at.
	it('stops polling when the scope is disposed', async () => {
		create();
		await flush();
		store.stopPollingRun.mockClear();

		scope.stop();

		expect(store.stopPollingRun).toHaveBeenCalled();
	});
});
