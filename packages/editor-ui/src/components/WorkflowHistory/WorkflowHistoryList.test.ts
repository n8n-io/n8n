import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { faker } from '@faker-js/faker';
import type { UserAction } from 'n8n-design-system';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryList from '@/components/WorkflowHistory/WorkflowHistoryList.vue';
import type { WorkflowHistoryActionTypes } from '@/types/workflowHistory';
import { workflowHistoryDataFactory } from '@/stores/__tests__/utils/workflowHistoryTestUtils';

vi.stubGlobal(
	'IntersectionObserver',
	vi.fn(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		takeRecords: vi.fn(),
		unobserve: vi.fn(),
	})),
);

const actionTypes: WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
const actions: UserAction[] = actionTypes.map((value) => ({
	label: value,
	disabled: false,
	value,
}));

const renderComponent = createComponentRenderer(WorkflowHistoryList);

let pinia: ReturnType<typeof createPinia>;

describe('WorkflowHistoryList', () => {
	beforeAll(() => {
		Element.prototype.scrollTo = vi.fn(() => {});
	});

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render empty list when not loading and no items', () => {
		const { getByText, queryByRole } = renderComponent({
			pinia,
			props: {
				items: [],
				actions,
				activeItem: null,
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 0,
				evaluatedPruneTime: -1,
			},
		});

		expect(queryByRole('status')).not.toBeInTheDocument();
		expect(getByText(/No versions yet/)).toBeInTheDocument();
	});

	it('should show loader but no empty list message when loading', () => {
		const { queryByText, getByRole } = renderComponent({
			pinia,
			props: {
				items: [],
				actions,
				activeItem: null,
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 0,
				evaluatedPruneTime: -1,
				isListLoading: true,
			},
		});

		expect(getByRole('status')).toBeInTheDocument();
		expect(queryByText(/No versions yet/)).not.toBeInTheDocument();
	});

	it('should render list and delegate preview event', async () => {
		const numberOfItems = faker.number.int({ min: 10, max: 50 });
		const items = Array.from({ length: numberOfItems }, workflowHistoryDataFactory);

		const { getAllByTestId, emitted, queryByRole } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				activeItem: null,
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneTime: -1,
			},
		});

		expect(queryByRole('link', { name: /upgrade/i })).not.toBeInTheDocument();

		const listItems = getAllByTestId('workflow-history-list-item');
		const listItem = listItems[items.length - 1];
		await userEvent.click(within(listItem).getByText(/ID: /));
		expect(emitted().preview).toEqual([
			[
				{
					id: items[items.length - 1].versionId,
					event: expect.any(MouseEvent),
				},
			],
		]);

		expect(listItems).toHaveLength(numberOfItems);
	});

	it('should scroll to active item', async () => {
		const items = Array.from({ length: 30 }, workflowHistoryDataFactory);

		const { getByTestId } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				activeItem: items[0],
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneTime: -1,
			},
		});

		expect(getByTestId('workflow-history-list').scrollTo).toHaveBeenCalled();
	});

	test.each(actionTypes)('should delegate %s event from item', async (action) => {
		const items = Array.from({ length: 2 }, workflowHistoryDataFactory);
		const index = 1;
		const { getAllByTestId, emitted } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				activeItem: null,
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneTime: -1,
			},
		});

		const listItem = getAllByTestId('workflow-history-list-item')[index];

		await userEvent.click(within(listItem).getByTestId('action-toggle'));
		const actionsDropdown = getAllByTestId('action-toggle-dropdown')[index];
		expect(actionsDropdown).toBeInTheDocument();

		await userEvent.click(within(actionsDropdown).getByTestId(`action-${action}`));
		expect(emitted().action).toEqual([
			[
				{
					action,
					id: items[index].versionId,
					data: { formattedCreatedAt: expect.any(String) },
				},
			],
		]);
	});

	it('should show upgrade message', async () => {
		const items = Array.from({ length: 5 }, workflowHistoryDataFactory);

		const { getByRole } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				activeItem: items[0],
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneTime: -1,
				shouldUpgrade: true,
			},
		});

		expect(getByRole('link', { name: /upgrade/i })).toBeInTheDocument();
	});
});
