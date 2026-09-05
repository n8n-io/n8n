import type { WorkflowReviewActivityEntry, WorkflowReviewActivityMessage } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';

import WorkflowReviewActivityComment from './WorkflowReviewActivityComment.vue';

const renderComponent = createComponentRenderer(WorkflowReviewActivityComment);

function makeMessage(
	overrides: Partial<WorkflowReviewActivityMessage> = {},
): WorkflowReviewActivityMessage {
	return {
		id: 'msg-1',
		body: 'Looks good to me',
		createdBy: {
			id: 'user-1',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
		},
		createdAt: '2024-01-01T10:00:00.000Z',
		updatedAt: null,
		deletedAt: null,
		...overrides,
	};
}

function makeEntry(
	messages: WorkflowReviewActivityMessage[] = [makeMessage()],
): Extract<WorkflowReviewActivityEntry, { type: 'comment.created' }> {
	return {
		id: '1',
		type: 'comment.created',
		typeVersion: 1,
		data: null,
		createdBy: messages[0]?.createdBy ?? null,
		createdAt: '2024-01-01T10:00:00.000Z',
		messages,
	};
}

describe('WorkflowReviewActivityComment', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('renders the body, the author name and a machine-readable timestamp', () => {
		const { getByTestId } = renderComponent({ props: { entry: makeEntry() } });

		expect(getByTestId('workflow-review-activity-comment-body')).toHaveTextContent(
			'Looks good to me',
		);
		expect(getByTestId('workflow-review-activity-comment-author')).toHaveTextContent(
			'Ada Lovelace',
		);
		expect(getByTestId('workflow-review-activity-comment-time')).toHaveAttribute(
			'datetime',
			'2024-01-01T10:00:00.000Z',
		);
	});

	it('falls back to the email when the author has no name', () => {
		const { getByTestId } = renderComponent({
			props: {
				entry: makeEntry([
					makeMessage({
						createdBy: { id: 'user-1', email: 'ada@example.com', firstName: null, lastName: null },
					}),
				]),
			},
		});

		expect(getByTestId('workflow-review-activity-comment-author')).toHaveTextContent(
			'ada@example.com',
		);
	});

	it('names a deleted author and shows a person silhouette where their avatar would be', () => {
		const { getByTestId } = renderComponent({
			props: { entry: makeEntry([makeMessage({ createdBy: null })]) },
		});

		expect(getByTestId('workflow-review-activity-comment-author')).toHaveTextContent(
			'Deleted user',
		);
		expect(getByTestId('workflow-review-activity-deleted-actor')).toBeInTheDocument();
	});

	// Keys on `deletedAt`, not on a null body: a null body from any other writer
	// must not read as a tombstone.
	it('shows that a comment was deleted instead of its text', () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				entry: makeEntry([makeMessage({ body: null, deletedAt: '2024-01-02T10:00:00.000Z' })]),
			},
		});

		expect(getByTestId('workflow-review-activity-comment-deleted')).toHaveTextContent(
			'This comment was deleted.',
		);
		expect(queryByTestId('workflow-review-activity-comment-body')).not.toBeInTheDocument();
	});
});
