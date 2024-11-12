import { ref, computed } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { INodeParameterResourceLocator } from 'n8n-workflow';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { useEvaluationsStore } from '@/stores/evaluations.store.ee';
import type AnnotationTagsDropdownEe from '@/components/AnnotationTagsDropdown.ee.vue';
import type { N8nInput } from 'n8n-design-system';
import { VIEWS } from '@/constants';

interface EditableField {
	value: string;
	isEditing: boolean;
	tempValue: string;
}

export interface IEvaluationFormState {
	name: EditableField;
	description?: string;
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

export function useEvaluationForm(testId?: number) {
	// Stores
	const tagsStore = useAnnotationTagsStore();
	const evaluationsStore = useEvaluationsStore();

	// Form state
	const state = ref<IEvaluationFormState>({
		description: '',
		name: {
			value: 'My Test',
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
	const isLoading = computed(() => tagsStore.isLoading);

	// Computed
	const isEditing = computed(() => !!testId);
	const allTags = computed(() => tagsStore.allTags);
	const tagsById = computed(() => tagsStore.tagsById);

	// Field refs
	const fields = ref<FormRefs>({} as FormRefs);

	// Methods
	const loadTestData = async () => {
		if (!testId) return;

		try {
			await evaluationsStore.fetchAll();
			const testDefinition = evaluationsStore.testDefinitionsById[testId];

			if (testDefinition) {
				state.value = {
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
						value: testDefinition.evaluationWorkflowId || '',
						__rl: true,
					},
					metrics: [''],
				};
			}
		} catch (error) {
			console.error('Failed to load test data', error);
		}
	};

	const saveTest = async () => {
		console.log('Saving Test');
		if (isSaving.value) return;

		isSaving.value = true;
		try {
			const params = {
				name: state.value.name.value,
				...(state.value.tags.appliedTagIds[0] && {
					annotationTagId: state.value.tags.appliedTagIds[0],
				}),
				...(state.value.evaluationWorkflow.value && {
					evaluationWorkflowId: state.value.evaluationWorkflow.value as string,
				}),
			};
			console.log('Saving Test with params', params, 'isEditing', isEditing.value);

			if (isEditing.value && testId) {
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
			console.error(e);
			throw e;
		} finally {
			isSaving.value = false;
		}
	};

	const startEditing = async (field: 'name' | 'tags') => {
		if (field === 'name') {
			state.value.name.tempValue = state.value.name.value;
			state.value.name.isEditing = true;
		} else {
			state.value.tags.isEditing = true;
		}
	};

	const saveChanges = (field: 'name' | 'tags') => {
		if (field === 'name') {
			state.value.name.value = state.value.name.tempValue;
			state.value.name.isEditing = false;
		} else {
			state.value.tags.isEditing = false;
		}
	};

	const cancelEditing = (field: 'name' | 'tags') => {
		if (field === 'name') {
			state.value.name.isEditing = false;
		} else {
			state.value.tags.isEditing = false;
		}
	};

	const handleKeydown = (event: KeyboardEvent, field: 'name' | 'tags') => {
		if (event.key === 'Escape') {
			cancelEditing(field);
		} else if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveChanges(field);
		}
	};

	const updateMetrics = (metrics: string[]) => {
		state.value.metrics = metrics;
	};

	const onTagUpdate = (tags: string[]) => {
		state.value.tags.appliedTagIds = tags[0] ? [tags[0]] : [];
	};

	const onWorkflowUpdate = (value: INodeParameterResourceLocator) => {
		state.value.evaluationWorkflow = value;
	};

	// Initialize
	const init = async () => {
		await tagsStore.fetchAll();
		if (testId) {
			await loadTestData();
		}
	};

	return {
		state,
		fields,
		isEditing,
		isLoading,
		isSaving,
		allTags,
		tagsById,
		init,
		saveTest,
		startEditing,
		saveChanges,
		cancelEditing,
		handleKeydown,
		updateMetrics,
		onTagUpdate,
		onWorkflowUpdate,
	};
}
