/**
 * Reserved tag name used as the marker for desktop-assistant-promoted
 * workflows. The tag is created on first use via {@link TagRepository}
 * and is applied through the existing `workflow-tag-mapping` table.
 *
 * The tag is the source of truth for "is this a desktop-assistant
 * workflow"; idempotency for `POST /desktop-assistant/promote-thread`
 * keys on Instance AI thread metadata (`promotedWorkflowId`), not on
 * the tag, so a user removing the tag in the canvas does not cause a
 * duplicate promote.
 */
export const DESKTOP_ASSISTANT_TAG = 'desktop-assistant';

/** Thread metadata key set after a successful promote. */
export const PROMOTED_WORKFLOW_ID_KEY = 'promotedWorkflowId';

/** Reverse pointer written on the workflow's meta JSON column. */
export const PROMOTED_FROM_THREAD_ID_KEY = 'promotedFromThreadId';
