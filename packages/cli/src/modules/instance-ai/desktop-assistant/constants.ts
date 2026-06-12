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
export { PROMOTE_RUN_ID_KEY } from '@n8n/instance-ai';

/** Reverse pointer written on the workflow's meta JSON column. */
export const PROMOTED_FROM_THREAD_ID_KEY = 'promotedFromThreadId';

/** Thread metadata key recording which surface created the thread. */
export const THREAD_SOURCE_METADATA_KEY = 'source';

/**
 * Metadata value marking a thread as desktop-assistant task backing state
 * (one-shot tasks, promote, edit). Threads carrying this source are hidden from
 * the web UI's thread list; everything else (promote, metadata reads/updates)
 * treats them like any other thread.
 */
export const DESKTOP_ASSISTANT_THREAD_SOURCE = 'desktop-assistant';

/**
 * Metadata value marking a thread started from the desktop app's Chat tab.
 * Unlike {@link DESKTOP_ASSISTANT_THREAD_SOURCE}, these are real conversations
 * and stay VISIBLE in the web UI thread list, so the desktop app can deep-link
 * to a specific thread (e.g. to finish a credential setup the chat surface can't
 * render inline).
 */
export const DESKTOP_ASSISTANT_CHAT_THREAD_SOURCE = 'desktop-assistant-chat';

/** Node types that execute on the user's device via a Device Connection credential. */
export const COMPUTER_USE_NODE_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.computerUse',
	'@n8n/n8n-nodes-langchain.toolComputerUse',
]);

/** Credential type the Computer Use nodes require. */
export const DEVICE_CONNECTION_CREDENTIAL_TYPE = 'deviceConnectionApi';
