import type { DesktopAssistantDescriptionPart } from './desktop-assistant-task-detail-response.dto';

export const desktopAssistantTaskPlanTriggerKinds = ['schedule', 'webhook', 'poll'] as const;

/** What would start the planned task: a schedule, an incoming event, or
 *  watching a service for changes. */
export type DesktopAssistantTaskPlanTriggerKind =
	(typeof desktopAssistantTaskPlanTriggerKinds)[number];

/**
 * Plan the one-shot agent proposes — instead of executing — when a task
 * request implies a non-manual trigger. The user reviews and tweaks the plan
 * in the desktop assistant's draft view, then promotes the thread with the
 * configured parts to build the workflow.
 *
 * Clients read the normalized plan (param ids assigned, options de-duplicated)
 * from the `propose-task-plan` tool-result event on the thread event stream;
 * the raw tool args are unnormalized. The server also persists the plan on
 * thread metadata for recovery, but the promote request's configured parts are
 * the source of truth for what gets built.
 */
export interface DesktopAssistantTaskPlan {
	/** Short human label for the task (3–8 words), suitable as a workflow name. Plain text, no emoji. */
	title: string;
	/** Single emoji that captures the task; becomes the saved workflow's icon. */
	icon?: string;
	/** Segmented one-sentence description of the planned task; same shape as the task detail view. */
	parts: DesktopAssistantDescriptionPart[];
	trigger: DesktopAssistantTaskPlanTriggerKind;
	/** n8n credential type names the task will need (e.g. "gmailOAuth2"); empty when none. */
	connectionsNeeded: string[];
	/** Minutes of manual work one run of the task saves, when estimable. */
	estimatedMinutesSaved?: number;
}
