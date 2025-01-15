import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useTestDefinitionForm } from '../composables/useTestDefinitionForm';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { mockedStore } from '@/__tests__/utils';
import type { TestDefinitionRecord } from '@/api/testDefinition.ee';

const TEST_DEF_A: TestDefinitionRecord = {
	id: '1',
	name: 'Test Definition A',
	description: 'Description A',
	evaluationWorkflowId: '456',
	workflowId: '123',
	annotationTagId: '789',
	annotationTag: null,
};
const TEST_DEF_B: TestDefinitionRecord = {
	id: '2',
	name: 'Test Definition B',
	workflowId: '123',
	description: 'Description B',
	annotationTag: null,
};
const TEST_DEF_NEW: TestDefinitionRecord = {
	id: '3',
	workflowId: '123',
	name: 'New Test Definition',
	description: 'New Description',
	annotationTag: null,
};

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('useTestDefinitionForm', () => {
	it('should initialize with default props', () => {
		const { state } = useTestDefinitionForm();

		expect(state.value.description.value).toBe('');
		expect(state.value.name.value).toContain('My Test');
		expect(state.value.tags.value).toEqual([]);
		expect(state.value.metrics).toEqual([]);
		expect(state.value.evaluationWorkflow.value).toBe('');
	});

	it('should load test data', async () => {
		const { loadTestData, state } = useTestDefinitionForm();
		const fetchSpy = vi.spyOn(useTestDefinitionStore(), 'fetchAll');
		const fetchMetricsSpy = vi.spyOn(useTestDefinitionStore(), 'fetchMetrics').mockResolvedValue([
			{
				id: 'metric1',
				name: 'Metric 1',
				testDefinitionId: TEST_DEF_A.id,
			},
		]);
		const evaluationsStore = mockedStore(useTestDefinitionStore);

		evaluationsStore.testDefinitionsById = {
			[TEST_DEF_A.id]: TEST_DEF_A,
			[TEST_DEF_B.id]: TEST_DEF_B,
		};

		await loadTestData(TEST_DEF_A.id);
		expect(fetchSpy).toBeCalled();
		expect(fetchMetricsSpy).toBeCalledWith(TEST_DEF_A.id);
		expect(state.value.name.value).toEqual(TEST_DEF_A.name);
		expect(state.value.description.value).toEqual(TEST_DEF_A.description);
		expect(state.value.tags.value).toEqual([TEST_DEF_A.annotationTagId]);
		expect(state.value.evaluationWorkflow.value).toEqual(TEST_DEF_A.evaluationWorkflowId);
		expect(state.value.metrics).toEqual([
			{ id: 'metric1', name: 'Metric 1', testDefinitionId: TEST_DEF_A.id },
		]);
	});

	it('should gracefully handle loadTestData when no test definition found', async () => {
		const { loadTestData, state } = useTestDefinitionForm();
		const fetchSpy = vi.spyOn(useTestDefinitionStore(), 'fetchAll');
		const evaluationsStore = mockedStore(useTestDefinitionStore);

		evaluationsStore.testDefinitionsById = {};

		await loadTestData('unknown-id');
		expect(fetchSpy).toBeCalled();
		// Should remain unchanged since no definition found
		expect(state.value.description.value).toBe('');
		expect(state.value.name.value).toContain('My Test');
		expect(state.value.tags.value).toEqual([]);
		expect(state.value.metrics).toEqual([]);
	});

	it('should handle errors while loading test data', async () => {
		const { loadTestData } = useTestDefinitionForm();
		const fetchSpy = vi
			.spyOn(useTestDefinitionStore(), 'fetchAll')
			.mockRejectedValue(new Error('Fetch Failed'));
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await loadTestData(TEST_DEF_A.id);
		expect(fetchSpy).toBeCalled();
		expect(consoleErrorSpy).toBeCalledWith('Failed to load test data', expect.any(Error));
		consoleErrorSpy.mockRestore();
	});

	it('should save a new test', async () => {
		const { createTest, state } = useTestDefinitionForm();
		const createSpy = vi.spyOn(useTestDefinitionStore(), 'create').mockResolvedValue(TEST_DEF_NEW);

		state.value.name.value = TEST_DEF_NEW.name;
		state.value.description.value = TEST_DEF_NEW.description ?? '';

		const newTest = await createTest('123');
		expect(createSpy).toBeCalledWith({
			name: TEST_DEF_NEW.name,
			description: TEST_DEF_NEW.description,
			workflowId: '123',
		});
		expect(newTest).toEqual(TEST_DEF_NEW);
	});

	it('should handle errors when creating a new test', async () => {
		const { createTest } = useTestDefinitionForm();
		const createSpy = vi
			.spyOn(useTestDefinitionStore(), 'create')
			.mockRejectedValue(new Error('Create Failed'));

		await expect(createTest('123')).rejects.toThrow('Create Failed');
		expect(createSpy).toBeCalled();
	});

	it('should update an existing test', async () => {
		const { updateTest, state } = useTestDefinitionForm();
		const updatedBTest = {
			...TEST_DEF_B,
			updatedAt: '2022-01-01T00:00:00.000Z',
			createdAt: '2022-01-01T00:00:00.000Z',
		};
		const updateSpy = vi.spyOn(useTestDefinitionStore(), 'update').mockResolvedValue(updatedBTest);

		state.value.name.value = TEST_DEF_B.name;
		state.value.description.value = TEST_DEF_B.description ?? '';

		const updatedTest = await updateTest(TEST_DEF_A.id);
		expect(updateSpy).toBeCalledWith({
			id: TEST_DEF_A.id,
			name: TEST_DEF_B.name,
			description: TEST_DEF_B.description,
		});
		expect(updatedTest).toEqual(updatedBTest);
	});

	it('should throw an error if no testId is provided when updating a test', async () => {
		const { updateTest } = useTestDefinitionForm();
		await expect(updateTest('')).rejects.toThrow('Test ID is required for updating a test');
	});

	it('should handle errors when updating a test', async () => {
		const { updateTest, state } = useTestDefinitionForm();
		const updateSpy = vi
			.spyOn(useTestDefinitionStore(), 'update')
			.mockRejectedValue(new Error('Update Failed'));

		state.value.name.value = 'Test';
		state.value.description.value = 'Some description';

		await expect(updateTest(TEST_DEF_A.id)).rejects.toThrow('Update Failed');
		expect(updateSpy).toBeCalled();
	});

	it('should delete a metric', async () => {
		const { state, deleteMetric } = useTestDefinitionForm();
		const evaluationsStore = mockedStore(useTestDefinitionStore);
		const deleteMetricSpy = vi.spyOn(evaluationsStore, 'deleteMetric');

		state.value.metrics = [
			{
				id: 'metric1',
				name: 'Metric 1',
				testDefinitionId: '1',
			},
			{
				id: 'metric2',
				name: 'Metric 2',
				testDefinitionId: '1',
			},
		];

		await deleteMetric('metric1', TEST_DEF_A.id);
		expect(deleteMetricSpy).toBeCalledWith({ id: 'metric1', testDefinitionId: TEST_DEF_A.id });
		expect(state.value.metrics).toEqual([
			{ id: 'metric2', name: 'Metric 2', testDefinitionId: '1' },
		]);
	});

	it('should update metrics', async () => {
		const { state, updateMetrics } = useTestDefinitionForm();
		const evaluationsStore = mockedStore(useTestDefinitionStore);
		const updateMetricSpy = vi.spyOn(evaluationsStore, 'updateMetric');
		const createMetricSpy = vi
			.spyOn(evaluationsStore, 'createMetric')
			.mockResolvedValue({ id: 'metric_new', name: 'Metric 2', testDefinitionId: TEST_DEF_A.id });

		state.value.metrics = [
			{
				id: 'metric1',
				name: 'Metric 1',
				testDefinitionId: TEST_DEF_A.id,
			},
			{
				id: '',
				name: 'Metric 2',
				testDefinitionId: TEST_DEF_A.id,
			}, // New metric that needs creation
		];

		await updateMetrics(TEST_DEF_A.id);
		expect(createMetricSpy).toHaveBeenCalledWith({
			name: 'Metric 2',
			testDefinitionId: TEST_DEF_A.id,
		});
		expect(updateMetricSpy).toHaveBeenCalledWith({
			name: 'Metric 1',
			id: 'metric1',
			testDefinitionId: TEST_DEF_A.id,
		});
		expect(state.value.metrics).toEqual([
			{ id: 'metric1', name: 'Metric 1', testDefinitionId: TEST_DEF_A.id },
			{ id: 'metric_new', name: 'Metric 2', testDefinitionId: TEST_DEF_A.id },
		]);
	});

	it('should start editing a field', () => {
		const { state, startEditing } = useTestDefinitionForm();

		startEditing('name');
		expect(state.value.name.isEditing).toBe(true);
		expect(state.value.name.tempValue).toBe(state.value.name.value);

		startEditing('tags');
		expect(state.value.tags.isEditing).toBe(true);
		expect(state.value.tags.tempValue).toEqual(state.value.tags.value);
	});

	it('should do nothing if startEditing is called while already editing', () => {
		const { state, startEditing } = useTestDefinitionForm();
		state.value.name.isEditing = true;
		state.value.name.tempValue = 'Original Name';

		startEditing('name');
		// Should remain unchanged because it was already editing
		expect(state.value.name.isEditing).toBe(true);
		expect(state.value.name.tempValue).toBe('Original Name');
	});

	it('should save changes to a field', () => {
		const { state, startEditing, saveChanges } = useTestDefinitionForm();

		// Name
		startEditing('name');
		state.value.name.tempValue = 'New Name';
		saveChanges('name');
		expect(state.value.name.isEditing).toBe(false);
		expect(state.value.name.value).toBe('New Name');

		// Tags
		startEditing('tags');
		state.value.tags.tempValue = ['123'];
		saveChanges('tags');
		expect(state.value.tags.isEditing).toBe(false);
		expect(state.value.tags.value).toEqual(['123']);
	});

	it('should cancel editing a field', () => {
		const { state, startEditing, cancelEditing } = useTestDefinitionForm();

		const originalName = state.value.name.value;
		startEditing('name');
		state.value.name.tempValue = 'New Name';
		cancelEditing('name');
		expect(state.value.name.isEditing).toBe(false);
		expect(state.value.name.tempValue).toBe(originalName);

		const originalTags = [...state.value.tags.value];
		startEditing('tags');
		state.value.tags.tempValue = ['123'];
		cancelEditing('tags');
		expect(state.value.tags.isEditing).toBe(false);
		expect(state.value.tags.tempValue).toEqual(originalTags);
	});

	it('should handle keydown - Escape', () => {
		const { state, startEditing, handleKeydown } = useTestDefinitionForm();

		startEditing('name');
		handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'name');
		expect(state.value.name.isEditing).toBe(false);

		startEditing('tags');
		handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'tags');
		expect(state.value.tags.isEditing).toBe(false);
	});

	it('should handle keydown - Enter', () => {
		const { state, startEditing, handleKeydown } = useTestDefinitionForm();

		startEditing('name');
		state.value.name.tempValue = 'New Name';
		handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 'name');
		expect(state.value.name.isEditing).toBe(false);
		expect(state.value.name.value).toBe('New Name');

		startEditing('tags');
		state.value.tags.tempValue = ['123'];
		handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 'tags');
		expect(state.value.tags.isEditing).toBe(false);
		expect(state.value.tags.value).toEqual(['123']);
	});

	it('should not save changes when shift+Enter is pressed', () => {
		const { state, startEditing, handleKeydown } = useTestDefinitionForm();

		startEditing('name');
		state.value.name.tempValue = 'New Name With Shift';
		handleKeydown(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }), 'name');
		expect(state.value.name.isEditing).toBe(true);
		expect(state.value.name.value).not.toBe('New Name With Shift');
	});
});
