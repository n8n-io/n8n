import type { WorkflowReviewActivityEntry } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { computed, nextTick } from 'vue';

import { ReviewLinkedWorkflowsKey, type ReviewLinkedWorkflowContext } from '../constants';
import { useReviewActivityStore } from '../reviewActivity.store';
import WorkflowReviewActivityFeed from './WorkflowReviewActivityFeed.vue';

/**
 * The scroll anchoring arithmetic is deliberately untested: jsdom has no layout, so
 * `getBoundingClientRect()` is all zeroes and a test would have to stub those getters and then
 * re-compute the production arithmetic from its own constants. Do not backfill a fake one.
 * Which of the two behaviours a changed list picks — hold the reading position, or jump to the
 * newest entry — is testable, and is what the reload cases below assert.
 */
const observer = vi.hoisted(() => ({
	observe: vi.fn(),
	onIntersect: () => {},
}));

vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: (options: { onIntersect: () => void }) => {
		observer.onIntersect = options.onIntersect;
		return { observe: observer.observe, disconnect: vi.fn(), observer: { value: null } };
	},
}));

const renderComponent = createComponentRenderer(WorkflowReviewActivityFeed);

type CommentEntry = Extract<WorkflowReviewActivityEntry, { type: 'comment.created' }>;

function makeComment(overrides: Partial<CommentEntry> = {}): WorkflowReviewActivityEntry {
	return {
		id: '1',
		type: 'comment.created',
		typeVersion: 1,
		data: null,
		createdBy: null,
		createdAt: '2024-01-01T00:00:00.000Z',
		messages: [
			{
				id: 'msg-1',
				body: 'Looks good',
				createdBy: null,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: null,
				deletedAt: null,
			},
		],
		...overrides,
	};
}

/** Every non-comment entry shares these fields; `type` and `data` are per row. */
const systemEntry = {
	id: '1',
	typeVersion: 1,
	createdBy: null,
	createdAt: '2024-01-01T00:00:00.000Z',
};

