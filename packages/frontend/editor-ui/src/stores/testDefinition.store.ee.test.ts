import { createPinia, setActivePinia } from 'pinia';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee'; // Adjust the import path as necessary
import { useRootStore } from '@/stores/root.store';
import { usePostHog } from '@/stores/posthog.store';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import type { TestDefinitionRecord, TestRunRecord } from '@/api/testDefinition.ee';
import { mockedStore } from '@/__tests__/utils';

const {
	createTestDefinition,
	deleteTestDefinition,
	getTestDefinitions,
	updateTestDefinition,
	getTestMetrics,
	createTestMetric,
	updateTestMetric,
	deleteTestMetric,
	getTestRuns,
	getTestRun,
	startTestRun,
	deleteTestRun,
} = vi.hoisted(() => ({
	getTestDefinitions: vi.fn(),
	createTestDefinition: vi.fn(),
	updateTestDefinition: vi.fn(),
	deleteTestDefinition: vi.fn(),
	getTestMetrics: vi.fn(),
	createTestMetric: vi.fn(),
	updateTestMetric: vi.fn(),
	deleteTestMetric: vi.fn(),
	getTestRuns: vi.fn(),
	getTestRun: vi.fn(),
	startTestRun: vi.fn(),
	deleteTestRun: vi.fn(),
}));

vi.mock('@/api/testDefinition.ee', () => ({
	createTestDefinition,
	deleteTestDefinition,
	getTestDefinitions,
	updateTestDefinition,
	getTestMetrics,
	createTestMetric,
	updateTestMetric,
	deleteTestMetric,
	getTestRuns,
	getTestRun,
	startTestRun,
	deleteTestRun,
}));

vi.mock('@/stores/root.store', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { instanceId: 'test-instance-id' },
	})),
}));

const TEST_DEF_A: TestDefinitionRecord = {
	id: '1',
	name: 'Test Definition A',
	workflowId: '123',
	description: 'Description A',
	createdAt: '2023-01-01T00:00:00.000Z',
};
const TEST_DEF_B: TestDefinitionRecord = {
	id: '2',
	name: 'Test Definition B',
	workflowId: '123',
	description: 'Description B',
	createdAt: '2023-01-01T00:00:00.000Z',
};
const TEST_DEF_NEW: TestDefinitionRecord = {
	id: '3',
	name: 'New Test Definition',
	workflowId: '123',
	description: 'New Description',
	createdAt: '2023-01-01T00:00:00.000Z',
};

const TEST_METRIC = {
	id: 'metric1',
	name: 'Test Metric',
	testDefinitionId: '1',
	createdAt: '2023-01-01T00:00:00.000Z',
};

const TEST_RUN: TestRunRecord = {
	id: 'run1',
	testDefinitionId: '1',
	status: 'completed',
	metrics: { metric1: 0.75 },
	createdAt: '2024-01-01',
	updatedAt: '2024-01-01',
	runAt: '2024-01-01',
	completedAt: '2024-01-01',
	failedCases: 0,
	totalCases: 1,
	passedCases: 1,
};

