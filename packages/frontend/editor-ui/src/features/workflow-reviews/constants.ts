import type { ComputedRef, InjectionKey } from 'vue';

export const WORKFLOW_REVIEW_REQUESTS_VIEW = 'WorkflowReviewRequestsView';

/** What a feed entry may say about a linked workflow: its live name and its pinned version. */
export type ReviewLinkedWorkflowContext = {
	workflowName: string;
	pinnedVersionId: string | null;
	/** The user-given version name, e.g. "Release candidate"; null when never named or pruned. */
	pinnedVersionName: string | null;
};

/**
 * The review's linked workflows, keyed by workflow id. Provided by the detail surface, read
 * by feed entries that mention a workflow. Resolved at read time on purpose: feed payloads
 * are immutable and never snapshot names, so a rename shows up everywhere at once. A workflow
 * deleted since the entry was written has no row here; the entry copy degrades.
 */
export const ReviewLinkedWorkflowsKey: InjectionKey<
	ComputedRef<Map<string, ReviewLinkedWorkflowContext>>
> = Symbol('reviewLinkedWorkflows');

/**
 * Routing contract for the review inbox.
 *
 * Path: /workflow-review-requests/:reviewRequestId?
 *   - `:reviewRequestId` is the open review (deep-linkable). Absent = inbox
 *     with nothing selected. Selection always navigates via router.replace.
 *
 * Query params hold filter state; adding a filter must not require a routing
 * change — reserve the key here, hydrate it in the view, and write it with
 * router.replace({ query }) preserving params.
 *   - `state`: 'open' | 'closed'. Default 'open' is omitted from the URL.
 *   - `tab`: 'activity' | 'changes' — detail-pane tab. Default 'activity' is
 *     omitted from the URL.
 *   - Reserved for later filters: `q`, `projectId`, `author`, `reviewer`.
 */
export const REVIEW_INBOX_QUERY_PARAM = { state: 'state', tab: 'tab' } as const;
