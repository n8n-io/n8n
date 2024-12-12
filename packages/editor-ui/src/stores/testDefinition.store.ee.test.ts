import { createPinia, setActivePinia } from 'pinia';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee'; // Adjust the import path as necessary
import { useRootStore } from '@/stores/root.store';
import { usePostHog } from '@/stores/posthog.store';
import type { TestDefinitionRecord } from '@/api/testDefinition.ee';

const {
	createTestDefinition,
	deleteTestDefinition,
	getTestDefinitions,
	updateTestDefinition,
	getTestMetrics,
	createTestMetric,
	updateTestMetric,
	deleteTestMetric,
} = vi.hoisted(() => ({
	getTestDefinitions: vi.fn(),
	createTestDefinition: vi.fn(),
	updateTestDefinition: vi.fn(),
	deleteTestDefinition: vi.fn(),
	getTestMetrics: vi.fn(),
	createTestMetric: vi.fn(),
	updateTestMetric: vi.fn(),
	deleteTestMetric: vi.fn(),
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
};
const TEST_DEF_B: TestDefinitionRecord = {
	id: '2',
	name: 'Test Definition B',
	workflowId: '123',
	description: 'Description B',
};
const TEST_DEF_NEW: TestDefinitionRecord = {
	id: '3',
	name: 'New Test Definition',
	workflowId: '123',
	description: 'New Description',
};

const TEST_METRIC = {
	id: 'metric1',
	name: 'Test Metric',
	testDefinitionId: '1',
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

		getTestDefinitions.mockResolvedValue({
			count: 2,
			testDefinitions: [TEST_DEF_A, TEST_DEF_B],
		});

		createTestDefinition.mockResolvedValue(TEST_DEF_NEW);

		deleteTestDefinition.mockResolvedValue({ success: true });
	});

	test('Initialization', () => {
		expect(store.testDefinitionsById).toEqual({});
		expect(store.isLoading).toBe(false);
		expect(store.hasTestDefinitions).toBe(false);
	});

	test('Fetching Test Definitions', async () => {
		expect(store.isLoading).toBe(false);

		const result = await store.fetchAll();

		expect(getTestDefinitions).toHaveBeenCalledWith(rootStoreMock.restApiContext);
		expect(store.testDefinitionsById).toEqual({
			'1': TEST_DEF_A,
			'2': TEST_DEF_B,
		});
		expect(store.isLoading).toBe(false);
		expect(result).toEqual({
			count: 2,
			testDefinitions: [TEST_DEF_A, TEST_DEF_B],
		});
	});

	test('Fetching Test Definitions with force flag', async () => {
		expect(store.isLoading).toBe(false);

		const result = await store.fetchAll({ force: true });

		expect(getTestDefinitions).toHaveBeenCalledWith(rootStoreMock.restApiContext);
		expect(store.testDefinitionsById).toEqual({
			'1': TEST_DEF_A,
			'2': TEST_DEF_B,
		});
		expect(store.isLoading).toBe(false);
		expect(result).toEqual({
			count: 2,
			testDefinitions: [TEST_DEF_A, TEST_DEF_B],
		});
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
		};

		store.upsertTestDefinitions([updatedDefinition]);

		expect(store.testDefinitionsById).toEqual({
			1: updatedDefinition,
		});
	});

	test('Deleting Test Definitions', () => {
		store.testDefinitionsById = {
			'1': TEST_DEF_A,
			'2': TEST_DEF_B,
		};

		store.deleteTestDefinition('1');

		expect(store.testDefinitionsById).toEqual({
			'2': TEST_DEF_B,
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
			'1': params,
			'2': TEST_DEF_B,
		});
		expect(result).toEqual(params);
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

	test('Computed Properties - hasTestDefinitions', () => {
		store.testDefinitionsById = {};

		expect(store.hasTestDefinitions).toBe(false);
		store.testDefinitionsById = {
			'1': TEST_DEF_A,
		};

		expect(store.hasTestDefinitions).toBe(true);
	});

	test('Computed Properties - isFeatureEnabled', () => {
		posthogStoreMock.isFeatureEnabled = vi.fn().mockReturnValue(false);

		expect(store.isFeatureEnabled).toBe(false);
		posthogStoreMock.isFeatureEnabled = vi.fn().mockReturnValue(true);

		expect(store.isFeatureEnabled).toBe(true);
	});

	test('Error Handling - create', async () => {
		createTestDefinition.mockRejectedValue(new Error('Create failed'));

		await expect(
			store.create({ name: 'New Test Definition', workflowId: 'test-workflow-id' }),
		).rejects.toThrow('Create failed');
	});

	test('Error Handling - update', async () => {
		updateTestDefinition.mockRejectedValue(new Error('Update failed'));

		await expect(store.update({ id: '1', name: 'Updated Test Definition A' })).rejects.toThrow(
			'Update failed',
		);
	});

	test('Error Handling - deleteById', async () => {
		deleteTestDefinition.mockResolvedValue({ success: false });

		const result = await store.deleteById('1');

		expect(result).toBe(false);
	});

	test('Fetching Metrics for a Test Definition', async () => {
		getTestMetrics.mockResolvedValue([TEST_METRIC]);

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

		const metricsForTest1 = store.getMetricsByTestId('1');
		expect(metricsForTest1).toEqual([metric1, metric2]);

		const metricsForTest2 = store.getMetricsByTestId('2');
		expect(metricsForTest2).toEqual([metric3]);
	});
});
