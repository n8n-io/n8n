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

/**
 * Thread metadata key recording the build run a promote kicked off. The
 * desktop client polls `POST /promote-thread` while the build runs; this key
 * lets the endpoint return the in-flight run instead of starting another.
 */
export const PROMOTE_RUN_ID_KEY = 'desktopAssistantPromoteRunId';

/** Reverse pointer written on the workflow's meta JSON column. */
export const PROMOTED_FROM_THREAD_ID_KEY = 'promotedFromThreadId';

/** Thread metadata key recording which surface created the thread. */
export const THREAD_SOURCE_METADATA_KEY = 'source';

/**
 * Metadata value marking a thread as desktop-assistant-originated. Threads
 * carrying this source are hidden from the chat UI's thread list; everything
 * else (promote, metadata reads/updates) treats them like any other thread.
 */
export const DESKTOP_ASSISTANT_THREAD_SOURCE = 'desktop-assistant';
