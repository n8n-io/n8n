import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import PlanReviewPanel, { type PlannedTaskArg } from '../components/PlanReviewPanel.vue';

const plannedTasks: PlannedTaskArg[] = [
	{
		id: 'table',
		title: "Create 'Leads' data table",
		kind: 'manage-data-tables',
		spec: "Create a data table named 'Leads'.\nColumns: email (string), score (number)",
		deps: [],
	},
	{
		id: 'workflow',
		title: "Build 'Lead routing' workflow",
		kind: 'build-workflow',
		spec: 'Route qualified leads to the sales team.\nTrigger: Webhook POST',
		deps: ['table'],
	},
	{
		id: 'research',
		title: 'Find enrichment API requirements',
		kind: 'research',
		spec: 'Confirm the enrichment API payload format.',
		deps: [],
	},
	{
		id: 'checkpoint',
		title: "Verify 'Lead routing' workflow",
		kind: 'checkpoint',
		spec: 'Run verification and confirm the workflow completes without errors.',
		deps: ['workflow'],
	},
	{
		id: 'delegate',
		title: 'Document handoff notes',
		kind: 'delegate',
		spec: 'Summarize what was built and how to operate it.',
		deps: ['checkpoint'],
	},
];

const renderComponent = createComponentRenderer(PlanReviewPanel, {
	props: {
		plannedTasks,
	},
});

