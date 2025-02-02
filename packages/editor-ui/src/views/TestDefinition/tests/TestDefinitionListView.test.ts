import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import TestDefinitionListView from '@/views/TestDefinition/TestDefinitionListView.vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useMessage } from '@/composables/useMessage';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { nextTick, ref } from 'vue';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import type { TestDefinitionRecord } from '@/api/testDefinition.ee';

vi.mock('vue-router');
vi.mock('@/composables/useToast');
vi.mock('@/composables/useMessage');
describe('TestDefinitionListView', () => {
	const renderComponent = createComponentRenderer(TestDefinitionListView);

	let showMessageMock: Mock;
	let showErrorMock: Mock;
	let confirmMock: Mock;
	let startTestRunMock: Mock;
	let fetchTestRunsMock: Mock;
	let deleteByIdMock: Mock;
	let fetchAllMock: Mock;

	const mockTestDefinitions: TestDefinitionRecord[] = [
		{
			id: '1',
			name: 'Test 1',
			workflowId: 'workflow1',
			updatedAt: '2023-01-01T00:00:00.000Z',
			annotationTagId: 'tag1',
		},
		{
			id: '2',
			name: 'Test 2',
			workflowId: 'workflow1',
			updatedAt: '2023-01-02T00:00:00.000Z',
		},
		{
			id: '3',
			name: 'Test 3',
			workflowId: 'workflow1',
			updatedAt: '2023-01-03T00:00:00.000Z',
		},
	];

	beforeEach(() => {
		setActivePinia(createPinia());

		vi.mocked(useRoute).mockReturnValue(
			ref({
				params: { name: 'workflow1' },
				name: VIEWS.TEST_DEFINITION,
			}) as unknown as ReturnType<typeof useRoute>,
		);

		vi.mocked(useRouter).mockReturnValue({
			push: vi.fn(),
			currentRoute: { value: { params: { name: 'workflow1' } } },
		} as unknown as ReturnType<typeof useRouter>);

		showMessageMock = vi.fn();
		showErrorMock = vi.fn();
		confirmMock = vi.fn().mockResolvedValue(MODAL_CONFIRM);
		startTestRunMock = vi.fn().mockResolvedValue({ success: true });
		fetchTestRunsMock = vi.fn();
		deleteByIdMock = vi.fn();
		fetchAllMock = vi.fn().mockResolvedValue({ testDefinitions: mockTestDefinitions });

		vi.mocked(useToast).mockReturnValue({
			showMessage: showMessageMock,
			showError: showErrorMock,
		} as unknown as ReturnType<typeof useToast>);

		vi.mocked(useMessage).mockReturnValue({
			confirm: confirmMock,
		} as unknown as ReturnType<typeof useMessage>);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const renderComponentWithFeatureEnabled = async (
		{ testDefinitions }: { testDefinitions: TestDefinitionRecord[] } = {
			testDefinitions: mockTestDefinitions,
		},
	) => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.isFeatureEnabled = true;
		testDefinitionStore.fetchAll = fetchAllMock;
		testDefinitionStore.startTestRun = startTestRunMock;
		testDefinitionStore.fetchTestRuns = fetchTestRunsMock;
		testDefinitionStore.deleteById = deleteByIdMock;
		testDefinitionStore.allTestDefinitionsByWorkflowId = { workflow1: testDefinitions };

		const component = renderComponent({ pinia });
		await waitAllPromises();
		return { ...component, testDefinitionStore };
	};

	it('should render empty state when no tests exist', async () => {
		const { getByTestId } = await renderComponentWithFeatureEnabled({ testDefinitions: [] });

		expect(getByTestId('test-definition-empty-state')).toBeTruthy();
	});

	it('should render tests list when tests exist', async () => {
		const { getByTestId } = await renderComponentWithFeatureEnabled();

		expect(getByTestId('test-definition-list')).toBeTruthy();
	});

	it('should load initial data on mount', async () => {
		const { testDefinitionStore } = await renderComponentWithFeatureEnabled();

		expect(testDefinitionStore.fetchAll).toHaveBeenCalledWith({
			workflowId: 'workflow1',
		});
	});

	it('should start test run and show success message', async () => {
		const { getByTestId } = await renderComponentWithFeatureEnabled();

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
		const { getByTestId, testDefinitionStore } = await renderComponentWithFeatureEnabled();
		testDefinitionStore.startTestRun = vi.fn().mockRejectedValue(new Error('Run failed'));

		const runButton = getByTestId('run-test-button-1');
		runButton.click();
		await nextTick();

		expect(showErrorMock).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});

	it('should delete test and show success message', async () => {
		const { getByTestId } = await renderComponentWithFeatureEnabled();
		const deleteButton = getByTestId('delete-test-button-1');
		deleteButton.click();
		await waitAllPromises();

		expect(deleteByIdMock).toHaveBeenCalledWith('1');
		expect(showMessageMock).toHaveBeenCalledWith({
			title: expect.any(String),
			type: 'success',
		});
	});

	it('should sort tests by updated date in descending order', async () => {
		const { container } = await renderComponentWithFeatureEnabled();

		const testItems = container.querySelectorAll('[data-test-id^="test-item-"]');
		expect(testItems[0].getAttribute('data-test-id')).toBe('test-item-3');
		expect(testItems[1].getAttribute('data-test-id')).toBe('test-item-2');
		expect(testItems[2].getAttribute('data-test-id')).toBe('test-item-1');
	});
});
