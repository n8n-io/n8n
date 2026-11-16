import {
	hiddenWorkflowPage,
	listPage,
	node,
	otherPage,
	renderBuiltinView,
	workflowPage,
} from '../__tests__/render-builtin-view';

const render = (context: Parameters<typeof renderBuiltinView>[1]) =>
	renderBuiltinView('builtin:page-summary', context);

describe('Page summary view', () => {
	const nodes = [
		node('Every morning', 'Schedule Trigger', { isTrigger: true }),
		node('Get leads', 'HTTP Request'),
		node('Notify sales', 'Slack'),
		node('Notify support', 'Slack', { disabled: true }),
		node('Note', 'Sticky Note', { type: 'n8n-nodes-base.stickyNote' }),
	];

	it('shows the workflow, its state and its stats, without the sticky notes', () => {
		const { getByTestId } = render(workflowPage(nodes, { active: true }));

		expect(getByTestId('page-summary-workflow-name').textContent).toBe('Lead routing');
		expect(getByTestId('page-summary-state').textContent?.trim()).toBe('Published');
		expect(getByTestId('page-summary-stat-nodes').textContent).toBe('4');
		expect(getByTestId('page-summary-stat-triggers').textContent).toBe('1');
		expect(getByTestId('page-summary-stat-services').textContent).toBe('3');
		expect(getByTestId('page-summary-stat-disabled').textContent).toBe('1');
	});

	it('lists the triggers that start the workflow', () => {
		const { getAllByTestId } = render(workflowPage(nodes));

		const triggers = getAllByTestId('page-summary-trigger');
		expect(triggers).toHaveLength(1);
		expect(triggers[0].textContent).toContain('Every morning');
		expect(triggers[0].textContent).toContain('Schedule Trigger');
	});

	it('warns when the workflow has no trigger', () => {
		const { getByTestId, getByText } = render(workflowPage([node('Get leads', 'HTTP Request')]));

		expect(getByTestId('page-summary-no-trigger')).toBeTruthy();
		expect(getByText('Not published')).toBeTruthy();
	});

	it('says so when it cannot see the workflow', () => {
		const { getByText, queryByTestId } = render(hiddenWorkflowPage);

		expect(getByText("This view can't see the open workflow.")).toBeTruthy();
		expect(queryByTestId('page-summary-workflow-name')).toBeNull();
	});

	it('shows the workflow count on the workflows list, and follows a page change', async () => {
		const { getByTestId, queryByTestId, context } = render(listPage);

		expect(getByTestId('page-summary-workflow-count').textContent).toBe('7');

		context.value = otherPage;
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(queryByTestId('page-summary-workflow-count')).toBeNull();
		expect(getByTestId('page-summary-route').textContent).toBe('SettingsPersonalView');
	});
});
