import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useEvaluationForm } from '../composables/useEvaluationForm';
import { useEvaluationsStore } from '@/stores/evaluations.store.ee';
import { mockedStore } from '@/__tests__/utils';
import type { ITestDefinition } from '@/api/evaluations.ee';

const TEST_DEF_A: ITestDefinition = {
	id: 1,
	name: 'Test Definition A',
	description: 'Description A',
	evaluationWorkflowId: '456',
	workflowId: '123',
	annotationTagId: '789',
};
const TEST_DEF_B: ITestDefinition = {
	id: 2,
	name: 'Test Definition B',
	description: 'Description B',
};
const TEST_DEF_NEW: ITestDefinition = {
	id: 3,
	name: 'New Test Definition',
	description: 'New Description',
};

beforeEach(() => {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('useEvaluationForm', async () => {
	it('should initialize with default props', async () => {
		const { state } = useEvaluationForm();

		expect(state.value.description).toEqual('');
		expect(state.value.name.value).toContain('My Test');
		expect(state.value.tags.appliedTagIds).toEqual([]);
		expect(state.value.metrics).toEqual(['']);
		expect(state.value.evaluationWorkflow.value).toEqual('');
	});

	it('should load test data', async () => {
		const { loadTestData, state } = useEvaluationForm();
		const fetchSpy = vi.fn();
		const evaluationsStore = mockedStore(useEvaluationsStore);

		expect(state.value.description).toEqual('');
		expect(state.value.name.value).toContain('My Test');
		evaluationsStore.testDefinitionsById = {
			[TEST_DEF_A.id]: TEST_DEF_A,
			[TEST_DEF_B.id]: TEST_DEF_B,
		};
		evaluationsStore.fetchAll = fetchSpy;

		await loadTestData(TEST_DEF_A.id);
		expect(fetchSpy).toBeCalled();
		expect(state.value.name.value).toEqual(TEST_DEF_A.name);
		expect(state.value.description).toEqual(TEST_DEF_A.description);
		expect(state.value.tags.appliedTagIds).toEqual([TEST_DEF_A.annotationTagId]);
		expect(state.value.evaluationWorkflow.value).toEqual(TEST_DEF_A.evaluationWorkflowId);
	});

	it('should save a new test', async () => {
		const { saveTest, state } = useEvaluationForm();
		const createSpy = vi.fn().mockResolvedValue(TEST_DEF_NEW);
		const evaluationsStore = mockedStore(useEvaluationsStore);

		evaluationsStore.create = createSpy;

		state.value.name.value = TEST_DEF_NEW.name;
		state.value.description = TEST_DEF_NEW.description ?? '';

		const newTest = await saveTest();
		expect(createSpy).toBeCalledWith({
			name: TEST_DEF_NEW.name,
			description: TEST_DEF_NEW.description,
			workflowId: state.value.evaluationWorkflow.value,
		});
		expect(newTest).toEqual(TEST_DEF_NEW);
	});

	it('should update an existing test', async () => {
		const { saveTest, state } = useEvaluationForm();
		const updateSpy = vi.fn().mockResolvedValue(TEST_DEF_B);
		const evaluationsStore = mockedStore(useEvaluationsStore);

		evaluationsStore.update = updateSpy;

		state.value.name.value = TEST_DEF_B.name;
		state.value.description = TEST_DEF_B.description ?? '';

		const updatedTest = await saveTest(TEST_DEF_A.id);
		expect(updateSpy).toBeCalledWith({
			id: TEST_DEF_A.id,
			name: TEST_DEF_B.name,
			description: TEST_DEF_B.description,
		});
		expect(updatedTest).toEqual(TEST_DEF_B);
	});

	it('should start editing a field', async () => {
		const { state, startEditing } = useEvaluationForm();

		await startEditing('name');
		expect(state.value.name.isEditing).toBe(true);
		expect(state.value.name.tempValue).toBe(state.value.name.value);

		await startEditing('tags');
		expect(state.value.tags.isEditing).toBe(true);
	});

	it('should save changes to a field', async () => {
		const { state, startEditing, saveChanges } = useEvaluationForm();

		await startEditing('name');
		state.value.name.tempValue = 'New Name';
		saveChanges('name');
		expect(state.value.name.isEditing).toBe(false);
		expect(state.value.name.value).toBe('New Name');

		await startEditing('tags');
		state.value.tags.appliedTagIds = ['123'];
		saveChanges('tags');
		expect(state.value.tags.isEditing).toBe(false);
		expect(state.value.tags.appliedTagIds).toEqual(['123']);
	});

	it('should cancel editing a field', async () => {
		const { state, startEditing, cancelEditing } = useEvaluationForm();

		await startEditing('name');
		state.value.name.tempValue = 'New Name';
		cancelEditing('name');
		expect(state.value.name.isEditing).toBe(false);
		expect(state.value.name.tempValue).toBe('');

		await startEditing('tags');
		state.value.tags.appliedTagIds = ['123'];
		cancelEditing('tags');
		expect(state.value.tags.isEditing).toBe(false);
	});

	it('should handle keydown - Escape', async () => {
		const { state, startEditing, handleKeydown } = useEvaluationForm();

		await startEditing('name');
		handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'name');
		expect(state.value.name.isEditing).toBe(false);

		await startEditing('tags');
		handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'tags');
		expect(state.value.tags.isEditing).toBe(false);
	});

	it('should handle keydown - Enter', async () => {
		const { state, startEditing, handleKeydown } = useEvaluationForm();

		await startEditing('name');
		state.value.name.tempValue = 'New Name';
		handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 'name');
		expect(state.value.name.isEditing).toBe(false);
		expect(state.value.name.value).toBe('New Name');

		await startEditing('tags');
		state.value.tags.appliedTagIds = ['123'];
		handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 'tags');
		expect(state.value.tags.isEditing).toBe(false);
	});
});
