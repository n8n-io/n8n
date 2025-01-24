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
import { cleanupAppModals, createAppModals, mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/constants';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import type { TestRunRecord } from '@/api/testDefinition.ee';

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

	const renderComponentWithFeatureEnabled = ({
		testRunsById = {},
	}: { testRunsById?: Record<string, TestRunRecord> } = {}) => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const mockedTestDefinitionStore = mockedStore(useTestDefinitionStore);
		mockedTestDefinitionStore.isFeatureEnabled = true;
		mockedTestDefinitionStore.testRunsById = testRunsById;
		return { ...renderComponent({ pinia }), mockedTestDefinitionStore };
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		createAppModals();

		// Default route mock: no testId
		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as ReturnType<typeof useRoute>);

		vi.mocked(useRouter).mockReturnValue({
			push: vi.fn(),
			replace: vi.fn(),
			resolve: vi.fn().mockReturnValue({ href: '/test-href' }),
			currentRoute: { value: { params: {} } },
		} as unknown as ReturnType<typeof useRouter>);

		createTestMock = vi.fn().mockResolvedValue({ id: 'newTestId' });
		updateTestMock = vi.fn().mockResolvedValue({});
		loadTestDataMock = vi.fn();
		deleteMetricMock = vi.fn();
		updateMetricsMock = vi.fn();
		showMessageMock = vi.fn();
		showErrorMock = vi.fn();
		// const mockedTestDefinitionStore = mockedStore(useTestDefinitionStore);

		vi.mocked(useToast).mockReturnValue({
			showMessage: showMessageMock,
			showError: showErrorMock,
		} as unknown as ReturnType<typeof useToast>);
		vi.mocked(useTestDefinitionForm).mockReturnValue({
			state: ref({
				name: { value: '', isEditing: false, tempValue: '' },
				description: { value: '', isEditing: false, tempValue: '' },
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
		cleanupAppModals();
	});

	it('should load test data when testId is provided', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: { testId: '1' },
			name: VIEWS.TEST_DEFINITION_EDIT,
		} as unknown as ReturnType<typeof useRoute>);
		renderComponentWithFeatureEnabled();

		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		expect(loadTestDataMock).toHaveBeenCalledWith('1');
	});

	it('should not load test data when testId is not provided', async () => {
		// Here route returns no testId
		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as unknown as ReturnType<typeof useRoute>);
		renderComponentWithFeatureEnabled();

		expect(loadTestDataMock).not.toHaveBeenCalled();
	});

	it('should create a new test and show success message on save if no testId is present', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as ReturnType<typeof useRoute>);
		const { getByTestId } = renderComponentWithFeatureEnabled();

		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		await nextTick();
		const saveButton = getByTestId('run-test-button');
		saveButton.click();
		await nextTick();

		expect(createTestMock).toHaveBeenCalled();
	});

	it('should show error message on failed test creation', async () => {
		createTestMock.mockRejectedValue(new Error('Save failed'));

		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.NEW_TEST_DEFINITION,
		} as unknown as ReturnType<typeof useRoute>);

		const { getByTestId } = renderComponentWithFeatureEnabled();

		const saveButton = getByTestId('run-test-button');
		saveButton.click();
		await nextTick();

		expect(createTestMock).toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});

	it('should display disabled "run test" button when editing test without tags', async () => {
		vi.mocked(useRoute).mockReturnValue({
			params: { testId: '1' },
			name: VIEWS.TEST_DEFINITION_EDIT,
		} as unknown as ReturnType<typeof useRoute>);

		const { getByTestId, mockedTestDefinitionStore } = renderComponentWithFeatureEnabled();

		mockedTestDefinitionStore.getFieldIssues = vi
			.fn()
			.mockReturnValue([{ field: 'tags', message: 'Tag is required' }]);

		await nextTick();

		const updateButton = getByTestId('run-test-button');
		expect(updateButton.textContent?.toLowerCase()).toContain('run test');
		expect(updateButton).toHaveClass('disabled');

		mockedTestDefinitionStore.getFieldIssues = vi.fn().mockReturnValue([]);
		await nextTick();
		expect(updateButton).not.toHaveClass('disabled');
	});

	it('should apply "has-issues" class to inputs with issues', async () => {
		const { container, mockedTestDefinitionStore } = renderComponentWithFeatureEnabled();
		mockedTestDefinitionStore.getFieldIssues = vi
			.fn()
			.mockReturnValue([{ field: 'tags', message: 'Tag is required' }]);
		await nextTick();
		const issueElements = container.querySelectorAll('.has-issues');
		expect(issueElements.length).toBeGreaterThan(0);
	});

	describe('Test Runs functionality', () => {
		it('should display test runs table when runs exist', async () => {
			vi.mocked(useRoute).mockReturnValue({
				params: { testId: '1' },
				name: VIEWS.TEST_DEFINITION_EDIT,
			} as unknown as ReturnType<typeof useRoute>);

			const { getByTestId } = renderComponentWithFeatureEnabled({
				testRunsById: {
					run1: {
						id: 'run1',
						testDefinitionId: '1',
						status: 'completed',
						runAt: '2023-01-01',
						createdAt: '2023-01-01',
						updatedAt: '2023-01-01',
						completedAt: '2023-01-01',
					},
					run2: {
						id: 'run2',
						testDefinitionId: '1',
						status: 'running',
						runAt: '2023-01-02',
						createdAt: '2023-01-02',
						updatedAt: '2023-01-02',
						completedAt: '',
					},
				},
			});

			const runsTable = getByTestId('past-runs-table');
			expect(runsTable).toBeTruthy();
		});

		it('should not display test runs table when no runs exist', async () => {
			const { container } = renderComponentWithFeatureEnabled();

			const runsTable = container.querySelector('[data-test-id="past-runs-table"]');
			expect(runsTable).toBeFalsy();
		});

		it('should start a test run when run test button is clicked', async () => {
			vi.mocked(useTestDefinitionForm).mockReturnValue({
				...vi.mocked(useTestDefinitionForm)(),
				state: ref({
					name: { value: 'Test', isEditing: false, tempValue: '' },
					description: { value: '', isEditing: false, tempValue: '' },
					tags: { value: ['tag1'], tempValue: [], isEditing: false },
					evaluationWorkflow: { mode: 'list', value: 'workflow1', __rl: true },
					metrics: [],
					mockedNodes: [],
				}),
			} as unknown as ReturnType<typeof useTestDefinitionForm>);

			vi.mocked(useRoute).mockReturnValue({
				params: { testId: '1' },
				name: VIEWS.TEST_DEFINITION_EDIT,
			} as unknown as ReturnType<typeof useRoute>);

			const { getByTestId, mockedTestDefinitionStore } = renderComponentWithFeatureEnabled();
			await nextTick();

			const runButton = getByTestId('run-test-button');
			runButton.click();
			await nextTick();

			expect(mockedTestDefinitionStore.startTestRun).toHaveBeenCalledWith('1');
			expect(mockedTestDefinitionStore.fetchTestRuns).toHaveBeenCalledWith('1');
		});
	});
});
