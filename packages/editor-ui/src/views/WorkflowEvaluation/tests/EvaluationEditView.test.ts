import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import EvaluationEditView from '@/views/WorkflowEvaluation/EvaluationEditView.vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useEvaluationForm } from '@/components/WorkflowEvaluation/composables/useEvaluationForm';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { ref, nextTick } from 'vue';
import { VIEWS } from '@/constants';

vi.mock('vue-router');
vi.mock('@/composables/useToast');
vi.mock('@/components/WorkflowEvaluation/composables/useEvaluationForm');
vi.mock('@/stores/tags.store');

describe('EvaluationEditView', () => {
	const renderComponent = createComponentRenderer(EvaluationEditView);

	beforeEach(() => {
		setActivePinia(createPinia());

		vi.mocked(useRoute).mockReturnValue({
			params: {},
			path: '/test-path',
			name: 'test-route',
		} as ReturnType<typeof useRoute>);

		vi.mocked(useRouter).mockReturnValue({
			push: vi.fn(),
			resolve: vi.fn().mockReturnValue({ href: '/test-href' }),
		} as unknown as ReturnType<typeof useRouter>);

		vi.mocked(useToast).mockReturnValue({
			showMessage: vi.fn(),
			showError: vi.fn(),
		} as unknown as ReturnType<typeof useToast>);
		vi.mocked(useEvaluationForm).mockReturnValue({
			state: ref({
				name: { value: '', isEditing: false, tempValue: '' },
				description: '',
				tags: { appliedTagIds: [], isEditing: false },
				evaluationWorkflow: { id: '1', name: 'Test Workflow' },
				metrics: [],
			}),
			fieldsIssues: ref([]),
			isSaving: ref(false),
			loadTestData: vi.fn(),
			saveTest: vi.fn(),
			startEditing: vi.fn(),
			saveChanges: vi.fn(),
			cancelEditing: vi.fn(),
			handleKeydown: vi.fn(),
		} as unknown as ReturnType<typeof useEvaluationForm>);
		vi.mocked(useAnnotationTagsStore).mockReturnValue({
			isLoading: ref(false),
			allTags: ref([]),
			tagsById: ref({}),
			fetchAll: vi.fn(),
		} as unknown as ReturnType<typeof useAnnotationTagsStore>);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should load test data when testId is provided', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: { testId: '1' },
			path: '/test-path',
			name: 'test-route',
		} as unknown as ReturnType<typeof useRoute>);
		const loadTestDataMock = vi.fn();
		vi.mocked(useEvaluationForm).mockReturnValue({
			...vi.mocked(useEvaluationForm)(),
			loadTestData: loadTestDataMock,
		} as unknown as ReturnType<typeof useEvaluationForm>);

		renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();
		expect(loadTestDataMock).toHaveBeenCalledWith('1');
	});

	it('should not load test data when testId is not provided', async () => {
		const loadTestDataMock = vi.fn();
		vi.mocked(useEvaluationForm).mockReturnValue({
			...vi.mocked(useEvaluationForm)(),
			loadTestData: loadTestDataMock,
		} as unknown as ReturnType<typeof useEvaluationForm>);

		renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();
		expect(loadTestDataMock).not.toHaveBeenCalled();
	});

	it('should save test and show success message on successful save', async () => {
		const saveTestMock = vi.fn().mockResolvedValue({});
		const showMessageMock = vi.fn();
		const routerPushMock = vi.fn();
		const routerResolveMock = vi.fn().mockReturnValue({ href: '/test-href' });
		vi.mocked(useEvaluationForm).mockReturnValue({
			...vi.mocked(useEvaluationForm)(),
			saveTest: saveTestMock,
		} as unknown as ReturnType<typeof useEvaluationForm>);
		vi.mocked(useToast).mockReturnValue({ showMessage: showMessageMock } as unknown as ReturnType<
			typeof useToast
		>);
		vi.mocked(useRouter).mockReturnValue({
			push: routerPushMock,
			resolve: routerResolveMock,
		} as unknown as ReturnType<typeof useRouter>);

		const { getByTestId } = renderComponent({
			pinia: createTestingPinia(),
		});
		await nextTick();
		const saveButton = getByTestId('run-test-button');
		saveButton.click();
		await nextTick();

		expect(saveTestMock).toHaveBeenCalled();
		expect(showMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		expect(routerPushMock).toHaveBeenCalledWith({ name: VIEWS.WORKFLOW_EVALUATION });
	});

	it('should show error message on failed save', async () => {
		const saveTestMock = vi.fn().mockRejectedValue(new Error('Save failed'));
		const showErrorMock = vi.fn();
		vi.mocked(useEvaluationForm).mockReturnValue({
			...vi.mocked(useEvaluationForm)(),
			saveTest: saveTestMock,
		} as unknown as ReturnType<typeof useEvaluationForm>);
		vi.mocked(useToast).mockReturnValue({ showError: showErrorMock } as unknown as ReturnType<
			typeof useToast
		>);

		const { getByTestId } = renderComponent({
			pinia: createTestingPinia(),
		});
		await nextTick();
		const saveButton = getByTestId('run-test-button');
		saveButton.click();
		await nextTick();
		expect(saveTestMock).toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalled();
	});

	it('should display "Update Test" button when editing existing test', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: { testId: '1' },
			path: '/test-path',
			name: 'test-route',
		} as unknown as ReturnType<typeof useRoute>);
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia(),
		});
		await nextTick();
		const updateButton = getByTestId('run-test-button');
		expect(updateButton.textContent).toContain('Update test');
	});

	it('should display "Run Test" button when creating new test', async () => {
		const { getByTestId } = renderComponent({
			pinia: createTestingPinia(),
		});
		await nextTick();
		const saveButton = getByTestId('run-test-button');
		expect(saveButton).toBeTruthy();
	});

	it('should apply "has-issues" class to inputs with issues', async () => {
		vi.mocked(useEvaluationForm).mockReturnValue({
			...vi.mocked(useEvaluationForm)(),
			fieldsIssues: ref([{ field: 'name' }, { field: 'tags' }]),
		} as unknown as ReturnType<typeof useEvaluationForm>);

		const { container } = renderComponent({
			pinia: createTestingPinia(),
		});
		await nextTick();
		expect(container.querySelector('.has-issues')).toBeTruthy();
	});

	it('should fetch all tags on mount', async () => {
		const fetchAllMock = vi.fn();
		vi.mocked(useAnnotationTagsStore).mockReturnValue({
			...vi.mocked(useAnnotationTagsStore)(),
			fetchAll: fetchAllMock,
		} as unknown as ReturnType<typeof useAnnotationTagsStore>);

		renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();
		expect(fetchAllMock).toHaveBeenCalled();
	});
});
