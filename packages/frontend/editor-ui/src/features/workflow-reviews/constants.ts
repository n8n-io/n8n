export const WORKFLOW_REVIEW_REQUESTS_VIEW = 'WorkflowReviewRequestsView';

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
