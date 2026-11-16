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
	it('groups the nodes by service, the most used first, with their node names', () => {
		const { getAllByTestId, getByTestId } = render(
			workflowPage([
				node('Get leads', 'HTTP Request'),
				node('Notify sales', 'Slack'),
				node('New lead', 'Webhook', { isTrigger: true }),
				node('Notify support', 'Slack'),
				node('Note', 'Sticky Note', { type: 'n8n-nodes-base.stickyNote' }),
			]),
		);

		expect(getByTestId('integrations-summary').textContent).toBe('Services: 3. Nodes: 4.');
		const names = getAllByTestId('integrations-service-name').map((el) => el.textContent);
		expect(names).toEqual(['Slack', 'HTTP Request', 'Webhook']);
		const [slack, , webhook] = getAllByTestId('integrations-service');
		expect(slack.textContent).toContain('Notify sales');
		expect(slack.textContent).toContain('Notify support');
		expect(webhook.textContent).toContain('Trigger');
		expect(slack.textContent).not.toContain('Trigger');
	});

	it('falls back to the node type when the type is unknown', () => {
		const { getAllByTestId } = render(
			workflowPage([{ name: 'Custom', type: 'n8n-nodes-community.thing' }] as never),
		);

		expect(getAllByTestId('integrations-service-name')[0].textContent).toBe(
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
