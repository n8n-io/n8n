import { ref, computed } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import type AnnotationTagsDropdownEe from '@/components/AnnotationTagsDropdown.ee.vue';
import type { N8nInput } from 'n8n-design-system';
import type { UpdateTestDefinitionParams } from '@/api/testDefinition.ee';

interface EditableField {
	value: string;
	isEditing: boolean;
	tempValue: string;
}

export interface IEvaluationFormState {
	name: EditableField;
	description: string;
	tags: {
		isEditing: boolean;
		appliedTagIds: string[];
	};
	evaluationWorkflow: INodeParameterResourceLocator;
	metrics: string[];
}

type FormRefs = {
	nameInput: ComponentPublicInstance<typeof N8nInput>;
	tagsInput: ComponentPublicInstance<typeof AnnotationTagsDropdownEe>;
};

export function useTestDefinitionForm() {
	// Stores
	const evaluationsStore = useTestDefinitionStore();

	// Form state
	const state = ref<IEvaluationFormState>({
		description: '',
		name: {
			value: `My Test [${new Date().toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })}]`,
			isEditing: false,
			tempValue: '',
		},
		tags: {
			isEditing: false,
			appliedTagIds: [],
		},
		evaluationWorkflow: {
			mode: 'list',
			value: '',
			__rl: true,
		},
		metrics: [''],
	});

	// Loading states
	const isSaving = ref(false);
	const fieldsIssues = ref<Array<{ field: string; message: string }>>([]);

	// Field refs
	const fields = ref<FormRefs>({} as FormRefs);

	// Methods
	const loadTestData = async (testId: string) => {
		try {
			await evaluationsStore.fetchAll({ force: true });
			const testDefinition = evaluationsStore.testDefinitionsById[testId];

			if (testDefinition) {
				state.value = {
					description: testDefinition.description ?? '',
					name: {
						value: testDefinition.name ?? '',
						isEditing: false,
						tempValue: '',
					},
					tags: {
						isEditing: false,
						appliedTagIds: testDefinition.annotationTagId ? [testDefinition.annotationTagId] : [],
					},
					evaluationWorkflow: {
						mode: 'list',
						value: testDefinition.evaluationWorkflowId ?? '',
						__rl: true,
					},
					metrics: [''],
				};
			}
		} catch (error) {
			// TODO: Throw better errors
			console.error('Failed to load test data', error);
		}
	};

	const createTest = async (workflowId: string) => {
		if (isSaving.value) return;

		isSaving.value = true;
		fieldsIssues.value = [];

		try {
			// Prepare parameters for creating a new test
			const params = {
				name: state.value.name.value,
				workflowId,
				description: state.value.description,
			};

			const newTest = await evaluationsStore.create(params);
			return newTest;
		} catch (error) {
			throw error;
		} finally {
			isSaving.value = false;
		}
	};

	const updateTest = async (testId: string) => {
		if (isSaving.value) return;

		isSaving.value = true;
		fieldsIssues.value = [];

		try {
			// Check if the test ID is provided
			if (!testId) {
				throw new Error('Test ID is required for updating a test');
			}

			// Prepare parameters for updating the existing test
			const params: UpdateTestDefinitionParams = {
				name: state.value.name.value,
				description: state.value.description,
			};
			if (state.value.evaluationWorkflow.value) {
				params.evaluationWorkflowId = state.value.evaluationWorkflow.value.toString();
			}

			const annotationTagId = state.value.tags.appliedTagIds[0];
			if (annotationTagId) {
				params.annotationTagId = annotationTagId;
			}
			// Update the existing test
			return await evaluationsStore.update({ ...params, id: testId });
		} catch (error) {
			throw error;
		} finally {
			isSaving.value = false;
		}
	};

	const startEditing = async (field: string) => {
		if (field === 'name') {
			state.value.name.tempValue = state.value.name.value;
			state.value.name.isEditing = true;
		} else {
			state.value.tags.isEditing = true;
		}
	};

	const saveChanges = (field: string) => {
		if (field === 'name') {
			state.value.name.value = state.value.name.tempValue;
			state.value.name.isEditing = false;
		} else {
			state.value.tags.isEditing = false;
		}
	};

	const cancelEditing = (field: string) => {
		if (field === 'name') {
			state.value.name.isEditing = false;
			state.value.name.tempValue = '';
		} else {
			state.value.tags.isEditing = false;
		}
	};

	const handleKeydown = (event: KeyboardEvent, field: string) => {
		if (event.key === 'Escape') {
			cancelEditing(field);
		} else if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveChanges(field);
		}
	};

	return {
		state,
		fields,
		isSaving: computed(() => isSaving.value),
		fieldsIssues: computed(() => fieldsIssues.value),
		loadTestData,
		createTest,
		updateTest,
		startEditing,
		saveChanges,
		cancelEditing,
		handleKeydown,
	};
}