describe('WorkflowReviewActivityFeed', () => {
	let store: ReturnType<typeof mockedStore<typeof useReviewActivityStore>>;

	beforeEach(() => {
		createTestingPinia();
		observer.observe.mockReset();
		store = mockedStore(useReviewActivityStore);
		store.currentReviewId = 'req-1';
		store.entries = [];
		store.loading = false;
		store.loadingMore = false;
		store.hasMore = false;
		store.nextCursor = null;
		store.error = null;
	});

	it('shows one entry per activity in the feed', async () => {
		store.entries = Array.from({ length: 3 }, (_, index) => makeComment({ id: String(index) }));

		const { queryAllByTestId } = renderComponent();
		await nextTick();

		expect(queryAllByTestId('workflow-review-activity-entry')).toHaveLength(3);
	});

	it('shows a loading state while the first page is in flight', () => {
		store.loading = true;

		const { container, queryByTestId } = renderComponent();

		expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
		expect(queryByTestId('workflow-review-activity-empty')).not.toBeInTheDocument();
	});

	it('shows an error row when the first page failed', () => {
		store.error = new Error('boom');

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('workflow-review-activity-error')).toHaveTextContent(
			'Could not load activity',
		);
		expect(queryByTestId('workflow-review-activity-empty')).not.toBeInTheDocument();
	});

	it('reloads the feed when the viewer retries after a failure', () => {
		store.error = new Error('boom');

		const { getByTestId } = renderComponent();
		getByTestId('workflow-review-activity-retry').click();

		// `loadMore` is a no-op here: with no cursor it returns before requesting anything
		expect(store.fetchFeed).toHaveBeenCalledWith('req-1');
	});

	it('still reaches the earlier activity after posting onto a feed that failed to load', () => {
		store.error = new Error('boom');
		store.entries = [makeComment()];

		const { getByTestId } = renderComponent();
		getByTestId('workflow-review-activity-load-more-retry').click();

		expect(store.fetchFeed).toHaveBeenCalledWith('req-1');
		expect(store.loadMore).not.toHaveBeenCalled();
	});

	it('shows progress while refetching a feed that already has entries', async () => {
		store.entries = [makeComment()];
		store.loading = true;

		const { container } = renderComponent();
		await nextTick();

		expect(container.querySelector('.n8n-loading')).toBeInTheDocument();
	});

	it('keeps a loaded feed and offers a retry when load-more failed', async () => {
		store.entries = [makeComment()];
		store.hasMore = true;
		// A load-more failure always has a cursor to resume from.
		store.nextCursor = 'cursor-1';
		store.error = new Error('boom');

		const { getAllByTestId, getByTestId, queryByTestId } = renderComponent();
		await nextTick();

		expect(getAllByTestId('workflow-review-activity-entry')).toHaveLength(1);
		expect(queryByTestId('workflow-review-activity-error')).not.toBeInTheDocument();

		getByTestId('workflow-review-activity-load-more-retry').click();

		expect(store.loadMore).toHaveBeenCalled();

		// Paging must survive a failure: the sentinel is withheld while the error shows,
		// so it has to come back — and be observed again — once the error clears.
		observer.observe.mockClear();
		store.error = null;
		await nextTick();
		await nextTick();

		expect(observer.observe).toHaveBeenCalledWith(
			getByTestId('workflow-review-activity-load-more-sentinel'),
		);
	});

	it('shows a placeholder for an activity type this frontend does not know', async () => {
		store.entries = [makeComment({ typeVersion: 2 })];

		const { getByTestId } = renderComponent();
		await nextTick();

		expect(getByTestId('workflow-review-activity-unknown')).toHaveTextContent(
			"This activity entry can't be displayed.",
		);
	});

	it('loads older entries when the viewer scrolls to the top of the feed', async () => {
		store.entries = [makeComment()];
		store.hasMore = true;

		const { getByTestId } = renderComponent();
		await nextTick();
		await nextTick();

		expect(observer.observe).toHaveBeenCalledWith(
			getByTestId('workflow-review-activity-load-more-sentinel'),
		);

		observer.onIntersect();

		expect(store.loadMore).toHaveBeenCalledTimes(1);
	});

	it('stops loading once the oldest entry is on screen', async () => {
		store.entries = [makeComment()];
		store.hasMore = false;

		renderComponent();
		await nextTick();
		await nextTick();

		expect(observer.observe).not.toHaveBeenCalled();
	});

	/**
	 * A reload keeps only the entries newer than the page it fetched, so its first entry
	 * differs without anything having been prepended. `scrollHeight` is stubbed because jsdom
	 * has no layout; the assertion is on the feed landing at the bottom, not on any arithmetic.
	 */
	async function reloadFeedAndReturnContainer(getByTestId: (id: string) => HTMLElement) {
		const container = getByTestId('workflow-review-activity-feed');
		Object.defineProperty(container, 'scrollHeight', { value: 500, configurable: true });
		container.scrollTop = 120;

		store.entries = [makeComment({ id: '2' }), makeComment({ id: '3' })];
		await nextTick();

		return container;
	}

	it('shows the entry a decision just added to a feed the viewer had paged back through', async () => {
		store.entries = [makeComment({ id: '1' }), makeComment({ id: '2' })];

		const { getByTestId } = renderComponent();
		await nextTick();

		expect((await reloadFeedAndReturnContainer(getByTestId)).scrollTop).toBe(500);
	});

	// `loadMore` returns early while another page is in flight, leaving behind the anchor it
	// captured — which by the next reload points at an entry no longer on screen.
	it('shows the newest entry after a reload that followed a load-more that never ran', async () => {
		store.entries = [makeComment({ id: '1' }), makeComment({ id: '2' })];
		store.hasMore = true;
		store.loadingMore = true;

		const { getByTestId } = renderComponent();
		await nextTick();
		observer.onIntersect();

		expect((await reloadFeedAndReturnContainer(getByTestId)).scrollTop).toBe(500);
	});

	it('does not request the same older page twice', async () => {
		store.entries = [makeComment()];
		store.hasMore = true;
		store.loadingMore = true;

		renderComponent();
		await nextTick();
		await nextTick();

		expect(observer.observe).not.toHaveBeenCalled();
	});

	describe('review lifecycle entries', () => {
		it.each<[string, WorkflowReviewActivityEntry, { testId: string; text: string; note?: string }]>(
			[
				[
					'the review being submitted',
					{
						...systemEntry,
						type: 'review.opened',
						data: { workflowVersions: [{ workflowId: 'wf-1', workflowVersionId: 'version-1' }] },
					},
					{ testId: 'workflow-review-activity-opened', text: 'Review submitted' },
				],
				[
					'requested changes with the note the reviewer left',
					{
						...systemEntry,
						type: 'review.changes_requested',
						data: {
							workflowVersions: [{ workflowId: 'wf-1', workflowVersionId: 'version-1' }],
							note: 'Please add retries',
						},
					},
					{
						testId: 'workflow-review-activity-changes-requested',
						text: 'Requested changes',
						note: 'Please add retries',
					},
				],
				[
					'an approval with the note the reviewer left',
					{
						...systemEntry,
						type: 'review.approved',
						data: {
							workflowVersions: [{ workflowId: 'wf-1', workflowVersionId: 'version-1' }],
							note: 'Ship it',
						},
					},
					{
						testId: 'workflow-review-activity-approved',
						text: 'Approved submission',
						note: 'Ship it',
					},
				],
				[
					'an approval given without a note',
					{
						...systemEntry,
						type: 'review.approved',
						data: {
							workflowVersions: [{ workflowId: 'wf-1', workflowVersionId: 'version-1' }],
							note: null,
						},
					},
					{ testId: 'workflow-review-activity-approved', text: 'Approved submission' },
				],
				[
					'an approval whose stored payload can no longer be read',
					{ ...systemEntry, type: 'review.approved', data: null },
					{ testId: 'workflow-review-activity-approved', text: 'Approved submission' },
				],
				[
					'the reviewed version being updated',
					{
						...systemEntry,
						type: 'review.version_updated',
						data: {
							workflowId: 'wf-1',
							fromWorkflowVersionId: 'version-1',
							toWorkflowVersionId: 'version-2',
						},
					},
					{
						testId: 'workflow-review-activity-version-updated',
						text: 'New workflow version submitted',
					},
				],
				[
					'a workflow archived by a user',
					{
						...systemEntry,
						type: 'workflow.archived',
						data: { workflowId: 'wf-1', actorKind: 'user' },
					},
					{
						testId: 'workflow-review-activity-workflow-archived',
						text: 'Archived the workflow',
					},
				],
				[
					'a workflow archived by the system',
					{
						...systemEntry,
						type: 'workflow.archived',
						data: { workflowId: 'wf-1', actorKind: 'system' },
					},
					{
						testId: 'workflow-review-activity-workflow-archived',
						text: 'The workflow was archived by the system',
					},
				],
				[
					'a workflow deleted by a user',
					{
						...systemEntry,
						type: 'workflow.deleted',
						data: { workflowId: 'wf-1', actorKind: 'user' },
					},
					{
						testId: 'workflow-review-activity-workflow-deleted',
						text: 'Deleted the workflow',
					},
				],
				[
					'a workflow deleted by the system',
					{
						...systemEntry,
						type: 'workflow.deleted',
						data: { workflowId: 'wf-1', actorKind: 'system' },
					},
					{
						testId: 'workflow-review-activity-workflow-deleted',
						text: 'The workflow was deleted by the system',
					},
				],
				[
					'a workflow moved by a user',
					{
						...systemEntry,
						type: 'workflow.moved',
						data: { workflowId: 'wf-1', actorKind: 'user' },
					},
					{
						testId: 'workflow-review-activity-workflow-moved',
						text: 'Moved the workflow to another project',
					},
				],
				[
					// The workflow name comes from the detail surface; rendered bare without it.
					'a published version of a workflow whose name is not available',
					{
						...systemEntry,
						type: 'workflow.published',
						data: { workflowId: 'wf-1', workflowVersionId: '234df342-5f2b-4e5a-9be6-79ee7bb1c02f' },
					},
					{
						testId: 'workflow-review-activity-workflow-published',
						text: 'Published Version 234df342',
					},
				],
			],
		)('shows %s', async (_label, entry, expected) => {
			store.entries = [entry];

			const { getByTestId, queryByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId(expected.testId)).toHaveTextContent(expected.text);
			if (expected.note) {
				expect(getByTestId('workflow-review-activity-note')).toHaveTextContent(expected.note);
			} else {
				expect(queryByTestId('workflow-review-activity-note')).not.toBeInTheDocument();
			}
		});

		// The only entry whose payload the sentence cannot do without: the close reason *is* the
		// sentence, so there is nothing left to render.
		it('shows a placeholder for a closed review that no longer says why', async () => {
			store.entries = [{ ...systemEntry, type: 'review.closed', data: null }];

			const { getByTestId, queryByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-unknown')).toHaveTextContent(
				"This activity entry can't be displayed.",
			);
			expect(queryByTestId('workflow-review-activity-closed')).not.toBeInTheDocument();
		});

		// Losing the note must not cost the actor and the verb too, which are known from the type.
		it('keeps a change request whose note can no longer be read', async () => {
			store.entries = [{ ...systemEntry, type: 'review.changes_requested', data: null }];

			const { getByTestId, queryByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-changes-requested')).toHaveTextContent(
				'Requested changes',
			);
			expect(queryByTestId('workflow-review-activity-note')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-review-activity-unknown')).not.toBeInTheDocument();
		});

		// Only a downgrade can produce a stored type outside the union; the feed must still
		// hold its place rather than crash or drop it.
		it('shows a placeholder for an entry type no renderer covers', async () => {
			store.entries = [
				{
					...systemEntry,
					type: 'review.something_newer',
					data: null,
				} as unknown as WorkflowReviewActivityEntry,
			];

			const { getByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-unknown')).toBeInTheDocument();
		});

		// The payload names the actor kind, and without it the entry must not guess: it
		// degrades to the actorless sentence rather than crediting the wrong kind of actor.
		it('renders a cause entry whose payload cannot be read as a system sentence', async () => {
			store.entries = [{ ...systemEntry, type: 'workflow.archived', data: null }];

			const { getByTestId, queryByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-workflow-archived')).toHaveTextContent(
				'The workflow was archived by the system',
			);
			expect(queryByTestId('workflow-review-activity-actor')).not.toBeInTheDocument();
		});

		it('names the workflow in cause entries when the detail surface provides its name', async () => {
			store.entries = [
				{
					...systemEntry,
					id: '1',
					type: 'workflow.archived',
					data: { workflowId: 'wf-1', actorKind: 'user' },
				},
				{
					...systemEntry,
					id: '2',
					type: 'workflow.moved',
					data: { workflowId: 'wf-1', actorKind: 'system' },
				},
				{
					...systemEntry,
					id: '3',
					type: 'review.version_updated',
					data: {
						workflowId: 'wf-1',
						fromWorkflowVersionId: 'version-1',
						toWorkflowVersionId: 'version-2',
					},
				},
			];

			const { getByTestId } = renderWithLinkedWorkflows({});
			await nextTick();

			expect(getByTestId('workflow-review-activity-workflow-archived')).toHaveTextContent(
				'Archived Payment handler',
			);
			expect(getByTestId('workflow-review-activity-workflow-moved')).toHaveTextContent(
				'Payment handler was moved to another project by the system',
			);
			expect(getByTestId('workflow-review-activity-version-updated')).toHaveTextContent(
				'New version submitted for Payment handler',
			);
		});

		it('links every mentioned workflow to its canvas', async () => {
			store.entries = [
				{
					...systemEntry,
					id: '1',
					type: 'workflow.archived',
					data: { workflowId: 'wf-1', actorKind: 'user' },
				},
				{
					...systemEntry,
					id: '2',
					type: 'workflow.published',
					data: { workflowId: 'wf-1', workflowVersionId: '234df342-5f2b-4e5a-9be6-79ee7bb1c02f' },
				},
			];

			const { getAllByTestId } = renderComponent({
				global: {
					provide: {
						[ReviewLinkedWorkflowsKey as symbol]: computed(
							() =>
								new Map([
									[
										'wf-1',
										{
											workflowName: 'Payment handler',
											pinnedVersionId: null,
											pinnedVersionName: null,
										},
									],
								]),
						),
					},
				},
			});
			await nextTick();

			const links = getAllByTestId('workflow-review-activity-workflow-link');
			expect(links).toHaveLength(2);
			expect(links[0]).toHaveTextContent('Payment handler');
		});

		it('names the user who archived the workflow, but no one for a system archive', async () => {
			store.entries = [
				{
					...systemEntry,
					id: '1',
					type: 'workflow.archived',
					data: { workflowId: 'wf-1', actorKind: 'user' },
					createdBy: {
						id: 'user-1',
						email: 'ada@example.com',
						firstName: 'Ada',
						lastName: 'Lovelace',
					},
				},
				{
					...systemEntry,
					id: '2',
					type: 'workflow.archived',
					data: { workflowId: 'wf-1', actorKind: 'system' },
				},
			];

			const { getAllByTestId } = renderComponent();
			await nextTick();

			const actors = getAllByTestId('workflow-review-activity-actor');
			expect(actors).toHaveLength(1);
			expect(actors[0]).toHaveTextContent('Ada Lovelace');
			// The system entry fills the avatar column with an icon instead.
			expect(getAllByTestId('workflow-review-activity-system-icon')).toHaveLength(1);
		});

		// `actorKind: 'user'` with a null author is a deleted user, still a person: named as
		// one, and with a person silhouette where their avatar would be — not an empty circle.
		it('names a deleted user as the actor of their archive', async () => {
			store.entries = [
				{
					...systemEntry,
					type: 'workflow.archived',
					data: { workflowId: 'wf-1', actorKind: 'user' },
					createdBy: null,
				},
			];

			const { getByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-actor')).toHaveTextContent('Deleted user');
			expect(getByTestId('workflow-review-activity-deleted-actor')).toBeInTheDocument();
		});

		it('names the publisher on a published entry', async () => {
			store.entries = [
				{
					...systemEntry,
					type: 'workflow.published',
					data: { workflowId: 'wf-1', workflowVersionId: 'version-1' },
					createdBy: {
						id: 'user-1',
						email: 'ada@example.com',
						firstName: 'Ada',
						lastName: 'Lovelace',
					},
				},
			];

			const { getByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-actor')).toHaveTextContent('Ada Lovelace');
		});

		const renderWithLinkedWorkflows = (linked: Partial<ReviewLinkedWorkflowContext>) =>
			renderComponent({
				global: {
					provide: {
						[ReviewLinkedWorkflowsKey as symbol]: computed(
							() =>
								new Map([
									[
										'wf-1',
										{
											workflowName: 'Payment handler',
											pinnedVersionId: null,
											pinnedVersionName: null,
											...linked,
										},
									],
								]),
						),
					},
				},
			});

		it('names the published workflow when the detail surface provides its name', async () => {
			store.entries = [
				{
					...systemEntry,
					type: 'workflow.published',
					data: { workflowId: 'wf-1', workflowVersionId: '234df342-5f2b-4e5a-9be6-79ee7bb1c02f' },
				},
			];

			const { getByTestId } = renderWithLinkedWorkflows({});
			await nextTick();

			expect(getByTestId('workflow-review-activity-workflow-published')).toHaveTextContent(
				'Published Payment handler Version 234df342',
			);
		});

		// the user-given version name wins over the label generated from the id.
		it('shows the published version by its user-given name when it has one', async () => {
			store.entries = [
				{
					...systemEntry,
					type: 'workflow.published',
					data: { workflowId: 'wf-1', workflowVersionId: '234df342-5f2b-4e5a-9be6-79ee7bb1c02f' },
				},
			];

			const { getByTestId } = renderWithLinkedWorkflows({
				pinnedVersionId: '234df342-5f2b-4e5a-9be6-79ee7bb1c02f',
				pinnedVersionName: 'Release candidate',
			});
			await nextTick();

			expect(getByTestId('workflow-review-activity-workflow-published')).toHaveTextContent(
				'Published Payment handler Release candidate',
			);
		});

		it('does not use the pinned version name for a different published version', async () => {
			store.entries = [
				{
					...systemEntry,
					type: 'workflow.published',
					data: { workflowId: 'wf-1', workflowVersionId: '234df342-5f2b-4e5a-9be6-79ee7bb1c02f' },
				},
			];

			const { getByTestId } = renderWithLinkedWorkflows({
				pinnedVersionId: 'a-different-version-id',
				pinnedVersionName: 'Release candidate',
			});
			await nextTick();

			expect(getByTestId('workflow-review-activity-workflow-published')).toHaveTextContent(
				'Published Payment handler Version 234df342',
			);
		});

		it('shows a placeholder for a published entry whose payload cannot be read', async () => {
			store.entries = [{ ...systemEntry, type: 'workflow.published', data: null }];

			const { getByTestId, queryByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-unknown')).toBeInTheDocument();
			expect(queryByTestId('workflow-review-activity-workflow-published')).not.toBeInTheDocument();
		});

		it('names the reviewer who acted', async () => {
			store.entries = [
				{
					...systemEntry,
					type: 'review.approved',
					data: {
						workflowVersions: [{ workflowId: 'wf-1', workflowVersionId: 'version-1' }],
						note: null,
					},
					createdBy: {
						id: 'user-1',
						email: 'ada@example.com',
						firstName: 'Ada',
						lastName: 'Lovelace',
					},
				},
			];

			const { getByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-actor')).toHaveTextContent('Ada Lovelace');
		});

		// The actor is missing for two different reasons, and a deleted approver must not
		// read as a system event.
		it('names a deleted reviewer as the actor of their decision', async () => {
			store.entries = [
				{
					...systemEntry,
					type: 'review.approved',
					data: {
						workflowVersions: [{ workflowId: 'wf-1', workflowVersionId: 'version-1' }],
						note: null,
					},
				},
			];

			const { getByTestId } = renderComponent();
			await nextTick();

			expect(getByTestId('workflow-review-activity-actor')).toHaveTextContent('Deleted user');
		});

		// A lifecycle close concludes the feed, so it renders as a callout, with the
		// entry's (relative, live) timestamp slotted into the middle of the sentence.
		it('renders a lifecycle close as a titled callout without an actor', async () => {
			store.entries = [
				{ ...systemEntry, type: 'review.closed', data: { reason: 'no-reviewable-workflows' } },
			];

			const { getByTestId, queryByTestId } = renderComponent();
			await nextTick();

			const callout = getByTestId('workflow-review-activity-closed');
			expect(callout).toHaveTextContent('Submission closed');
			expect(callout).toHaveTextContent(
				/The review was closed automatically .+ because there is nothing left to review\./,
			);
			expect(queryByTestId('workflow-review-activity-actor')).not.toBeInTheDocument();
		});

		it('renders footer content as one more timeline item after the entries', async () => {
			store.entries = [makeComment({ id: '1' })];

			const { getByTestId } = renderComponent({
				slots: { footer: '<div data-test-id="feed-footer-content" />' },
			});
			await nextTick();

			const footer = getByTestId('feed-footer-content');
			const lastEntry = getByTestId('workflow-review-activity-entry');
			expect(footer.closest('[role="listitem"]')).not.toBeNull();
			expect(lastEntry.compareDocumentPosition(footer)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		});
	});
});