describe('testDefinition.store.ee', () => {
	let store: ReturnType<typeof useTestDefinitionStore>;
	let rootStoreMock: ReturnType<typeof useRootStore>;
	let posthogStoreMock: ReturnType<typeof usePostHog>;

	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		store = useTestDefinitionStore();
		rootStoreMock = useRootStore();
		posthogStoreMock = usePostHog();

		mockedStore(useAnnotationTagsStore).fetchAll = vi.fn().mockResolvedValue([]);
		getTestDefinitions.mockResolvedValue({
			count: 2,
			testDefinitions: [TEST_DEF_A, TEST_DEF_B],
		});

		createTestDefinition.mockResolvedValue(TEST_DEF_NEW);

		deleteTestDefinition.mockResolvedValue({ success: true });

		getTestRuns.mockResolvedValue([TEST_RUN]);
		getTestRun.mockResolvedValue(TEST_RUN);
		startTestRun.mockResolvedValue({ success: true });
		deleteTestRun.mockResolvedValue({ success: true });
		getTestMetrics.mockResolvedValue([TEST_METRIC]);
	});

	test('Initialization', () => {
		expect(store.testDefinitionsById).toEqual({});
		expect(store.isLoading).toBe(false);
		expect(store.hasTestDefinitions).toBe(false);
	});

	describe('Test Definitions', () => {
		test('Fetching Test Definitions', async () => {
			expect(store.isLoading).toBe(false);

			const result = await store.fetchAll({ workflowId: '123' });

			expect(getTestDefinitions).toHaveBeenCalledWith(rootStoreMock.restApiContext, {
				workflowId: '123',
			});
			expect(store.testDefinitionsById).toEqual({
				'1': TEST_DEF_A,
				'2': TEST_DEF_B,
			});
			expect(store.isLoading).toBe(false);
			expect(result).toEqual([TEST_DEF_A, TEST_DEF_B]);
		});

		test('Fetching Test Definitions with force flag', async () => {
			expect(store.isLoading).toBe(false);

			const result = await store.fetchAll({ force: true, workflowId: '123' });

			expect(getTestDefinitions).toHaveBeenCalledWith(rootStoreMock.restApiContext, {
				workflowId: '123',
			});
			expect(store.testDefinitionsById).toEqual({
				'1': TEST_DEF_A,
				'2': TEST_DEF_B,
			});
			expect(store.isLoading).toBe(false);
			expect(result).toEqual([TEST_DEF_A, TEST_DEF_B]);
		});

		test('Fetching Test Definitions when already fetched', async () => {
			store.fetchedAll = true;

			const result = await store.fetchAll();

			expect(getTestDefinitions).not.toHaveBeenCalled();
			expect(store.testDefinitionsById).toEqual({});
			expect(result).toEqual({
				count: 0,
				testDefinitions: [],
			});
		});

		test('Upserting Test Definitions - New Definition', () => {
			const newDefinition = TEST_DEF_NEW;

			store.upsertTestDefinitions([newDefinition]);

			expect(store.testDefinitionsById).toEqual({
				'3': TEST_DEF_NEW,
			});
		});

		test('Upserting Test Definitions - Existing Definition', () => {
			store.testDefinitionsById = {
				'1': TEST_DEF_A,
			};

			const updatedDefinition = {
				id: '1',
				name: 'Updated Test Definition A',
				description: 'Updated Description A',
				workflowId: '123',
				createdAt: '2023-01-01T00:00:00.000Z',
			};

			store.upsertTestDefinitions([updatedDefinition]);

			expect(store.testDefinitionsById).toEqual({
				1: updatedDefinition,
			});
		});

		test('Creating a Test Definition', async () => {
			const params = {
				name: 'New Test Definition',
				workflowId: 'test-workflow-id',
				evaluationWorkflowId: 'test-evaluation-workflow-id',
				description: 'New Description',
			};

			const result = await store.create(params);

			expect(createTestDefinition).toHaveBeenCalledWith(rootStoreMock.restApiContext, params);
			expect(store.testDefinitionsById).toEqual({
				'3': TEST_DEF_NEW,
			});
			expect(result).toEqual(TEST_DEF_NEW);
		});

		test('Updating a Test Definition', async () => {
			store.testDefinitionsById = {
				'1': TEST_DEF_A,
				'2': TEST_DEF_B,
			};

			const params = {
				id: '1',
				name: 'Updated Test Definition A',
				description: 'Updated Description A',
				workflowId: '123',
			};
			updateTestDefinition.mockResolvedValue(params);

			const result = await store.update(params);

			expect(updateTestDefinition).toHaveBeenCalledWith(rootStoreMock.restApiContext, '1', {
				name: 'Updated Test Definition A',
				description: 'Updated Description A',
				workflowId: '123',
			});
			expect(store.testDefinitionsById).toEqual({
				'1': { ...TEST_DEF_A, ...params },
				'2': TEST_DEF_B,
			});
			expect(result).toEqual(params);
		});

		test('Deleting a Test Definition', () => {
			store.testDefinitionsById = {
				'1': TEST_DEF_A,
				'2': TEST_DEF_B,
			};

			store.deleteTestDefinition('1');

			expect(store.testDefinitionsById).toEqual({
				'2': TEST_DEF_B,
			});
		});

		test('Deleting a Test Definition by ID', async () => {
			store.testDefinitionsById = {
				'1': TEST_DEF_A,
			};

			const result = await store.deleteById('1');

			expect(deleteTestDefinition).toHaveBeenCalledWith(rootStoreMock.restApiContext, '1');
			expect(store.testDefinitionsById).toEqual({});
			expect(result).toBe(true);
		});
	});

	describe('Metrics', () => {
		test('Fetching Metrics for a Test Definition', async () => {
			const metrics = await store.fetchMetrics('1');

			expect(getTestMetrics).toHaveBeenCalledWith(rootStoreMock.restApiContext, '1');
			expect(store.metricsById).toEqual({
				metric1: TEST_METRIC,
			});
			expect(metrics).toEqual([TEST_METRIC]);
		});

		test('Creating a Metric', async () => {
			createTestMetric.mockResolvedValue(TEST_METRIC);

			const params = {
				name: 'Test Metric',
				testDefinitionId: '1',
			};

			const result = await store.createMetric(params);

			expect(createTestMetric).toHaveBeenCalledWith(rootStoreMock.restApiContext, params);
			expect(store.metricsById).toEqual({
				metric1: TEST_METRIC,
			});
			expect(result).toEqual(TEST_METRIC);
		});

		test('Updating a Metric', async () => {
			const updatedMetric = { ...TEST_METRIC, name: 'Updated Metric' };
			updateTestMetric.mockResolvedValue(updatedMetric);

			const result = await store.updateMetric(updatedMetric);

			expect(updateTestMetric).toHaveBeenCalledWith(rootStoreMock.restApiContext, updatedMetric);
			expect(store.metricsById).toEqual({
				metric1: updatedMetric,
			});
			expect(result).toEqual(updatedMetric);
		});

		test('Deleting a Metric', async () => {
			store.metricsById = {
				metric1: TEST_METRIC,
			};

			const params = { id: 'metric1', testDefinitionId: '1' };
			deleteTestMetric.mockResolvedValue(undefined);

			await store.deleteMetric(params);

			expect(deleteTestMetric).toHaveBeenCalledWith(rootStoreMock.restApiContext, params);
			expect(store.metricsById).toEqual({});
		});

		test('Getting Metrics by Test ID', () => {
			const metric1 = { ...TEST_METRIC, id: 'metric1', testDefinitionId: '1' };
			const metric2 = { ...TEST_METRIC, id: 'metric2', testDefinitionId: '1' };
			const metric3 = { ...TEST_METRIC, id: 'metric3', testDefinitionId: '2' };

			store.metricsById = {
				metric1,
				metric2,
				metric3,
			};

			const metricsForTest1 = store.metricsByTestId['1'];
			expect(metricsForTest1).toEqual([metric1, metric2]);

			const metricsForTest2 = store.metricsByTestId['2'];
			expect(metricsForTest2).toEqual([metric3]);
		});
	});

	describe('Computed Properties', () => {
		test('hasTestDefinitions', () => {
			store.testDefinitionsById = {};

			expect(store.hasTestDefinitions).toBe(false);
			store.testDefinitionsById = {
				'1': TEST_DEF_A,
			};

			expect(store.hasTestDefinitions).toBe(true);
		});

		test('isFeatureEnabled', () => {
			posthogStoreMock.isFeatureEnabled = vi.fn().mockReturnValue(false);

			expect(store.isFeatureEnabled).toBe(false);
			posthogStoreMock.isFeatureEnabled = vi.fn().mockReturnValue(true);

			expect(store.isFeatureEnabled).toBe(true);
		});

		test('allTestDefinitionsByWorkflowId', () => {
			store.testDefinitionsById = {
				'1': { ...TEST_DEF_A, workflowId: 'workflow1' },
				'2': { ...TEST_DEF_B, workflowId: 'workflow1' },
				'3': { ...TEST_DEF_NEW, workflowId: 'workflow2' },
			};

			expect(store.allTestDefinitionsByWorkflowId).toEqual({
				workflow1: [
					{ ...TEST_DEF_A, workflowId: 'workflow1' },
					{ ...TEST_DEF_B, workflowId: 'workflow1' },
				],
				workflow2: [{ ...TEST_DEF_NEW, workflowId: 'workflow2' }],
			});
		});

		test('lastRunByTestId', () => {
			const olderRun = {
				...TEST_RUN,
				id: 'run2',
				testDefinitionId: '1',
				updatedAt: '2023-12-31',
			};

			const newerRun = {
				...TEST_RUN,
				id: 'run3',
				testDefinitionId: '2',
				updatedAt: '2024-01-02',
			};

			store.testRunsById = {
				run1: { ...TEST_RUN, testDefinitionId: '1' },
				run2: olderRun,
				run3: newerRun,
			};

			expect(store.lastRunByTestId).toEqual({
				'1': TEST_RUN,
				'2': newerRun,
			});
		});

		test('lastRunByTestId with no runs', () => {
			store.testRunsById = {};
			expect(store.lastRunByTestId).toEqual({});
		});
	});

	describe('Error Handling', () => {
		test('create', async () => {
			createTestDefinition.mockRejectedValue(new Error('Create failed'));

			await expect(
				store.create({ name: 'New Test Definition', workflowId: 'test-workflow-id' }),
			).rejects.toThrow('Create failed');
		});

		test('update', async () => {
			updateTestDefinition.mockRejectedValue(new Error('Update failed'));

			await expect(store.update({ id: '1', name: 'Updated Test Definition A' })).rejects.toThrow(
				'Update failed',
			);
		});

		test('deleteById', async () => {
			deleteTestDefinition.mockResolvedValue({ success: false });

			const result = await store.deleteById('1');

			expect(result).toBe(false);
		});
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
			const params = { testDefinitionId: '1', runId: 'run1' };
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
			const params = { testDefinitionId: '1', runId: 'run1' };

			const result = await store.deleteTestRun(params);

			expect(deleteTestRun).toHaveBeenCalledWith(rootStoreMock.restApiContext, params);
			expect(store.testRunsById).toEqual({});
			expect(result).toEqual({ success: true });
		});

		test('Getting Test Runs by Test ID', () => {
			store.testRunsById = {
				run1: TEST_RUN,
				run2: { ...TEST_RUN, id: 'run2', testDefinitionId: '2' },
			};

			const runs = store.testRunsByTestId['1'];

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
				testDefinitionId: '1',
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
