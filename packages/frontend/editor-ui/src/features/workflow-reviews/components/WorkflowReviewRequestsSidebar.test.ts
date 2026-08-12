import type { WorkflowReviewInboxItem } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowReviewRequestsSidebar from './WorkflowReviewRequestsSidebar.vue';

vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({
		observe: vi.fn(),
		disconnect: vi.fn(),
		observer: { value: null },
	}),
}));

const renderComponent = createComponentRenderer(WorkflowReviewRequestsSidebar);

const reviewers = [
	{
		id: 'user-reviewer-1',
		email: 'reviewer1@example.com',
		firstName: 'Rey',
		lastName: 'One',
	},
	{
		id: 'user-reviewer-2',
		email: 'reviewer2@example.com',
		firstName: 'Reba',
		lastName: 'Two',
	},
	{
		id: 'user-reviewer-3',
		email: 'reviewer3@example.com',
		firstName: 'Ron',
		lastName: 'Three',
	},
];

function makeItem(overrides: Partial<WorkflowReviewInboxItem> = {}): WorkflowReviewInboxItem {
	return {
		id: 'req-1',
		projectId: 'proj-1',
		title: 'Needs review',
		workflowName: 'My workflow',
		requester: null,
		authors: [],
		reviewers: reviewers.slice(0, 1),
		decision: 'pending',
		state: 'open',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
		workflowVersionId: overrides.workflowVersionId ?? null,
	};
}

const baseProps = {
	activeTab: 'open' as const,
	openCount: 1,
	closedCount: 0,
	selectedId: null,
	loading: false,
	loadingMore: false,
	hasMore: false,
	isEmpty: false,
};

describe('WorkflowReviewRequestsSidebar', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('does not render an avatar stack for inbox cards', () => {
		const { queryByTestId } = renderComponent({
			props: {
				...baseProps,
				items: [makeItem()],
			},
		});

		expect(queryByTestId('workflow-review-request-users')).not.toBeInTheDocument();
	});

	it.each([
		{
			state: 'open' as const,
			decision: 'pending' as const,
			label: 'Waiting for review',
		},
		{
			state: 'open' as const,
			decision: 'changes_requested' as const,
			label: 'Changes requested',
		},
		{
			state: 'closed' as const,
			decision: 'approved' as const,
			label: 'Approved',
		},
		{
			state: 'closed' as const,
			decision: 'pending' as const,
			label: 'Closed',
		},
	])('maps $state + $decision to the "$label" status indicator', ({ state, decision, label }) => {
		const { getByTestId } = renderComponent({
			props: {
				...baseProps,
				activeTab: state,
				items: [makeItem({ state, decision })],
			},
		});

		expect(getByTestId('workflow-review-request-status-dot')).toHaveAttribute('aria-label', label);
	});
});
