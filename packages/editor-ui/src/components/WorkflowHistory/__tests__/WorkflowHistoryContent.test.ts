import { createPinia, setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import type { UserAction } from 'n8n-design-system';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryContent from '@/components/WorkflowHistory/WorkflowHistoryContent.vue';
import type { WorkflowHistoryActionTypes } from '@/types/workflowHistory';
import { workflowHistoryDataFactory } from '@/stores/__tests__/utils/workflowHistoryTestUtils';

const actionTypes: WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
const actions: UserAction[] = actionTypes.map((value) => ({
	label: value,
	disabled: false,
	value,
}));

const renderComponent = createComponentRenderer(WorkflowHistoryContent);

let pinia: ReturnType<typeof createPinia>;

describe('WorkflowHistoryContent', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should use the list item component to render version data', () => {
		const workflowVersion = workflowHistoryDataFactory();
		const { getByTestId } = renderComponent({
			pinia,
			props: {
				workflow: null,
				workflowVersion,
				actions,
			},
		});

		expect(getByTestId('workflow-history-list-item')).toBeInTheDocument();
	});

	test.each(actionTypes)('should emit %s event', async (action) => {
		const workflowVersion = workflowHistoryDataFactory();
		const { getByTestId, emitted } = renderComponent({
			pinia,
			props: {
				workflow: null,
				workflowVersion,
				actions,
			},
		});

		await userEvent.click(getByTestId('action-toggle-button'));
		expect(getByTestId('action-toggle-dropdown')).toBeInTheDocument();

		await userEvent.click(getByTestId(`action-${action}`));
		expect(emitted().action).toEqual([
			[{ action, id: workflowVersion.versionId, data: { formattedCreatedAt: expect.any(String) } }],
		]);
	});
});
