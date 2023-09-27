import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import type { UserAction } from 'n8n-design-system';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryListItem from '@/components/WorkflowHistory/WorkflowHistoryListItem.vue';
import type { WorkflowHistory } from '@/types/workflowHistory';

const workflowHistoryDataFactory: () => WorkflowHistory = () => ({
	versionId: faker.string.nanoid(),
	createdAt: faker.date.past().toDateString(),
	authors: Array.from({ length: faker.number.int({ min: 2, max: 5 }) }, faker.person.fullName).join(
		', ',
	),
});

const actionTypes: WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
const actions: UserAction[] = actionTypes.map((value) => ({
	label: value,
	disabled: false,
	value,
}));

const renderComponent = createComponentRenderer(WorkflowHistoryListItem);

let pinia: ReturnType<typeof createPinia>;

describe('WorkflowHistoryListItem', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render item with badge', async () => {
		const item = workflowHistoryDataFactory();
		item.authors = 'John Doe';
		const { getByText, container, queryByRole, emitted } = renderComponent({
			pinia,
			props: {
				item,
				index: 0,
				actions,
				isActive: false,
			},
		});

		await userEvent.hover(container.querySelector('.el-tooltip__trigger'));
		expect(queryByRole('tooltip')).not.toBeInTheDocument();

		await userEvent.click(container.querySelector('p'));
		expect(emitted().preview).toEqual([
			[expect.objectContaining({ id: item.versionId, event: expect.any(MouseEvent) })],
		]);

		expect(emitted().mounted).toEqual([[{ index: 0, isActive: false, offsetTop: 0 }]]);
		expect(getByText(/Latest saved/)).toBeInTheDocument();
	});

	test.each(actionTypes)('should emit %s event', async (action) => {
		const item = workflowHistoryDataFactory();
		const authors = item.authors.split(', ');
		const { queryByText, getByRole, getByTestId, container, emitted } = renderComponent({
			pinia,
			props: {
				item,
				index: 2,
				actions,
				isActive: true,
			},
		});

		const authorsTag = container.querySelector('.el-tooltip__trigger');
		expect(authorsTag).toHaveTextContent(`${authors[0]} + ${authors.length - 1}`);
		await userEvent.hover(authorsTag);
		expect(getByRole('tooltip')).toBeInTheDocument();

		await userEvent.click(getByTestId('action-toggle'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		await userEvent.click(getByTestId(`action-${action}`));
		expect(emitted().action).toEqual([[{ action, id: item.versionId }]]);

		expect(queryByText(/Latest saved/)).not.toBeInTheDocument();
		expect(emitted().mounted).toEqual([[{ index: 2, isActive: true, offsetTop: 0 }]]);
	});
});
