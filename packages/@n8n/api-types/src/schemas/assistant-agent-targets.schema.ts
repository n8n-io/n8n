import { z } from 'zod';

/** An agent that an Assistant thread builds or edits. */
export const assistantAgentTargetSchema = z.object({
	agentId: z.string().min(1).max(64),
	projectId: z.string().min(1).max(64),
	name: z.string().max(255).optional(),
});
export type AssistantAgentTarget = z.infer<typeof assistantAgentTargetSchema>;

/** The agent test chat session that the user handed off to the Assistant. */
export const assistantAgentPreviewSessionSchema = z.object({
	agentId: z.string().min(1),
	threadId: z.string().min(1),
});
export type AssistantAgentPreviewSession = z.infer<typeof assistantAgentPreviewSessionSchema>;

/**
 * The agents of an Assistant agent thread, from its thread metadata. The
 * agent previews read this state.
 */
export interface AssistantAgentTargetsState {
	/** The agent that the Assistant edits in the next turn. */
	bound: AssistantAgentTarget | null;
	/** A new agent that the thread opened, with no saved agent yet. */
	pending: Pick<AssistantAgentTarget, 'agentId' | 'projectId'> | null;
	/** Each agent that the thread addressed. */
	targets: AssistantAgentTarget[];
	previewSession: AssistantAgentPreviewSession | null;
}

export interface AssistantAgentTargetsResponse {
	targets: AssistantAgentTargetsState;
}
