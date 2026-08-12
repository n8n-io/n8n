import type { InstanceAiAttachment, InstanceAiThreadSource } from '@n8n/api-types';

/**
 * Contract for opening the Instance AI floating panel with a seeded message.
 * Shared by the proactive offer bubble and any future trigger that should open
 * the panel without navigating to `/assistant`.
 */
export type ProactiveOffer = {
	/** Dedupe / dismissal key, e.g. `execution:4711`. */
	key: string;
	/** Bubble headline. */
	title: string;
	/** Optional secondary line under the title. */
	detail?: string;
	/** Full seeded text including any `<context>` block. */
	message: string;
	/** Resolved by the caller when known; otherwise the panel falls back to personal project. */
	projectId?: string;
	attachments?: InstanceAiAttachment[];
	source: InstanceAiThreadSource;
};