describe('PlanReviewPanel', () => {
	it('renders generated artifacts without the task todo list', () => {
		const { getAllByTestId, getAllByText, getByTestId, getByText, queryByTestId, queryByText } =
			renderComponent();

		expect(getByText('Plan')).toBeInTheDocument();
		expect(queryByText('Review before building')).not.toBeInTheDocument();
		const summary = getByText(
			'This plan will generate Leads and Lead routing. Route qualified leads to the sales team. It includes verification steps to make sure the generated artifacts work as expected.',
		);
		expect(summary).toBeInTheDocument();
		expect(summary.className).toMatch(/size-medium/);
		expect(queryByTestId('instance-ai-plan-task-summary')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-artifacts')).toBeInTheDocument();
		expect(getByText('Artifacts')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-plan-artifact')).toHaveLength(2);
		expect(getByText('Leads')).toBeInTheDocument();
		expect(getAllByText('Lead routing').length).toBeGreaterThan(0);
		expect(getByText("Create a data table named 'Leads'.")).toBeInTheDocument();
		expect(getByText('Route qualified leads to the sales team.')).toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-triggers')).toBeInTheDocument();
		expect(getByText('Triggers')).toBeInTheDocument();
		expect(getByText('Webhook')).toBeInTheDocument();
		expect(getByText('Triggered by incoming webhook requests.')).toBeInTheDocument();
		expect(queryByText("Create 'Leads' data table")).not.toBeInTheDocument();
		expect(queryByText("Build 'Lead routing' workflow")).not.toBeInTheDocument();
		expect(queryByText("Verify 'Lead routing' workflow")).not.toBeInTheDocument();
		expect(queryByText('Workflows')).not.toBeInTheDocument();
		expect(queryByText('Data tables')).not.toBeInTheDocument();
		expect(queryByText('Research')).not.toBeInTheDocument();
		expect(queryByText('Tasks')).not.toBeInTheDocument();
		expect(queryByText(/After:/)).not.toBeInTheDocument();
		expect(queryByText('Checks')).not.toBeInTheDocument();
		expect(
			queryByText('Run verification and confirm the workflow completes without errors.'),
		).not.toBeInTheDocument();
	});

	it('derives a shared plan title from related workflow tasks', () => {
		const { getByText } = renderComponent({
			props: {
				plannedTasks: [
					{
						id: 'chat-workflow',
						title: "Build 'UI Copy Feedback Agent - n8n Chat' workflow",
						kind: 'build-workflow',
						spec: 'Create the chat-triggered workflow.',
						deps: [],
					},
					{
						id: 'slack-workflow',
						title: "Build 'UI Copy Feedback Agent - Slack Bot' workflow",
						kind: 'build-workflow',
						spec: 'Create the Slack-triggered workflow.',
						deps: [],
					},
				],
			},
		});

		expect(getByText('Plan')).toBeInTheDocument();
		expect(getByText('UI Copy Feedback Agent')).toBeInTheDocument();
	});

	it('renders triggers and external connections from workflow specs', () => {
		const { getAllByTestId, getByTestId, getByText } = renderComponent({
			props: {
				plannedTasks: [
					{
						id: 'chat-workflow',
						title: "Build 'UI Copy Feedback Agent - n8n Chat' workflow",
						kind: 'build-workflow',
						spec: 'A conversational AI agent triggered via the n8n-hosted chat interface. It uses Anthropic for AI model calls and fetches content guidelines from GitHub.',
						deps: [],
					},
					{
						id: 'slack-workflow',
						title: "Build 'UI Copy Feedback Agent - Slack Bot' workflow",
						kind: 'build-workflow',
						spec: 'A Slack-triggered agent that replies in thread with content design feedback.',
						deps: [],
					},
				],
			},
		});

		expect(getByTestId('instance-ai-plan-triggers')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-plan-trigger')).toHaveLength(2);
		expect(getByText('n8n Chat')).toBeInTheDocument();
		expect(getByText('Triggered from the n8n chat interface.')).toBeInTheDocument();
		expect(getByText('Triggered by Slack messages or events.')).toBeInTheDocument();

		expect(getByTestId('instance-ai-plan-connections')).toBeInTheDocument();
		expect(getAllByTestId('instance-ai-plan-connection')).toHaveLength(3);
		expect(getByText('Connections')).toBeInTheDocument();
		expect(getByText('Uses Slack messages, channels, or threads.')).toBeInTheDocument();
		expect(getByText('Uses GitHub repository content or files.')).toBeInTheDocument();
		expect(getByText('Uses Anthropic or Claude for AI model calls.')).toBeInTheDocument();
	});

	it('deduplicates repeated planned tasks by title', () => {
		const { getAllByTestId } = renderComponent({
			props: {
				plannedTasks: [
					...plannedTasks,
					{
						...plannedTasks[1],
						id: 'workflow-copy',
					},
				],
			},
		});

		const artifacts = getAllByTestId('instance-ai-plan-artifact').map((task) =>
			task.textContent?.trim(),
		);
		expect(artifacts.filter((title) => title?.startsWith('Lead routing'))).toHaveLength(1);
	});

	it('shows exactly the two pending plan actions without an internal textarea', () => {
		const { getByTestId, queryByRole } = renderComponent();

		expect(getByTestId('instance-ai-plan-request-changes')).toHaveTextContent('Ask for edits');
		expect(getByTestId('instance-ai-plan-approve')).toHaveTextContent('Approve');
		expect(queryByRole('textbox')).not.toBeInTheDocument();
	});

	it('marks the card as loading while the initial plan is being built', () => {
		const { getByRole, getByTestId, getByText } = renderComponent({
			props: {
				plannedTasks: [],
				loading: true,
			},
		});

		expect(getByTestId('instance-ai-plan-review')).toHaveAttribute('data-loading', 'true');
		expect(getByTestId('instance-ai-plan-review')).toHaveAttribute('aria-busy', 'true');
		expect(getByText('Building plan')).toBeInTheDocument();
		expect(getByText('Building plan...')).toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-review').className).not.toMatch(/shimmering/);
		expect(getByRole('heading', { name: 'Building plan' }).className).toMatch(/titleShimmer/);
	});

	it('emits approve when the approve action is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-plan-approve'));

		expect(emitted().approve).toEqual([[]]);
	});

	it('emits request-changes without feedback when ask for edits is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-plan-request-changes'));

		expect(emitted()['request-changes']).toEqual([[]]);
		expect(getByTestId('instance-ai-plan-request-changes')).toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-approve')).toBeInTheDocument();
	});

	it('shows changes requested with an updating state after feedback is submitted', () => {
		const { getByRole, getByTestId, getByText, queryByTestId } = renderComponent({
			props: {
				status: 'changes-requested',
				updating: true,
			},
		});

		expect(queryByTestId('instance-ai-plan-request-changes')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-approve')).not.toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-review')).toHaveAttribute('data-loading', 'true');
		expect(getByTestId('instance-ai-plan-review')).toHaveAttribute('aria-busy', 'true');
		expect(getByTestId('instance-ai-plan-review').className).not.toMatch(/shimmering/);
		expect(getByRole('heading', { name: 'Lead routing' }).className).toMatch(/titleShimmer/);
		expect(getByText('Updating plan...')).toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-changes-requested')).toHaveTextContent(
			'Changes requested',
		);
	});

	it('hides actions for read-only plans', () => {
		const { queryByTestId } = renderComponent({
			props: {
				readOnly: true,
			},
		});

		expect(queryByTestId('instance-ai-plan-request-changes')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-approve')).not.toBeInTheDocument();
	});
});
