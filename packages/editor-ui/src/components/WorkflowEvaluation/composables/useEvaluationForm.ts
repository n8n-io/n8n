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

	// Computed
	// const isEditing = computed(() => !!testId);

	// Field refs
	const fields = ref<FormRefs>({} as FormRefs);

	// Methods
	const loadTestData = async (testId: number) => {
		try {
			await evaluationsStore.fetchAll({ force: true });
			const testDefinition = evaluationsStore.testDefinitionsById[testId];

			if (testDefinition) {
				state.value = {
					description: '',
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
		try {
			if (!state.value.evaluationWorkflow.value) {
				addFieldIssue('evaluationWorkflow', 'Evaluation workflow is required');
			}

			const params = {
				name: state.value.name.value,
				...(state.value.tags.appliedTagIds[0] && {
					annotationTagId: state.value.tags.appliedTagIds[0],
				}),
				...(state.value.evaluationWorkflow.value && {
					evaluationWorkflowId: state.value.evaluationWorkflow.value as string,
				}),
			};

			if (testId) {
				await evaluationsStore.update({
					id: testId,
					...params,
				});
			} else {
				await evaluationsStore.create({
					...params,
					workflowId: state.value.evaluationWorkflow.value as string,
				});
			}
		} catch (e) {
			throw e;
		} finally {
			isSaving.value = false;
		}
	};

	const addFieldIssue = (field: string, message: string) => {
		fieldsIssues.value.push({ field, message });
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
