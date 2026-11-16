import {
	hiddenWorkflowPage,
	listPage,
	node,
	renderBuiltinView,
	workflowPage,
} from '../__tests__/render-builtin-view';

const render = (context: Parameters<typeof renderBuiltinView>[1]) =>
	renderBuiltinView('builtin:checklist', context);

const passOf = (el: HTMLElement) => el.getAttribute('data-pass');

describe('Checklist view', () => {
	it('passes every check on a tidy workflow', () => {
		const { getByTestId, getByText } = render(
			workflowPage(
				[
					node('New lead', 'Webhook', { isTrigger: true }),
					node('Tell sales', 'Slack'),
					node('About this workflow', 'Sticky Note', { type: 'n8n-nodes-base.stickyNote' }),
				],
				{ hasErrorWorkflow: true },
			),
		);

		expect(getByTestId('checklist-score').textContent).toBe('5 of 5 checks pass');
		expect(getByText('This workflow passes every check.')).toBeTruthy();
	});

	it('fails each check with what to do', () => {
		const { getByTestId, getByText } = render(
			workflowPage([
				node('HTTP Request', 'HTTP Request'),
				node('HTTP Request1', 'HTTP Request', { disabled: true }),
				node('Slack', 'Slack', { disabled: true }),
			]),
		);

		expect(getByTestId('checklist-score').textContent).toBe('0 of 5 checks pass');
		for (const key of ['trigger', 'errorWorkflow', 'disabled', 'names', 'notes']) {
			expect(passOf(getByTestId(`checklist-${key}`)), key).toBe('false');
		}
		expect(getByText('Disabled nodes: 2. Enable them or remove them.')).toBeTruthy();
		expect(
			getByText('Nodes with a default name: 3. Rename them to say what they do.'),
		).toBeTruthy();
	});

	it('uses the default name of the node type, which can differ from its display name', () => {
		const { getByTestId } = render(
			workflowPage([node('Edit Fields1', 'Edit Fields (Set)', { defaultName: 'Edit Fields' })]),
		);

		expect(passOf(getByTestId('checklist-names'))).toBe('false');
	});

	it.each([
		['a schedule trigger', 'n8n-nodes-base.scheduleTrigger', 'true'],
		[
			'a manual trigger, which runs only when someone starts it',
			'n8n-nodes-base.manualTrigger',
			'false',
		],
	])('checks that the workflow starts on its own with %s', (_case, type, pass) => {
		const { getByTestId } = render(
			workflowPage([node('Start', 'Some Trigger', { isTrigger: true, type })]),
		);

		expect(passOf(getByTestId('checklist-trigger'))).toBe(pass);
	});

	it.each([
		['a name that only starts with the type name', 'HTTP Request leads'],
		['a name with letters after the number', 'HTTP Request1b'],
	])('does not count %s as a default name', (_case, name) => {
		const { getByTestId } = render(workflowPage([node(name, 'HTTP Request')]));

		expect(passOf(getByTestId('checklist-names'))).toBe('true');
	});

	it('asks to open a workflow on another page', () => {
		const { getByText, queryByTestId } = render(listPage);

		expect(getByText('Open a workflow to check it.')).toBeTruthy();
		expect(queryByTestId('checklist-score')).toBeNull();
	});

	it('says so when it cannot see the workflow', () => {
		const { getByText } = render(hiddenWorkflowPage);

		expect(getByText("This view can't see the open workflow.")).toBeTruthy();
	});
});
