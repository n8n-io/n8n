import type { WorkflowReviewRequestDetail } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';

import { useReviewActivityStore } from '../reviewActivity.store';
import WorkflowReviewDetailTabs from './WorkflowReviewDetailTabs.vue';

/**
 * The real decision popover is kept, so this pins the two facts the draft note depends on:
 * it lives in the store, and its trigger sits outside the tab panel that unmounts.
 * Reka UI popovers do not open in jsdom, so its primitives render inline instead.
 */
const rekaStubs = {
	PopoverRoot: { template: '<div><slot /></div>' },
	PopoverTrigger: { template: '<div><slot /></div>' },
	PopoverPortal: { template: '<div><slot /></div>' },
	PopoverContent: { template: '<div><slot /></div>' },
};

const childStubs = {
	WorkflowReviewActivityFeed: { template: '<div><slot name="header" /></div>' },
	WorkflowReviewChangesSection: { template: '<div />' },
	WorkflowReviewCommentComposer: { template: '<div />' },
	WorkflowReviewDetailMetadata: { template: '<aside />' },
};

const renderComponent = createComponentRenderer(WorkflowReviewDetailTabs, {
	global: { stubs: { ...rekaStubs, ...childStubs } },
});

const review: WorkflowReviewRequestDetail = {
	id: 'req-1',
	projectId: 'proj-1',
	title: 'Needs review',
	requester: null,
	authors: [],
	reviewers: [],
	decision: 'pending',
	state: 'open',
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	description: null,
	workflows: [],
	viewerCanDecide: true,
	viewerDecisionIneligibilityReason: null,
	viewerCanComment: true,
};

describe('WorkflowReviewDetailTabs decision note', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('keeps a half-written decision note across a tab switch', async () => {
		const { getByTestId, rerender } = renderComponent({
			props: { review, tab: 'activity', deciding: false },
		});

		await userEvent.type(getByTestId('workflow-review-decision-note'), 'Half a thought');

		await rerender({ tab: 'changes' });
		await rerender({ tab: 'activity' });

		expect(getByTestId('workflow-review-decision-note')).toHaveValue('Half a thought');
	});

	// The two facts that make the note survive: it is typed into the store, and the popover
	// sits outside the panel the tab switch unmounts. Asserted separately because either one
	// alone still reads back the note above.
	it('holds the note in the store rather than in the popover', async () => {
		const { getByTestId } = renderComponent({
			props: { review, tab: 'activity', deciding: false },
		});

		await userEvent.type(getByTestId('workflow-review-decision-note'), 'Half a thought');

		expect(useReviewActivityStore().decisionNote).toBe('Half a thought');
	});

	it('keeps the decision popover out of the tab panel', () => {
		const { getByTestId } = renderComponent({
			props: { review, tab: 'activity', deciding: false },
		});

		expect(getByTestId('workflow-review-activity-panel')).not.toContainElement(
			getByTestId('workflow-review-decision-note'),
		);
	});
});
