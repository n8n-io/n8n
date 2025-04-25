import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import TestDefinitionListView from '@/views/Evaluations/TestDefinitionListView.vue';
import type { useToast } from '@/composables/useToast';
import type { useMessage } from '@/composables/useMessage';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { mockedStore } from '@/__tests__/utils';
import { MODAL_CONFIRM } from '@/constants';
import type { TestDefinitionRecord } from '@/api/testDefinition.ee';
import userEvent from '@testing-library/user-event';
import { within, waitFor } from '@testing-library/dom';

const renderComponent = createComponentRenderer(TestDefinitionListView);

const workflowId = 'workflow1';
const mockTestDefinitions: TestDefinitionRecord[] = [
	{
		id: '1',
		name: 'Test 1',
		workflowId,
		updatedAt: '2023-01-01T00:00:00.000Z',
		createdAt: '2023-01-01T00:00:00.000Z',
		annotationTagId: 'tag1',
	},
	{
		id: '2',
		name: 'Test 2',
		workflowId,
		updatedAt: '2023-01-02T00:00:00.000Z',
		createdAt: '2023-01-01T00:00:00.000Z',
	},
	{
		id: '3',
		name: 'Test 3',
		workflowId,
		updatedAt: '2023-01-03T00:00:00.000Z',
		createdAt: '2023-01-01T00:00:00.000Z',
	},
];

const toast = vi.hoisted(
	() =>
		({
			showMessage: vi.fn(),
			showError: vi.fn(),
		}) satisfies Partial<ReturnType<typeof useToast>>,
);

vi.mock('@/composables/useToast', () => ({
	useToast: () => toast,
}));

const message = vi.hoisted(
	() =>
		({
			confirm: vi.fn(),
		}) satisfies Partial<ReturnType<typeof useMessage>>,
);

vi.mock('@/composables/useMessage', () => ({
	useMessage: () => message,
}));

describe('TestDefinitionListView', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render loader', async () => {
		const { getByTestId } = renderComponent({ props: { name: 'any' } });
		expect(getByTestId('test-definition-loader')).toBeTruthy();
	});

	it('should render empty state when no tests exist', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.allTestDefinitionsByWorkflowId = {};

		const { getByTestId } = renderComponent({ props: { name: 'any' } });
		await waitFor(() => expect(getByTestId('test-definition-empty-state')).toBeTruthy());
	});

	it('should render tests list when tests exist', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.allTestDefinitionsByWorkflowId[workflowId] = mockTestDefinitions;

		const { getByTestId } = renderComponent({ props: { name: workflowId } });

		await waitFor(() => expect(getByTestId('test-definition-list')).toBeTruthy());
	});

	it('should load initial base on route param', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		renderComponent({ props: { name: workflowId } });
		expect(testDefinitionStore.fetchAll).toHaveBeenCalledWith({ workflowId });
	});

	it('should start test run and show success message', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.allTestDefinitionsByWorkflowId[workflowId] = mockTestDefinitions;
		testDefinitionStore.startTestRun.mockResolvedValueOnce({ success: true });

		const { getByTestId } = renderComponent({ props: { name: workflowId } });

		await waitFor(() => expect(getByTestId('test-definition-list')).toBeTruthy());

		const testToRun = mockTestDefinitions[0].id;
		await userEvent.click(getByTestId(`run-test-${testToRun}`));

		expect(testDefinitionStore.startTestRun).toHaveBeenCalledWith(testToRun);
		expect(toast.showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		expect(testDefinitionStore.fetchTestRuns).toHaveBeenCalledWith(testToRun);
	});

	it('should show error message on failed test run', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.allTestDefinitionsByWorkflowId[workflowId] = mockTestDefinitions;
		testDefinitionStore.startTestRun.mockRejectedValueOnce(new Error('Run failed'));

		const { getByTestId } = renderComponent({ props: { name: workflowId } });

		await waitFor(() => expect(getByTestId('test-definition-list')).toBeTruthy());

		const testToRun = mockTestDefinitions[0].id;
		await userEvent.click(getByTestId(`run-test-${testToRun}`));

		expect(toast.showError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
	});

	it('should delete test and show success message', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.allTestDefinitionsByWorkflowId[workflowId] = mockTestDefinitions;

		message.confirm.mockResolvedValueOnce(MODAL_CONFIRM);

		const { getByTestId, queryByTestId } = renderComponent({
			props: { name: workflowId },
		});

		await waitFor(() => expect(getByTestId('test-definition-list')).toBeTruthy());

		const testToDelete = mockTestDefinitions[0].id;

		const trigger = getByTestId(`test-actions-${testToDelete}`);
		await userEvent.click(trigger);

		const dropdownId = within(trigger).getByRole('button').getAttribute('aria-controls');
		const dropdown = document.querySelector(`#${dropdownId}`);
		expect(dropdown).toBeInTheDocument();

		await userEvent.click(await within(dropdown as HTMLElement).findByText('Delete'));

		expect(testDefinitionStore.deleteById).toHaveBeenCalledWith(testToDelete);
		expect(toast.showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));

		/**
		 * since the actions are mocked by default,
		 * double check the UI updates correctly
		 */
		testDefinitionStore.allTestDefinitionsByWorkflowId = {
			[workflowId]: [mockTestDefinitions[1], mockTestDefinitions[2]],
		};
		await waitFor(() =>
			expect(queryByTestId(`test-actions-${testToDelete}`)).not.toBeInTheDocument(),
		);
	});

	it('should sort tests by updated date in descending order', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		testDefinitionStore.allTestDefinitionsByWorkflowId[workflowId] = mockTestDefinitions;

		const { container, getByTestId } = renderComponent({ props: { name: workflowId } });
		await waitFor(() => expect(getByTestId('test-definition-list')).toBeTruthy());

		const testItems = container.querySelectorAll('[data-test-id^="test-item-"]');
		expect(testItems[0].getAttribute('data-test-id')).toBe('test-item-3');
		expect(testItems[1].getAttribute('data-test-id')).toBe('test-item-2');
		expect(testItems[2].getAttribute('data-test-id')).toBe('test-item-1');
	});
});
