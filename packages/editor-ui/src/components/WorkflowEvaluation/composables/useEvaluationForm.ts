import { ref, computed } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import { useEvaluationsStore } from '@/stores/evaluations.store.ee';
import type AnnotationTagsDropdownEe from '@/components/AnnotationTagsDropdown.ee.vue';
import type { N8nInput } from 'n8n-design-system';

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

export function useEvaluationForm() {
	// Stores
	const evaluationsStore = useEvaluationsStore();

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
	const loadTestData = async (testId: number) => {
		try {
			await evaluationsStore.fetchAll({ force: true });
			const testDefinition = evaluationsStore.testDefinitionsById[testId];

			if (testDefinition) {
				state.value = {
					description: testDefinition.description ?? '',
					name: {
						value: testDefinition.name,
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

	const saveTest = async (testId?: number) => {
		if (isSaving.value) return;

		isSaving.value = true;
		fieldsIssues.value = [];

		const addFieldIssue = (field: string, message: string) => {
			fieldsIssues.value.push({ field, message });
		};

		try {
			// Validate that an evaluation workflow is selected
			// if (!state.value.evaluationWorkflow.value) {
			// 	addFieldIssue('evaluationWorkflow', 'Evaluation workflow is required');
			// 	throw new Error('Validation failed');
			// }

			// Prepare the base parameters for creating or updating a test
			const params: Record<string, string> = {
				name: state.value.name.value,
				description: state.value.description,
			};

			// Add annotation tag ID only for PATH requests
			// TODO: Allow annotationTagId on POST?
			const annotationTagId = state.value.tags.appliedTagIds[0];
			if (testId && annotationTagId) {
				params.annotationTagId = annotationTagId;
			}

			// Add evaluation workflow ID
			if (state.value.evaluationWorkflow.value) {
				params.evaluationWorkflowId = state.value.evaluationWorkflow.value as string;
			}

			if (testId) {
				// Update existing test
				return await evaluationsStore.update({
					id: testId,
					...params,
				});
			}

			// Create new test
			const newTest = await evaluationsStore.create({
				...params,
				name: state.value.name.value,
				workflowId: state.value.evaluationWorkflow.value as string,
			});

			isSaving.value = false;
			return newTest;
		} catch (error) {
			// Re-throw the error to be handled by the caller
			// Reset saving state regardless of success or failure
			isSaving.value = false;
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
		saveTest,
		startEditing,
		saveChanges,
		cancelEditing,
		handleKeydown,
	};
}
