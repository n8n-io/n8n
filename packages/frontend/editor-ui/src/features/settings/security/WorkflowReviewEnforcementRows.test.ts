import { createComponentRenderer } from '@/__tests__/render';

import WorkflowReviewEnforcementRows from './WorkflowReviewEnforcementRows.vue';

const renderComponent = createComponentRenderer(WorkflowReviewEnforcementRows);

const baseProps = {
	showPublishing: true,
	showPromoting: true,
	publishing: false,
	promoting: false,
	publishingLocked: false,
	promotingLocked: false,
	publishingTestId: 'project-review-publishing-toggle',
	promotingTestId: 'project-review-promoting-toggle',
};

describe('WorkflowReviewEnforcementRows', () => {
	it('hides both rows when the features are off', () => {
		const { queryByTestId } = renderComponent({
			props: { ...baseProps, showPublishing: false, showPromoting: false },
		});

		expect(queryByTestId('project-review-publishing-toggle')).not.toBeInTheDocument();
		expect(queryByTestId('project-review-promoting-toggle')).not.toBeInTheDocument();
	});

	it('hides the promotion row when environments are not configured', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { ...baseProps, showPromoting: false },
		});

		expect(getByTestId('project-review-publishing-toggle')).toBeInTheDocument();
		expect(queryByTestId('project-review-promoting-toggle')).not.toBeInTheDocument();
	});

	it('renders an editable switch without the required badge', () => {
		const { getByTestId, queryByTestId } = renderComponent({ props: baseProps });

		expect(getByTestId('project-review-publishing-toggle')).toBeEnabled();
		expect(queryByTestId('workflow-review-publishing-required-badge')).not.toBeInTheDocument();
	});

	it('locks an inherited row on, with the required badge', () => {
		const { getByTestId, getByText } = renderComponent({
			props: { ...baseProps, publishing: false, publishingLocked: true },
		});

		expect(getByTestId('project-review-publishing-toggle')).toBeDisabled();
		expect(getByTestId('workflow-review-publishing-required-badge')).toBeInTheDocument();
		expect(getByText('Required')).toBeInTheDocument();
		expect(
			getByText("This is set by your instance admin, it can't be changed."),
		).toBeInTheDocument();
	});
});
