import type { WorkflowReviewStatus } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory, createRouter } from 'vue-router';

import { createComponentRenderer } from '@/__tests__/render';
import { WORKFLOW_REVIEW_REQUESTS_VIEW } from '../constants';
import WorkflowReviewStatusBadge from './WorkflowReviewStatusBadge.vue';

const cardStatus = (
	overrides: Partial<WorkflowReviewStatus['summary']> = {},
	viewerCanOpen = true,
): WorkflowReviewStatus => ({
	summary: {
		id: 'req-1',
		state: 'open',
		decision: 'pending',
		workflowVersionId: 'ver-1',
		createdAt: '2026-07-20T10:00:00.000Z',
		updatedAt: '2026-07-20T10:00:00.000Z',
		...overrides,
	},
	viewerCanOpen,
});

/** A real router, so the link's href is asserted rather than stubbed away. */
const router = createRouter({
	history: createMemoryHistory(),
	routes: [
		{ path: '/', name: 'home', component: { template: '<div />' } },
		{
			path: '/workflow-review-requests/:reviewRequestId?',
			name: WORKFLOW_REVIEW_REQUESTS_VIEW,
			component: { template: '<div />' },
		},
	],
});

const renderComponent = createComponentRenderer(WorkflowReviewStatusBadge, {
	// Unstub the default RouterLink stub: this test asserts the real href.
	global: { plugins: [router], stubs: { RouterLink: false } },
});

const renderBadge = (status: WorkflowReviewStatus) =>
	renderComponent({ pinia: createTestingPinia(), props: { status } });

describe('WorkflowReviewStatusBadge', () => {
	beforeAll(async () => {
		await router.push('/');
		await router.isReady();
	});

	it.each([
		{ decision: 'pending' as const, label: 'Waiting for review' },
		{ decision: 'changes_requested' as const, label: 'Changes requested' },
	])('labels an open $decision review as "$label"', ({ decision, label }) => {
		const { getByTestId } = renderBadge(cardStatus({ decision }));

		expect(getByTestId('workflow-review-status-badge')).toHaveTextContent(label);
		expect(getByTestId('workflow-review-request-status-dot')).toBeInTheDocument();
	});

	it('links an openable review to its inbox detail', () => {
		const { getByTestId } = renderBadge(cardStatus());

		const badge = getByTestId('workflow-review-status-badge');
		expect(badge.tagName).toBe('A');
		expect(badge).toHaveAttribute('href', '/workflow-review-requests/req-1');
	});

	it('renders no link when the viewer may not open the review', () => {
		const { getByTestId, queryByRole } = renderBadge(cardStatus({}, false));

		const badge = getByTestId('workflow-review-status-badge');
		expect(badge.tagName).not.toBe('A');
		expect(queryByRole('link')).not.toBeInTheDocument();
		// The badge itself still shows the status
		expect(badge).toHaveTextContent('Waiting for review');
	});
});
