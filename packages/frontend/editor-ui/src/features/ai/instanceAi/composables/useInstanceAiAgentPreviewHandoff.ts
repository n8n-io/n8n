import type { PendingComposerDraft } from './useInstanceAiHandoff';

/** The builder hands preview sessions to its embedded panel; only the shared params type remains. */
export interface AgentPreviewHandoffParams {
	projectId: string;
	agentId: string;
	threadId: string;
	agentName?: string;
	agentIcon?: string;
	sessionTitle?: string;
	executionId?: string;
	initialDraft?: PendingComposerDraft;
}
