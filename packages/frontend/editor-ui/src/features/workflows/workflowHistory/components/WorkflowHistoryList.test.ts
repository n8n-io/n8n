import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { faker } from '@faker-js/faker';
import type { UserAction } from '@n8n/design-system';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryList from './WorkflowHistoryList.vue';
import type {
	WorkflowHistory,
	WorkflowHistoryActionTypes,
} from '@n8n/rest-api-client/api/workflowHistory';
import { workflowHistoryDataFactory } from '../__tests__/utils';
import type { IUser } from 'n8n-workflow';

const namedWorkflowHistoryDataFactory = (): WorkflowHistory => ({
	...workflowHistoryDataFactory(),
	name: faker.lorem.words(2),
});

const unnamedWorkflowHistoryDataFactory = (): WorkflowHistory => ({
	...workflowHistoryDataFactory(),
	name: '',
});

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
const actions: Array<UserAction<IUser>> = actionTypes.map((value) => ({
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

	it('should show loader but no empty list message when loading', () => {
		const { getByRole } = renderComponent({
			pinia,
			props: {
				items: [],
				actions,
				selectedItem: null,
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 0,
				evaluatedPruneDays: -1,
				isListLoading: true,
			},
		});

		expect(getByRole('status')).toBeInTheDocument();
	});

	it('should render list and delegate preview event', async () => {
		const numberOfItems = faker.number.int({ min: 10, max: 50 });
		const items = Array.from({ length: numberOfItems }, namedWorkflowHistoryDataFactory);

		const { getAllByTestId, emitted, queryByRole } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				selectedItem: null,
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneDays: -1,
			},
		});

		expect(queryByRole('link', { name: /upgrade/i })).not.toBeInTheDocument();

		const listItems = getAllByTestId('workflow-history-list-item');
		const listItem = listItems[items.length - 1];
		await userEvent.click(listItem);
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

	it('should scroll to selected item', async () => {
		const items = Array.from({ length: 30 }, namedWorkflowHistoryDataFactory);

		const { getByTestId } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				selectedItem: items[0],
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneDays: -1,
			},
		});

		expect(getByTestId('workflow-history-list').scrollTo).toHaveBeenCalled();
	});

	test.each(actionTypes)('should delegate %s event from item', async (action) => {
		const items = Array.from({ length: 2 }, namedWorkflowHistoryDataFactory);
		const index = 1;
		const { getAllByTestId, emitted } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				selectedItem: null,
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneDays: -1,
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
					data: {
						formattedCreatedAt: expect.any(String),
						versionName: items[index].name,
						description: items[index].description,
					},
				},
			],
		]);
	});

	it('should show upgrade message when shouldUpgrade is true', async () => {
		const items = Array.from({ length: 5 }, namedWorkflowHistoryDataFactory);

		const { getByRole } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				selectedItem: items[0],
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneDays: 1,
				shouldUpgrade: true,
			},
		});

		expect(getByRole('link', { name: /upgrade/i })).toBeInTheDocument();
	});

	it('should not show upgrade message when shouldUpgrade is false', async () => {
		const items = Array.from({ length: 5 }, namedWorkflowHistoryDataFactory);

		const { queryByRole } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				selectedItem: items[0],
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneDays: 1,
				shouldUpgrade: false,
			},
		});

		expect(queryByRole('link', { name: /upgrade/i })).not.toBeInTheDocument();
	});

	describe('grouping unnamed versions', () => {
		it('should group consecutive unnamed versions under a collapsible header', async () => {
			const items: WorkflowHistory[] = [
				namedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
			];

			const { getAllByTestId, getByTestId, queryAllByTestId } = renderComponent({
				pinia,
				props: {
					items,
					actions,
					selectedItem: null,
					requestNumberOfItems: 20,
					lastReceivedItemsLength: 20,
					evaluatedPruneDays: -1,
				},
			});

			const listItems = getAllByTestId('workflow-history-list-item');
			expect(listItems).toHaveLength(1);

			const groupHeader = getByTestId('workflow-history-group-header');
			expect(groupHeader).toBeInTheDocument();

			expect(queryAllByTestId('workflow-history-list-item')).toHaveLength(1);
		});

		it('should expand group when clicking the group header', async () => {
			const items: WorkflowHistory[] = [
				namedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
			];

			const { getAllByTestId, getByTestId } = renderComponent({
				pinia,
				props: {
					items,
					actions,
					selectedItem: null,
					requestNumberOfItems: 20,
					lastReceivedItemsLength: 20,
					evaluatedPruneDays: -1,
				},
			});

			expect(getAllByTestId('workflow-history-list-item')).toHaveLength(1);

			const groupHeader = getByTestId('workflow-history-group-header');
			await userEvent.click(groupHeader);

			expect(getAllByTestId('workflow-history-list-item')).toHaveLength(3);
		});

		it('should collapse group when clicking expanded header', async () => {
			const items: WorkflowHistory[] = [
				namedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
			];

			const { getAllByTestId, getByTestId } = renderComponent({
				pinia,
				props: {
					items,
					actions,
					selectedItem: null,
					requestNumberOfItems: 20,
					lastReceivedItemsLength: 20,
					evaluatedPruneDays: -1,
				},
			});

			const groupHeader = getByTestId('workflow-history-group-header');

			await userEvent.click(groupHeader);
			expect(getAllByTestId('workflow-history-list-item')).toHaveLength(3);

			await userEvent.click(groupHeader);
			expect(getAllByTestId('workflow-history-list-item')).toHaveLength(1);
		});

		it('should not group the first item even if unnamed', async () => {
			const items: WorkflowHistory[] = [
				unnamedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
			];

			const { getAllByTestId, getByTestId } = renderComponent({
				pinia,
				props: {
					items,
					actions,
					selectedItem: null,
					requestNumberOfItems: 20,
					lastReceivedItemsLength: 20,
					evaluatedPruneDays: -1,
				},
			});

			expect(getAllByTestId('workflow-history-list-item')).toHaveLength(1);
			expect(getByTestId('workflow-history-group-header')).toBeInTheDocument();
		});

		it('should emit preview event from expanded group item', async () => {
			const items: WorkflowHistory[] = [
				namedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
				unnamedWorkflowHistoryDataFactory(),
			];

			const { getAllByTestId, getByTestId, emitted } = renderComponent({
				pinia,
				props: {
					items,
					actions,
					selectedItem: null,
					requestNumberOfItems: 20,
					lastReceivedItemsLength: 20,
					evaluatedPruneDays: -1,
				},
			});

			await userEvent.click(getByTestId('workflow-history-group-header'));

			const listItems = getAllByTestId('workflow-history-list-item');
			await userEvent.click(listItems[1]);

			expect(emitted().preview).toEqual([
				[
					{
						id: items[1].versionId,
						event: expect.any(MouseEvent),
					},
				],
			]);
		});
	});
});
