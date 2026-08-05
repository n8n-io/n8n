import type {
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestWorkflowDetail,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';

import WorkflowReviewDetailMetadata from './WorkflowReviewDetailMetadata.vue';

const renderComponent = createComponentRenderer(WorkflowReviewDetailMetadata);

function makeWorkflowDetail(
	overrides: Partial<WorkflowReviewRequestWorkflowDetail> = {},
): WorkflowReviewRequestWorkflowDetail {
	return {
		workflowId: 'wf-1',
		workflowName: 'Payment Handler',
		workflowVersionId: 'version-1',
		pinnedVersion: null,
		baselineVersion: null,
		...overrides,
	};
}

function makeDetail(
	overrides: Partial<WorkflowReviewRequestDetail> = {},
): WorkflowReviewRequestDetail {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'Update Payment Handler',
		workflowName: 'Payment Handler',
		workflowVersionId: 'version-1',
		requester: null,
		reviewers: [
			{
				id: 'reviewer-1',
				email: 'reviewer@example.com',
				firstName: 'Riley',
				lastName: 'Reviewer',
			},
		],
		decision: 'pending',
		state: 'open',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		description: null,
		workflows: [makeWorkflowDetail()],
		viewerCanDecide: true,
		viewerDecisionIneligibilityReason: null,
		...overrides,
	};
}

describe('WorkflowReviewDetailMetadata', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('renders the status, reviewers, and workflows', () => {
		const { getByTestId, getByText, queryByText } = renderComponent({
			props: { review: makeDetail() },
		});

		expect(getByTestId('workflow-review-detail-status-card')).toHaveTextContent(
			'Open · Waiting for review',
		);
		expect(getByText('Riley Reviewer')).toBeInTheDocument();
		expect(queryByText('reviewer@example.com')).not.toBeInTheDocument();
		expect(getByText('Payment Handler')).toBeInTheDocument();
	});

	it('shows a single label for closed reviews', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ state: 'closed', decision: 'approved' }) },
		});

		expect(getByTestId('workflow-review-detail-status-card')).toHaveTextContent('Approved');
		expect(getByTestId('workflow-review-detail-status-card')).not.toHaveTextContent('Open ·');
	});

	it('emits the selected workflow', () => {
		const { getByTestId, emitted } = renderComponent({
			props: { review: makeDetail() },
		});

		getByTestId('workflow-review-detail-workflow-link').click();

		expect(emitted('select-workflow')).toEqual([['wf-1']]);
	});

	it('renders clean fallbacks for missing reviewers and workflows', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ reviewers: [], workflows: [] }) },
		});

		expect(getByTestId('workflow-review-detail-no-reviewers')).toHaveTextContent(
			'No reviewers notified.',
		);
		expect(getByTestId('workflow-review-detail-no-workflows')).toHaveTextContent(
			'No workflows available.',
		);
	});
});
