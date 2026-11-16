import { z } from 'zod';

/** The resource types that the Assistant shows as artifacts and preview tabs. */
export const assistantArtifactTypeSchema = z.enum([
	'workflow',
	'agent',
	'data-table',
	'skill',
	'app',
]);
export type AssistantArtifactType = z.infer<typeof assistantArtifactTypeSchema>;

/** Identifies a resource that a thread tab shows. */
export const assistantThreadTabRefSchema = z.object({
	type: assistantArtifactTypeSchema,
	id: z.string().min(1).max(64),
});
export type AssistantThreadTabRef = z.infer<typeof assistantThreadTabRefSchema>;

/** One open tab. The name lets the tab render before the resource details load. */
export const assistantThreadTabSchema = assistantThreadTabRefSchema.extend({
	name: z.string().max(255),
	projectId: z.string().min(1).max(64).optional(),
});
export type AssistantThreadTab = z.infer<typeof assistantThreadTabSchema>;

/** Most open tabs a stored thread tabs state holds. */
export const MAX_ASSISTANT_THREAD_OPEN_TABS = 100;
/** Most closed artifacts a stored thread tabs state remembers. */
export const MAX_ASSISTANT_THREAD_CLOSED_TABS = 500;

/**
 * The tabs a user has open in a thread. `tabs` is in display order.
 * `closedTabs` holds the artifacts the user closed, so they do not reopen when
 * the thread loads again. Both Assistant runtimes use this shape.
 */
export const assistantThreadTabsStateSchema = z.object({
	tabs: z.array(assistantThreadTabSchema).max(MAX_ASSISTANT_THREAD_OPEN_TABS),
	closedTabs: z.array(assistantThreadTabRefSchema).max(MAX_ASSISTANT_THREAD_CLOSED_TABS),
	activeTab: assistantThreadTabRefSchema.nullable(),
	/**
	 * Whether the preview panel is open. Without it, the active tab does not
	 * tell if the user can see that tab. Optional, so a state saved before this
	 * field existed stays valid.
	 */
	previewOpen: z.boolean().optional(),
});
export type AssistantThreadTabsState = z.infer<typeof assistantThreadTabsStateSchema>;

export interface AssistantThreadTabsResponse {
	/**
	 * `null` when no tabs are stored for this thread yet. The server stores them
	 * when the agent changes an artifact, and the client when the user changes a tab.
	 */
	state: AssistantThreadTabsState | null;
}
