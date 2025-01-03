import { createPinia, setActivePinia } from 'pinia';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee'; // Adjust the import path as necessary
import { useRootStore } from '@/stores/root.store';
import { usePostHog } from '@/stores/posthog.store';
import type { TestDefinitionRecord } from '@/api/testDefinition.ee';

const { createTestDefinition, deleteTestDefinition, getTestDefinitions, updateTestDefinition } =
	vi.hoisted(() => ({
		getTestDefinitions: vi.fn(),
		createTestDefinition: vi.fn(),
		updateTestDefinition: vi.fn(),
		deleteTestDefinition: vi.fn(),
	}));

vi.mock('@/api/testDefinition.ee', () => ({
	createTestDefinition,
	deleteTestDefinition,
	getTestDefinitions,
	updateTestDefinition,
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
});
