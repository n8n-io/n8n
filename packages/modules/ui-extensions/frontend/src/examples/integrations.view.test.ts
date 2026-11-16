import {
	hiddenWorkflowPage,
	listPage,
	node,
	renderBuiltinView,
	workflowPage,
} from '../__tests__/render-builtin-view';

const render = (context: Parameters<typeof renderBuiltinView>[1]) =>
	renderBuiltinView('builtin:integrations', context);

describe('Integrations view', () => {
	it('lists only the outside services, the most used first, then the built-in nodes', () => {
		const { getAllByTestId, getByTestId } = render(
			workflowPage([
				node('Every morning', 'Schedule Trigger', { isTrigger: true }),
				node('Get leads', 'HTTP Request'),
				node('Is qualified?', 'If'),
				node('Notify sales', 'Slack', { isService: true }),
				node('New row', 'Google Sheets Trigger', { isTrigger: true, isService: true }),
				node('Notify support', 'Slack', { isService: true }),
				node('Note', 'Sticky Note', { type: 'n8n-nodes-base.stickyNote' }),
			]),
		);

		expect(getByTestId('integrations-summary').textContent).toBe('Services: 2. Nodes: 6.');
		const names = getAllByTestId('integrations-service-name').map((el) => el.textContent);
		expect(names).toEqual(['Slack', 'Google Sheets Trigger']);
		const [slack, sheets] = getAllByTestId('integrations-service');
		expect(slack.textContent).toContain('Notify sales');
		expect(slack.textContent).toContain('Notify support');
		expect(slack.textContent).not.toContain('Trigger');
		expect(sheets.textContent).toContain('Trigger');
		const builtin = getAllByTestId('integrations-builtin-node').map((el) => el.textContent?.trim());
		expect(builtin.sort()).toEqual(['HTTP Request', 'If', 'Schedule Trigger']);
	});

	it('says so when the workflow connects to no outside service', () => {
		const { getByTestId, queryByTestId } = render(
			workflowPage([node('Start', 'Manual Trigger', { isTrigger: true }), node('Is it?', 'If')]),
		);

		expect(getByTestId('integrations-no-services')).toBeTruthy();
		expect(queryByTestId('integrations-service')).toBeNull();
		expect(getByTestId('integrations-builtin')).toBeTruthy();
	});

	it('falls back to the node type when the type is unknown', () => {
		const { getAllByTestId } = render(
			workflowPage([{ name: 'Custom', type: 'n8n-nodes-community.thing' }] as never),
		);

		expect(getAllByTestId('integrations-builtin-node')[0].textContent?.trim()).toBe(
			'n8n-nodes-community.thing',
		);
	});

	it('asks for nodes when the workflow is empty', () => {
		const { getByText } = render(workflowPage([]));

		expect(getByText('Add nodes to see the services this workflow connects to.')).toBeTruthy();
	});

	it('asks to open a workflow on another page', () => {
		const { getByText, queryByTestId } = render(listPage);

		expect(getByText('Open a workflow to see the services it connects to.')).toBeTruthy();
		expect(queryByTestId('integrations-service')).toBeNull();
	});

	it('says so when it cannot see the workflow', () => {
		const { getByText } = render(hiddenWorkflowPage);

		expect(getByText("This view can't see the open workflow.")).toBeTruthy();
	});
});
