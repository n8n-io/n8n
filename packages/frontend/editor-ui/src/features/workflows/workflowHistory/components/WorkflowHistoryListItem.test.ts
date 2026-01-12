import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import type { UserAction } from '@n8n/design-system';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryListItem from './WorkflowHistoryListItem.vue';
import type { WorkflowHistoryActionTypes } from '@n8n/rest-api-client/api/workflowHistory';
import { workflowHistoryDataFactory } from '../__tests__/utils';
import { type IUser } from 'n8n-workflow';

const actionTypes: WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
const actions: Array<UserAction<IUser>> = actionTypes.map((value) => ({
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

	test.each(actionTypes)('should emit %s event', async (action) => {
		const item = workflowHistoryDataFactory();
		const { queryByText, getByTestId, emitted } = renderComponent({
			pinia,
			props: {
				item,
				index: 2,
				actions,
				isSelected: true,
			},
		});

		await userEvent.click(getByTestId('action-toggle'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		await userEvent.click(getByTestId(`action-${action}`));
		expect(emitted().action).toEqual([
			[
				{
					action,
					id: item.versionId,
					data: {
						formattedCreatedAt: expect.any(String),
						versionName: item.name,
						description: item.description,
					},
				},
			],
		]);

		expect(queryByText(/Latest saved/)).not.toBeInTheDocument();
		expect(emitted().mounted).toEqual([[{ index: 2, isSelected: true, offsetTop: 0 }]]);
	});
});
