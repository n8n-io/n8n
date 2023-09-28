import { within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { faker } from '@faker-js/faker';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryList from '@/components/WorkflowHistory/WorkflowHistoryList.vue';
import type { WorkflowHistory, WorkflowHistoryActionTypes } from '@/types/workflowHistory';

vi.stubGlobal(
	'IntersectionObserver',
	vi.fn(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		takeRecords: vi.fn(),
		unobserve: vi.fn(),
	})),
);

const workflowHistoryDataFactory: () => WorkflowHistory = () => ({
	versionId: faker.string.nanoid(),
	createdAt: faker.date.past().toDateString(),
	authors: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, faker.person.fullName).join(
		', ',
	),
});

const actionTypes: WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];

const renderComponent = createComponentRenderer(WorkflowHistoryList);

let pinia: ReturnType<typeof createPinia>;

describe('WorkflowHistoryList', () => {
	beforeAll(() => {
		Element.prototype.scrollTo = vi.fn();
	});

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render empty list', () => {
		const { getByText } = renderComponent({
			pinia,
			props: {
				items: [],
				actionTypes,
				activeItem: null,
				requestNumberOfItems: 20,
			},
		});

		expect(getByText(/No versions yet/)).toBeInTheDocument();
	});

	it('should render list and delegate preview event', async () => {
		const numberOfItems = faker.number.int({ min: 10, max: 50 });
		const items = Array.from({ length: numberOfItems }, workflowHistoryDataFactory);

		const { getAllByTestId, emitted } = renderComponent({
			pinia,
			props: {
				items,
				actionTypes,
				activeItem: null,
				requestNumberOfItems: 20,
			},
		});

		const listItems = getAllByTestId('workflow-history-list-item');
		const listItem = listItems[items.length - 1];
		await userEvent.click(within(listItem).getByText(/ID: /));
		expect(emitted().preview).toEqual([
			[
				expect.objectContaining({
					id: items[items.length - 1].versionId,
					event: expect.any(MouseEvent),
				}),
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
				actionTypes,
				activeItem: items[0],
				requestNumberOfItems: 20,
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
				actionTypes,
				activeItem: null,
				requestNumberOfItems: 20,
			},
		});

		const listItem = getAllByTestId('workflow-history-list-item')[index];

		await userEvent.click(within(listItem).getByTestId('action-toggle'));
		const actionsDropdown = getAllByTestId('action-toggle-dropdown')[index];
		expect(actionsDropdown).toBeInTheDocument();

		await userEvent.click(within(actionsDropdown).getByTestId(`action-${action}`));
		expect(emitted().action).toEqual([[{ action, id: items[index].versionId }]]);
	});
});
