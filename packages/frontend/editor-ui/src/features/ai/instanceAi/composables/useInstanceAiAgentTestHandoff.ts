import type { PendingComposerDraft } from './useInstanceAiHandoff';

/** The builder hands preview sessions to its embedded panel; only the shared params type remains. */
export interface AgentTestHandoffParams {
	projectId: string;
	agentId: string;
	threadId: string;
	agentName?: string;
	agentIcon?: string;
	sessionTitle?: string;
	executionId?: string;
	/** More sessions of the same agent for the Assistant to read. */
	threadIds?: string[];
	initialDraft?: PendingComposerDraft;
	/** Runs only after the assistant composer accepts the hand-off. */
	onAccepted?: () => void;
}
