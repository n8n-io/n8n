import type { InstanceAiAttachment, InstanceAiThreadSource } from '@n8n/api-types';

/** A canvas node the user pinned as floating-panel composer context. */
export type InstanceAiContextNode = {
	nodeId: string;
	nodeName: string;
	nodeType: string;
};

/**
 * Contract for opening the Instance AI floating panel with a prefilled draft.
 * Shared by the proactive offer bubble and any future trigger that should open
 * the panel without navigating to `/assistant`. The user still has to send.
 */
export type ProactiveOffer = {
	/** Dedupe / dismissal key, e.g. `execution:4711`. */
	key: string;
	/** Bubble headline. */
	title: string;
	/** Optional secondary line under the title. */
	detail?: string;
	/** Label the launcher expands into while the offer stands. Defaults to a generic nudge. */
	cta?: string;
	/** Full draft text including any `<context>` block (stripped for the composer). */
	message: string;
	/** Resolved by the caller when known; otherwise the panel falls back to personal project. */
	projectId?: string;
	attachments?: InstanceAiAttachment[];
	source: InstanceAiThreadSource;
};
