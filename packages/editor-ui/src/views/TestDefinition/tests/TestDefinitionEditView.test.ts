import type { Mock } from 'vitest';
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
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/constants';

vi.mock('vue-router');
vi.mock('@/composables/useToast');
vi.mock('@/components/TestDefinition/composables/useTestDefinitionForm');
vi.mock('@/stores/projects.store');

describe('TestDefinitionEditView', () => {
	const renderComponent = createComponentRenderer(TestDefinitionEditView);

	let createTestMock: Mock;
	let updateTestMock: Mock;
	let loadTestDataMock: Mock;
	let deleteMetricMock: Mock;
	let updateMetricsMock: Mock;
	let showMessageMock: Mock;
	let showErrorMock: Mock;

	beforeEach(() => {
		setActivePinia(createPinia());

		// Default route mock: no testId
		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as ReturnType<typeof useRoute>);

		vi.mocked(useRouter).mockReturnValue({
			push: vi.fn(),
			replace: vi.fn(),
			resolve: vi.fn().mockReturnValue({ href: '/test-href' }),
		} as unknown as ReturnType<typeof useRouter>);

		createTestMock = vi.fn().mockResolvedValue({ id: 'newTestId' });
		updateTestMock = vi.fn().mockResolvedValue({});
		loadTestDataMock = vi.fn();
		deleteMetricMock = vi.fn();
		updateMetricsMock = vi.fn();
		showMessageMock = vi.fn();
		showErrorMock = vi.fn();

		vi.mocked(useToast).mockReturnValue({
			showMessage: showMessageMock,
			showError: showErrorMock,
		} as unknown as ReturnType<typeof useToast>);

		vi.mocked(useTestDefinitionForm).mockReturnValue({
			state: ref({
				name: { value: '', isEditing: false, tempValue: '' },
				description: '',
				tags: { value: [], tempValue: [], isEditing: false },
				evaluationWorkflow: { mode: 'list', value: '', __rl: true },
				metrics: [],
			}),
			fieldsIssues: ref([]),
			isSaving: ref(false),
			loadTestData: loadTestDataMock,
			createTest: createTestMock,
			updateTest: updateTestMock,
			startEditing: vi.fn(),
			saveChanges: vi.fn(),
			cancelEditing: vi.fn(),
			handleKeydown: vi.fn(),
			deleteMetric: deleteMetricMock,
			updateMetrics: updateMetricsMock,
		} as unknown as ReturnType<typeof useTestDefinitionForm>);

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
			name: VIEWS.TEST_DEFINITION_EDIT,
		} as unknown as ReturnType<typeof useRoute>);

		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		renderComponent({ pinia });
		await nextTick();

		expect(loadTestDataMock).toHaveBeenCalledWith('1');
	});

	it('should not load test data when testId is not provided', async () => {
		// Here route returns no testId
		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as unknown as ReturnType<typeof useRoute>);

		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		renderComponent({ pinia });
		await nextTick();

		expect(loadTestDataMock).not.toHaveBeenCalled();
	});

	it('should create a new test and show success message on save if no testId is present', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as ReturnType<typeof useRoute>);

		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();
		const saveButton = getByTestId('run-test-button');
		saveButton.click();
		await nextTick();

		expect(createTestMock).toHaveBeenCalled();
		expect(showMessageMock).toHaveBeenCalledWith({
			title: expect.any(String),
			type: 'success',
		});
	});

	it('should update test and show success message on save if testId is present', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: { testId: '1' },
			name: VIEWS.TEST_DEFINITION_EDIT,
		} as unknown as ReturnType<typeof useRoute>);

		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();
		const saveButton = getByTestId('run-test-button');
		saveButton.click();
		await nextTick();

		expect(updateTestMock).toHaveBeenCalledWith('1');
		expect(showMessageMock).toHaveBeenCalledWith({
			title: expect.any(String),
			type: 'success',
		});
	});

	it('should show error message on failed test creation', async () => {
		createTestMock.mockRejectedValue(new Error('Save failed'));

		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as unknown as ReturnType<typeof useRoute>);

		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();
		const saveButton = getByTestId('run-test-button');
		saveButton.click();
		await nextTick();

		expect(createTestMock).toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});

	it('should display "Update Test" button when editing existing test', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: { testId: '1' },
			name: VIEWS.TEST_DEFINITION_EDIT,
		} as unknown as ReturnType<typeof useRoute>);

		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();
		const updateButton = getByTestId('run-test-button');
		expect(updateButton.textContent?.toLowerCase()).toContain('update');
	});

	it('should display "Save Test" button when creating new test', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as unknown as ReturnType<typeof useRoute>);

		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();
		const saveButton = getByTestId('run-test-button');
		expect(saveButton.textContent?.toLowerCase()).toContain('run test');
	});

	it('should apply "has-issues" class to inputs with issues', async () => {
		vi.mocked(useTestDefinitionForm).mockReturnValue({
			...vi.mocked(useTestDefinitionForm)(),
			fieldsIssues: ref([
				{ field: 'name', message: 'Name is required' },
				{ field: 'tags', message: 'Tag is required' },
			]),
		} as unknown as ReturnType<typeof useTestDefinitionForm>);

		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { container } = renderComponent({ pinia });
		await nextTick();
		const issueElements = container.querySelectorAll('.has-issues');
		expect(issueElements.length).toBeGreaterThan(0);
	});

	it('should fetch all tags on mount', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		renderComponent({ pinia });
		await nextTick();
		expect(mockedStore(useAnnotationTagsStore).fetchAll).toHaveBeenCalled();
	});
});
