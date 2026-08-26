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
		publishedVersionId: null,
		baselineVersion: null,
		...overrides,
	};
}

const requester = {
	id: 'requester-1',
	email: 'requester@example.com',
	firstName: 'Rita',
	lastName: 'Requester',
};

const laterAuthor = {
	id: 'author-2',
	email: 'author@example.com',
	firstName: 'Ada',
	lastName: 'Author',
};

function makeDetail(
	overrides: Partial<WorkflowReviewRequestDetail> = {},
): WorkflowReviewRequestDetail {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'Update Payment Handler',
		requester,
		// The backend always carries the requester in `authors` too.
		authors: [{ ...requester }, laterAuthor],
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
		viewerCanComment: true,
		...overrides,
	};
}

describe('WorkflowReviewDetailMetadata', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('renders the status, people, and workflows', () => {
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

	it('lists requested by, other authors, and reviewers in that order', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail() },
		});

		expect(getByTestId('workflow-review-detail-people-card').textContent).toMatch(
			/^Requested by.*Rita Requester.*Other authors.*Ada Author.*Reviewers.*Riley Reviewer/s,
		);
	});

	it('excludes the requester from other authors by id, not object identity', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail() },
		});

		expect(getByTestId('workflow-review-detail-other-authors')).not.toHaveTextContent(
			'Rita Requester',
		);
	});

	it('hides other authors when the requester is the only author', () => {
		const { queryByTestId } = renderComponent({
			props: { review: makeDetail({ authors: [{ ...requester }] }) },
		});

		expect(queryByTestId('workflow-review-detail-other-authors')).not.toBeInTheDocument();
	});

	it('falls back to a deleted-user message when the requester no longer exists', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ requester: null, authors: [laterAuthor] }) },
		});

		expect(getByTestId('workflow-review-detail-requester-deleted')).toHaveTextContent(
			'Deleted user',
		);
		expect(getByTestId('workflow-review-detail-other-authors')).toHaveTextContent('Ada Author');
	});

	it('pairs the closed state with an approval decision', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ state: 'closed', decision: 'approved' }) },
		});

		expect(getByTestId('workflow-review-detail-status-card')).toHaveTextContent(
			'Closed • Approved',
		);
	});

	// Nobody is waiting on a closed review, so an undecided close reads "No decision".
	it('pairs the closed state with a pending decision as No decision', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ state: 'closed', decision: 'pending' }) },
		});

		expect(getByTestId('workflow-review-detail-status-card')).toHaveTextContent(
			'Closed • No decision',
		);
	});

	it('pairs the closed state with a changes-requested decision', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ state: 'closed', decision: 'changes_requested' }) },
		});

		expect(getByTestId('workflow-review-detail-status-card')).toHaveTextContent(
			'Closed • Changes requested',
		);
	});

	it('pairs the open state with a changes-requested decision', () => {
		const { getByTestId } = renderComponent({
			props: { review: makeDetail({ state: 'open', decision: 'changes_requested' }) },
		});

		expect(getByTestId('workflow-review-detail-status-card')).toHaveTextContent(
			'Open • Changes requested',
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
