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
];

const plannedTasksWithVerifyStep: PlannedTaskArg[] = [
	...plannedTasks,
	{
		id: 'verify-workflow',
		title: "Verify 'Lead routing' workflow runs without errors",
		kind: 'checkpoint',
		spec: 'Call verify-built-workflow with the work item ID from the build outcome.',
		deps: ['workflow'],
	},
];

const renderComponent = createComponentRenderer(PlanReviewPanel, {
	props: { plannedTasks },
});

describe('PlanReviewPanel', () => {
	it('renders the task list with title and spec for each task', () => {
		const { getByText, getByTestId } = renderComponent();

		expect(getByText('Review plan')).toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-review')).toBeInTheDocument();
		expect(getByText("Create 'Leads' data table")).toBeInTheDocument();
		expect(getByText("Build 'Lead routing' workflow")).toBeInTheDocument();
		expect(getByText(/Route qualified leads to the sales team\./)).toBeInTheDocument();
	});

	it('shows the three pending plan actions without an internal textarea', () => {
		const { getByTestId, queryByRole } = renderComponent();

		expect(getByTestId('instance-ai-plan-deny')).toHaveTextContent('Deny');
		expect(getByTestId('instance-ai-plan-ask-for-edits')).toHaveTextContent('Ask for edits');
		expect(getByTestId('instance-ai-plan-approve')).toHaveTextContent('Approve');
		expect(queryByRole('textbox')).not.toBeInTheDocument();
	});

	it('collapses verification steps by default', async () => {
		const { getByRole, getByText, queryByText } = renderComponent({
			props: { plannedTasks: plannedTasksWithVerifyStep },
		});

		expect(getByText(/Route qualified leads to the sales team\./)).toBeInTheDocument();
		expect(
			queryByText(/Call verify-built-workflow with the work item ID from the build outcome\./),
		).not.toBeInTheDocument();

		await userEvent.click(
			getByRole('button', { name: "3 Verify 'Lead routing' workflow runs without errors" }),
		);

		expect(
			getByText(/Call verify-built-workflow with the work item ID from the build outcome\./),
		).toBeInTheDocument();
	});

	it('marks the card as loading while the initial plan is being built', () => {
		const { getByTestId, getByText } = renderComponent({
			props: { plannedTasks: [], loading: true },
		});

		expect(getByTestId('instance-ai-plan-review')).toHaveAttribute('data-loading', 'true');
		expect(getByTestId('instance-ai-plan-review')).toHaveAttribute('aria-busy', 'true');
		expect(getByText('Building plan...')).toBeInTheDocument();
	});

	it('shows a building indicator in the header while tasks stream in', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { plannedTasks, loading: true },
		});

		expect(getByTestId('instance-ai-plan-building')).toHaveTextContent('Building plan...');
		// Actions stay hidden until the plan is final.
		expect(queryByTestId('instance-ai-plan-approve')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-ask-for-edits')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-deny')).not.toBeInTheDocument();
	});

	it('emits approve when the approve action is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-plan-approve'));

		expect(emitted().approve).toEqual([[]]);
	});

	it('emits ask-for-edits when the ask-for-edits action is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-plan-ask-for-edits'));

		expect(emitted()['ask-for-edits']).toEqual([[]]);
		expect(getByTestId('instance-ai-plan-ask-for-edits')).toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-approve')).toBeInTheDocument();
	});

	it('emits deny when the deny action is clicked', async () => {
		const { emitted, getByTestId } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-plan-deny'));

		expect(emitted().deny).toEqual([[]]);
		expect(emitted().approve).toBeUndefined();
		expect(emitted()['ask-for-edits']).toBeUndefined();
	});

	it('shows the denied badge after the deny action resolves', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		await userEvent.click(getByTestId('instance-ai-plan-deny'));

		expect(getByTestId('instance-ai-plan-denied')).toHaveTextContent('Plan denied');
		expect(queryByTestId('instance-ai-plan-approve')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-ask-for-edits')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-deny')).not.toBeInTheDocument();
	});

	it('shows the updating indicator while a changes-requested plan is regenerating', () => {
		const { getByTestId, getByText, queryByTestId } = renderComponent({
			props: { status: 'changes-requested', updating: true },
		});

		expect(getByTestId('instance-ai-plan-review')).toHaveAttribute('data-loading', 'true');
		expect(getByText('Updating plan...')).toBeInTheDocument();
		expect(getByTestId('instance-ai-plan-changes-requested')).toHaveTextContent(
			'Changes requested',
		);
		expect(queryByTestId('instance-ai-plan-ask-for-edits')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-approve')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-deny')).not.toBeInTheDocument();
	});

	it('hides actions for read-only plans', () => {
		const { queryByTestId } = renderComponent({ props: { readOnly: true } });

		expect(queryByTestId('instance-ai-plan-ask-for-edits')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-approve')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-plan-deny')).not.toBeInTheDocument();
	});

	it('shows a chevron and removes the header divider for collapsed plans', () => {
		const { getByTestId, queryByText } = renderComponent({
			props: { readOnly: true, status: 'approved' },
		});

		const header = getByTestId('instance-ai-plan-review-header');
		const chevron = getByTestId('instance-ai-plan-review-chevron');

		expect(header.className).toContain('headerCollapsed');
		expect(chevron).toHaveAttribute('data-icon', 'chevron-right');
		expect(queryByText('Plan approved')).not.toBeInTheDocument();
	});
});
