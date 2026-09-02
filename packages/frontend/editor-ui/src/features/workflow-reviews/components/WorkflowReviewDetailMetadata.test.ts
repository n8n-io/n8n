import type {
	WorkflowReviewRequestDetail,
	WorkflowReviewRequestWorkflowDetail,
} from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory, createRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';

import WorkflowReviewDetailMetadata from './WorkflowReviewDetailMetadata.vue';

const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{
			path: '/workflow/:workflowId',
			name: VIEWS.WORKFLOW,
			component: { template: '<div />' },
		},
	],
});

const renderComponent = createComponentRenderer(WorkflowReviewDetailMetadata, {
	global: { plugins: [router], stubs: { RouterLink: false } },
});

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
			'Open • Waiting for review',
		);
		expect(getByText('Riley Reviewer')).toBeInTheDocument();
		expect(queryByText('reviewer@example.com')).not.toBeInTheDocument();
		expect(getByText('Payment Handler')).toBeInTheDocument();
	});

	it('pairs the closed state with an approval decision', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ state: 'closed', decision: 'approved' }) },
		});

		expect(getByTestId('workflow-review-detail-status-card')).toHaveTextContent(
			'Closed • Approved',
		);
	});

	it('pairs the closed state with a pending decision', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ state: 'closed', decision: 'pending' }) },
		});

		expect(getByTestId('workflow-review-detail-status-card')).toHaveTextContent(
			'Closed • Waiting for review',
		);
	});

	it('links each workflow to the editor', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail() },
		});

		expect(getByTestId('workflow-review-detail-workflow-link')).toHaveAttribute(
			'href',
			'/workflow/wf-1',
		);
	});

	it('hides the changes card when there are no workflows', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: { review: makeDetail({ reviewers: [], workflows: [] }) },
		});

		expect(getByTestId('workflow-review-detail-no-reviewers')).toHaveTextContent(
			'No reviewers assigned.',
		);
		expect(queryByTestId('workflow-review-detail-changes-card')).not.toBeInTheDocument();
	});
});
