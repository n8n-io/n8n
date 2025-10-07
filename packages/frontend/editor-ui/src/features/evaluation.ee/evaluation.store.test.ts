import { createPinia, setActivePinia } from 'pinia';
import { useEvaluationStore } from './evaluation.store'; // Adjust the import path as necessary
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import type { TestRunRecord } from './evaluation.api';
import { mockedStore } from '@/__tests__/utils';

const { getTestRuns, getTestRun, startTestRun, deleteTestRun } = vi.hoisted(() => ({
	getTestRuns: vi.fn(),
	getTestRun: vi.fn(),
	startTestRun: vi.fn(),
	deleteTestRun: vi.fn(),
}));

vi.mock('./evaluation.api', () => ({
	getTestRuns,
	getTestRun,
	startTestRun,
	deleteTestRun,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { instanceId: 'test-instance-id' },
	})),
}));

const TEST_RUN: TestRunRecord = {
	id: 'run1',
	workflowId: '1',
	status: 'completed',
	metrics: { metric1: 0.75 },
	createdAt: '2024-01-01',
	updatedAt: '2024-01-01',
	runAt: '2024-01-01',
	completedAt: '2024-01-01',
};

describe('evaluation.store.ee', () => {
	let store: ReturnType<typeof useEvaluationStore>;
	let rootStoreMock: ReturnType<typeof useRootStore>;

	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		store = useEvaluationStore();
		rootStoreMock = useRootStore();

		mockedStore(useAnnotationTagsStore).fetchAll = vi.fn().mockResolvedValue([]);

		getTestRuns.mockResolvedValue([TEST_RUN]);
		getTestRun.mockResolvedValue(TEST_RUN);
		startTestRun.mockResolvedValue({ success: true });
		deleteTestRun.mockResolvedValue({ success: true });
	});

	test('Initialization', () => {
		expect(store.testRunsById).toEqual({});
		expect(store.isLoading).toBe(false);
	});

	describe('Test Runs', () => {
		test('Fetching Test Runs', async () => {
			const result = await store.fetchTestRuns('1');

			expect(getTestRuns).toHaveBeenCalledWith(rootStoreMock.restApiContext, '1');
			expect(store.testRunsById).toEqual({
				run1: TEST_RUN,
			});
			expect(result).toEqual([TEST_RUN]);
		});

		test('Getting specific Test Run', async () => {
			const params = { workflowId: '1', runId: 'run1' };
			const result = await store.getTestRun(params);

			expect(getTestRun).toHaveBeenCalledWith(rootStoreMock.restApiContext, params);
			expect(store.testRunsById).toEqual({
				run1: TEST_RUN,
			});
			expect(result).toEqual(TEST_RUN);
		});

		test('Starting Test Run', async () => {
			const result = await store.startTestRun('1');

			expect(startTestRun).toHaveBeenCalledWith(rootStoreMock.restApiContext, '1');
			expect(result).toEqual({ success: true });
		});

		test('Deleting Test Run', async () => {
			store.testRunsById = { run1: TEST_RUN };
			const params = { workflowId: '1', runId: 'run1' };

			const result = await store.deleteTestRun(params);

			expect(deleteTestRun).toHaveBeenCalledWith(rootStoreMock.restApiContext, params);
			expect(store.testRunsById).toEqual({});
			expect(result).toEqual({ success: true });
		});

		test('Getting Test Runs by Test ID', () => {
			store.testRunsById = {
				run1: TEST_RUN,
				run2: { ...TEST_RUN, id: 'run2', workflowId: '2' },
			};

			const runs = store.testRunsByWorkflowId['1'];

			expect(runs).toEqual([TEST_RUN]);
		});
	});

	describe('Polling Mechanism', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test('should start polling for running test runs', async () => {
			const runningTestRun = {
				...TEST_RUN,
				status: 'running',
			};

			getTestRuns.mockResolvedValueOnce([runningTestRun]);

			// First call returns running status
			getTestRun.mockResolvedValueOnce({
				...runningTestRun,
				status: 'running',
			});

			// Second call returns completed status
			getTestRun.mockResolvedValueOnce({
				...runningTestRun,
				status: 'completed',
			});

			await store.fetchTestRuns('1');

			expect(store.testRunsById).toEqual({
				run1: runningTestRun,
			});

			// Advance timer to trigger the first poll
			await vi.advanceTimersByTimeAsync(1000);

			// Verify first poll happened
			expect(getTestRun).toHaveBeenCalledWith(rootStoreMock.restApiContext, {
				workflowId: '1',
				runId: 'run1',
			});

			// Advance timer again
			await vi.advanceTimersByTimeAsync(1000);

			// Verify polling stopped after status changed to completed
			expect(getTestRun).toHaveBeenCalledTimes(2);
		});

		test('should cleanup polling timeouts', async () => {
			const runningTestRun = {
				...TEST_RUN,
				status: 'running',
			};

			getTestRuns.mockResolvedValueOnce([runningTestRun]);
			getTestRun.mockResolvedValue({
				...runningTestRun,
				status: 'running',
			});

			await store.fetchTestRuns('1');

			// Wait for the first poll to complete
			await vi.runOnlyPendingTimersAsync();

			// Clear mock calls from initial setup
			getTestRun.mockClear();

			store.cleanupPolling();

			// Advance timer
			await vi.advanceTimersByTimeAsync(1000);

			// Verify no more polling happened after cleanup
			expect(getTestRun).not.toHaveBeenCalled();
		});
	});
});
