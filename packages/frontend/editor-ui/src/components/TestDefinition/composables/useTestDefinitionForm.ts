import { ref, computed } from 'vue';
import type { ComponentPublicInstance, ComputedRef } from 'vue';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import type AnnotationTagsDropdownEe from '@/components/AnnotationTagsDropdown.ee.vue';
import type { N8nInput } from '@n8n/design-system';
import type { UpdateTestDefinitionParams } from '@/api/testDefinition.ee';
import type { EditableField, EditableFormState, EvaluationFormState } from '../types';

type FormRefs = {
	nameInput: ComponentPublicInstance<typeof N8nInput>;
	tagsInput: ComponentPublicInstance<typeof AnnotationTagsDropdownEe>;
};

export function useTestDefinitionForm() {
	const evaluationsStore = useTestDefinitionStore();

	// State initialization
	const state = ref<EvaluationFormState>({
		name: {
			value: `My Test ${evaluationsStore.allTestDefinitions.length + 1}`,
			tempValue: '',
			isEditing: false,
		},
		tags: {
			value: [],
			tempValue: [],
			isEditing: false,
		},
		description: {
			value: '',
			tempValue: '',
			isEditing: false,
		},
		evaluationWorkflow: {
			mode: 'list',
			value: '',
			__rl: true,
		},
		metrics: [],
		mockedNodes: [],
	});

	const isSaving = ref(false);
	const fields = ref<FormRefs>({} as FormRefs);

	const editableFields: ComputedRef<{
		name: EditableField<string>;
		tags: EditableField<string[]>;
		description: EditableField<string>;
	}> = computed(() => ({
		name: state.value.name,
		tags: state.value.tags,
		description: state.value.description,
	}));

	/**
	 * Load test data including metrics.
	 */
	const loadTestData = async (testId: string, workflowId: string) => {
		try {
			await evaluationsStore.fetchAll({ force: true, workflowId });
			const testDefinition = evaluationsStore.testDefinitionsById[testId];

			if (testDefinition) {
				const metrics = await evaluationsStore.fetchMetrics(testId);

				state.value.description = {
					value: testDefinition.description ?? '',
					isEditing: false,
					tempValue: '',
				};
				state.value.name = {
					value: testDefinition.name ?? '',
					isEditing: false,
					tempValue: '',
				};
				state.value.tags = {
					isEditing: false,
					value: testDefinition.annotationTagId ? [testDefinition.annotationTagId] : [],
					tempValue: [],
				};
				state.value.evaluationWorkflow = {
					mode: 'list',
					value: testDefinition.evaluationWorkflowId ?? '',
					__rl: true,
				};
				state.value.metrics = metrics;
				state.value.mockedNodes = testDefinition.mockedNodes ?? [];
				evaluationsStore.updateRunFieldIssues(testDefinition.id);
			}
		} catch (error) {
			console.error('Failed to load test data', error);
		}
	};

	const createTest = async (workflowId: string) => {
		if (isSaving.value) return;

		isSaving.value = true;

		try {
			const params = {
				name: state.value.name.value,
				workflowId,
				description: state.value.description.value,
			};
			return await evaluationsStore.create(params);
		} finally {
			isSaving.value = false;
		}
	};

	const deleteMetric = async (metricId: string, testId: string) => {
		await evaluationsStore.deleteMetric({ id: metricId, testDefinitionId: testId });
		state.value.metrics = state.value.metrics.filter((metric) => metric.id !== metricId);
	};

	/**
	 * This method would perform unnecessary updates on the BE
	 * it's a performance degradation candidate if metrics reach certain amount
	 */
	const updateMetrics = async (testId: string) => {
		const promises = state.value.metrics.map(async (metric) => {
			if (!metric.name) return;
			if (!metric.id) {
				const createdMetric = await evaluationsStore.createMetric({
					name: metric.name,
					testDefinitionId: testId,
				});
				metric.id = createdMetric.id;
			} else {
				await evaluationsStore.updateMetric({
					name: metric.name,
					id: metric.id,
					testDefinitionId: testId,
				});
			}
		});
		isSaving.value = true;
		await Promise.all(promises);
		isSaving.value = false;
	};

	const updateTest = async (testId: string) => {
		if (isSaving.value) return;

		isSaving.value = true;

		try {
			if (!testId) {
				throw new Error('Test ID is required for updating a test');
			}

			const params: UpdateTestDefinitionParams = {
				name: state.value.name.value,
				description: state.value.description.value,
			};

			if (state.value.evaluationWorkflow.value) {
				params.evaluationWorkflowId = state.value.evaluationWorkflow.value.toString();
			}

			const annotationTagId = state.value.tags.value[0];
			if (annotationTagId) {
				params.annotationTagId = annotationTagId;
			}
			params.mockedNodes = state.value.mockedNodes;

			const response = await evaluationsStore.update({ ...params, id: testId });
			return response;
		} finally {
			isSaving.value = false;
		}
	};

	/**
	 * Start editing an editable field by copying `value` to `tempValue`.
	 */
	function startEditing<T extends keyof EditableFormState>(field: T) {
		const fieldObj = editableFields.value[field];
		if (fieldObj.isEditing) {
			// Already editing, do nothing
			return;
		}

		if (Array.isArray(fieldObj.value)) {
			fieldObj.tempValue = [...fieldObj.value];
		} else {
			fieldObj.tempValue = fieldObj.value;
		}
		fieldObj.isEditing = true;
	}
	/**
	 * Save changes by copying `tempValue` back into `value`.
	 */
	function saveChanges<T extends keyof EditableFormState>(field: T) {
		const fieldObj = editableFields.value[field];
		fieldObj.value = Array.isArray(fieldObj.tempValue)
			? [...fieldObj.tempValue]
			: fieldObj.tempValue;
		fieldObj.isEditing = false;
	}

	/**
	 * Cancel editing and revert `tempValue` from `value`.
	 */
	function cancelEditing<T extends keyof EditableFormState>(field: T) {
		const fieldObj = editableFields.value[field];
		if (Array.isArray(fieldObj.value)) {
			fieldObj.tempValue = [...fieldObj.value];
		} else {
			fieldObj.tempValue = fieldObj.value;
		}
		fieldObj.isEditing = false;
	}

	/**
	 * Handle keyboard events during editing.
	 */
	function handleKeydown<T extends keyof EditableFormState>(event: KeyboardEvent, field: T) {
		if (event.key === 'Escape') {
			cancelEditing(field);
		} else if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveChanges(field);
		}
	}

	return {
		state,
		fields,
		isSaving: computed(() => isSaving.value),
		deleteMetric,
		updateMetrics,
		loadTestData,
		createTest,
		updateTest,
		startEditing,
		saveChanges,
		cancelEditing,
		handleKeydown,
	};
}
