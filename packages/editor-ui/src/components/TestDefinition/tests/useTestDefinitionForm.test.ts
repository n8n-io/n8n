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
};
const TEST_DEF_B: TestDefinitionRecord = {
	id: '2',
	name: 'Test Definition B',
	workflowId: '123',
	description: 'Description B',
};
const TEST_DEF_NEW: TestDefinitionRecord = {
	id: '3',
	workflowId: '123',
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

describe('useTestDefinitionForm', async () => {
	it('should initialize with default props', async () => {
		const { state } = useTestDefinitionForm();

		expect(state.value.description).toEqual('');
		expect(state.value.name.value).toContain('My Test');
		expect(state.value.tags.appliedTagIds).toEqual([]);
		expect(state.value.metrics).toEqual(['']);
		expect(state.value.evaluationWorkflow.value).toEqual('');
	});

	it('should load test data', async () => {
		const { loadTestData, state } = useTestDefinitionForm();
		const fetchSpy = vi.fn();
		const evaluationsStore = mockedStore(useTestDefinitionStore);

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
		const { createTest, state } = useTestDefinitionForm();
		const createSpy = vi.fn().mockResolvedValue(TEST_DEF_NEW);
		const evaluationsStore = mockedStore(useTestDefinitionStore);

		evaluationsStore.create = createSpy;

		state.value.name.value = TEST_DEF_NEW.name;
		state.value.description = TEST_DEF_NEW.description ?? '';

		const newTest = await createTest('123');
		expect(createSpy).toBeCalledWith({
			name: TEST_DEF_NEW.name,
			description: TEST_DEF_NEW.description,
			workflowId: '123',
		});
		expect(newTest).toEqual(TEST_DEF_NEW);
	});

	it('should update an existing test', async () => {
		const { updateTest, state } = useTestDefinitionForm();
		const updateSpy = vi.fn().mockResolvedValue(TEST_DEF_B);
		const evaluationsStore = mockedStore(useTestDefinitionStore);

		evaluationsStore.update = updateSpy;

		state.value.name.value = TEST_DEF_B.name;
		state.value.description = TEST_DEF_B.description ?? '';

		const updatedTest = await updateTest(TEST_DEF_A.id);
		expect(updateSpy).toBeCalledWith({
			id: TEST_DEF_A.id,
			name: TEST_DEF_B.name,
			description: TEST_DEF_B.description,
		});
		expect(updatedTest).toEqual(TEST_DEF_B);
	});

	it('should start editing a field', async () => {
		const { state, startEditing } = useTestDefinitionForm();

		await startEditing('name');
		expect(state.value.name.isEditing).toBe(true);
		expect(state.value.name.tempValue).toBe(state.value.name.value);

		await startEditing('tags');
		expect(state.value.tags.isEditing).toBe(true);
	});

	it('should save changes to a field', async () => {
		const { state, startEditing, saveChanges } = useTestDefinitionForm();

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
		const { state, startEditing, cancelEditing } = useTestDefinitionForm();

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
		const { state, startEditing, handleKeydown } = useTestDefinitionForm();

		await startEditing('name');
		handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'name');
		expect(state.value.name.isEditing).toBe(false);

		await startEditing('tags');
		handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }), 'tags');
		expect(state.value.tags.isEditing).toBe(false);
	});

	it('should handle keydown - Enter', async () => {
		const { state, startEditing, handleKeydown } = useTestDefinitionForm();

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
