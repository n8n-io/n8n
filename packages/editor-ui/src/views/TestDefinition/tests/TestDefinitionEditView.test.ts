import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import TestDefinitionEditView from '@/views/TestDefinition/TestDefinitionEditView.vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useTestDefinitionForm } from '@/components/TestDefinition/composables/useTestDefinitionForm';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { ref, nextTick } from 'vue';

vi.mock('vue-router');
vi.mock('@/composables/useToast');
vi.mock('@/components/TestDefinition/composables/useTestDefinitionForm');
vi.mock('@/stores/tags.store');
vi.mock('@/stores/projects.store');

describe('TestDefinitionEditView', () => {
	const renderComponent = createComponentRenderer(TestDefinitionEditView);

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
		vi.mocked(useTestDefinitionForm).mockReturnValue({
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
		} as unknown as ReturnType<typeof useTestDefinitionForm>);
		vi.mocked(useAnnotationTagsStore).mockReturnValue({
			isLoading: ref(false),
			allTags: ref([]),
			tagsById: ref({}),
			fetchAll: vi.fn(),
		} as unknown as ReturnType<typeof useAnnotationTagsStore>);

		vi.mock('@/stores/projects.store', () => ({
			useProjectsStore: vi.fn().mockReturnValue({
				isTeamProjectFeatureEnabled: false,
				currentProject: null,
				currentProjectId: null,
			}),
		}));
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
		vi.mocked(useTestDefinitionForm).mockReturnValue({
			...vi.mocked(useTestDefinitionForm)(),
			loadTestData: loadTestDataMock,
		} as unknown as ReturnType<typeof useTestDefinitionForm>);

		renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();
		expect(loadTestDataMock).toHaveBeenCalledWith('1');
	});

	it('should not load test data when testId is not provided', async () => {
		const loadTestDataMock = vi.fn();
		vi.mocked(useTestDefinitionForm).mockReturnValue({
			...vi.mocked(useTestDefinitionForm)(),
			loadTestData: loadTestDataMock,
		} as unknown as ReturnType<typeof useTestDefinitionForm>);

		renderComponent({
			pinia: createTestingPinia(),
		});

		await nextTick();
		expect(loadTestDataMock).not.toHaveBeenCalled();
	});

	it('should save test and show success message on successful save', async () => {
		const saveTestMock = vi.fn().mockResolvedValue({});
		const routerPushMock = vi.fn();
		const routerResolveMock = vi.fn().mockReturnValue({ href: '/test-href' });
		vi.mocked(useTestDefinitionForm).mockReturnValue({
			...vi.mocked(useTestDefinitionForm)(),
			createTest: saveTestMock,
		} as unknown as ReturnType<typeof useTestDefinitionForm>);

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
	});

	it('should show error message on failed save', async () => {
		const saveTestMock = vi.fn().mockRejectedValue(new Error('Save failed'));
		const showErrorMock = vi.fn();
		vi.mocked(useTestDefinitionForm).mockReturnValue({
			...vi.mocked(useTestDefinitionForm)(),
			createTest: saveTestMock,
		} as unknown as ReturnType<typeof useTestDefinitionForm>);
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
		vi.mocked(useTestDefinitionForm).mockReturnValue({
			...vi.mocked(useTestDefinitionForm)(),
			fieldsIssues: ref([{ field: 'name' }, { field: 'tags' }]),
		} as unknown as ReturnType<typeof useTestDefinitionForm>);

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
