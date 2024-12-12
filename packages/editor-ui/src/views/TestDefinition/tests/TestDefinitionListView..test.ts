import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import TestDefinitionListView from '@/views/TestDefinition/TestDefinitionListView.vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { nextTick } from 'vue';
import { mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/constants';

vi.mock('vue-router');
vi.mock('@/composables/useToast');

describe('TestDefinitionListView', () => {
	const renderComponent = createComponentRenderer(TestDefinitionListView);

	let showMessageMock: Mock;
	let showErrorMock: Mock;
	let startTestRunMock: Mock;
	let fetchTestRunsMock: Mock;
	let deleteByIdMock: Mock;

	beforeEach(() => {
		setActivePinia(createPinia());

		vi.mocked(useRoute).mockReturnValue({
			params: {},
			name: VIEWS.TEST_DEFINITION,
		} as ReturnType<typeof useRoute>);

		vi.mocked(useRouter).mockReturnValue({
			push: vi.fn(),
			currentRoute: { value: { params: {} } },
		} as unknown as ReturnType<typeof useRouter>);

		showMessageMock = vi.fn();
		showErrorMock = vi.fn();
		startTestRunMock = vi.fn().mockResolvedValue({ success: true });
		fetchTestRunsMock = vi.fn();
		deleteByIdMock = vi.fn();

		vi.mocked(useToast).mockReturnValue({
			showMessage: showMessageMock,
			showError: showErrorMock,
		} as unknown as ReturnType<typeof useToast>);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render empty state when no tests exist', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		mockedStore(useTestDefinitionStore).allTestDefinitions = [];
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();

		expect(getByTestId('test-definition-empty-state')).toBeTruthy();
	});

	it('should render tests list when tests exist', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		mockedStore(useTestDefinitionStore).allTestDefinitions = [
			{
				id: '1',
				name: 'Test 1',
				workflowId: '1',
			},
			{
				id: '2',
				name: 'Test 2',
				workflowId: '1',
			},
		];
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);
		mockedStore(useTestDefinitionStore).fetchAll.mockResolvedValue({
			count: 2,
			testDefinitions: [
				{
					id: '1',
					name: 'Test 1',
					workflowId: '1',
				},
				{
					id: '2',
					name: 'Test 2',
					workflowId: '1',
				},
			],
		});

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();

		expect(getByTestId('test-definition-list')).toBeTruthy();
	});

	it('should start test run and show success message', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		mockedStore(useTestDefinitionStore).startTestRun = startTestRunMock;
		mockedStore(useTestDefinitionStore).fetchTestRuns = fetchTestRunsMock;
		mockedStore(useTestDefinitionStore).allTestDefinitions = [
			{
				id: '1',
				name: 'Test 1',
				workflowId: '1',
			},
		];
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();

		const runButton = getByTestId('run-test-button-1');
		runButton.click();
		await nextTick();

		expect(startTestRunMock).toHaveBeenCalledWith('1');
		expect(fetchTestRunsMock).toHaveBeenCalledWith('1');
		expect(showMessageMock).toHaveBeenCalledWith({
			title: expect.any(String),
			type: 'success',
		});
	});

	it('should show error message on failed test run', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		startTestRunMock.mockRejectedValue(new Error('Run failed'));
		mockedStore(useTestDefinitionStore).startTestRun = startTestRunMock;
		mockedStore(useTestDefinitionStore).allTestDefinitions = [
			{
				id: '1',
				name: 'Test 1',
				workflowId: '1',
			},
		];
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();

		const runButton = getByTestId('run-test-button-1');
		runButton.click();
		await nextTick();

		expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});

	it('should delete test and show success message', async () => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		mockedStore(useTestDefinitionStore).deleteById = deleteByIdMock;
		mockedStore(useTestDefinitionStore).allTestDefinitions = [
			{
				id: '1',
				name: 'Test 1',
				workflowId: '1',
			},
		];
		mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

		const { getByTestId } = renderComponent({ pinia });
		await nextTick();

		const deleteButton = getByTestId('delete-test-button-1');
		deleteButton.click();
		await nextTick();

		expect(deleteByIdMock).toHaveBeenCalledWith('1');
		expect(showMessageMock).toHaveBeenCalledWith({
			title: expect.any(String),
			type: 'success',
		});
	});

	// it('should navigate to edit view when edit button is clicked', async () => {
	//   const pinia = createTestingPinia();
	//   setActivePinia(pinia);
	//   const router = useRouter();

	//   mockedStore(useTestDefinitionStore).allTestDefinitions = [{ id: '1', name: 'Test 1' }];
	//   mockedStore(useAnnotationTagsStore).fetchAll.mockResolvedValue([]);

	//   const { getByTestId } = renderComponent({ pinia });
	//   await nextTick();

	//   const editButton = getByTestId('edit-test-button-1');
	//   editButton.click();
	//   await nextTick();

	//   expect(router.push).toHaveBeenCalledWith({
	//     name: VIEWS.TEST_DEFINITION_EDIT,
	//     params: { testId: '1' },
	//   });
	// });
});
