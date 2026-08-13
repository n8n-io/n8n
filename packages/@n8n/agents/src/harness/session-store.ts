import type {
	HarnessAgentContinueTurnState,
	HarnessAgentResumeSessionState,
} from '@ai-sdk/harness/agent';

export interface HarnessSessionScope {
	projectId: string;
	agentId: string;
	threadId: string;
	resourceId: string;
	runtimeIdentity: string;
	adapter: string;
}

export interface HarnessSessionState {
	sessionId: string;
	resumeFrom?: HarnessAgentResumeSessionState;
	continueFrom?: HarnessAgentContinueTurnState;
	resetReason?: 'aborted';
}

/**
 * Exclusive, fenced claim over one persisted harness session row.
 * Implementations must reject writes after this claim loses ownership.
 */
export interface HarnessSessionClaim {
	readonly state: HarnessSessionState;
	readonly fence: { ownershipEpoch: number; claimToken: string };
	/** Aborted when the fenced claim can no longer be renewed. */
	readonly abortSignal: AbortSignal;
	renew(): Promise<void>;
	save(state: HarnessSessionState): Promise<void>;
	clear(): Promise<void>;
	release(): Promise<void>;
}

export interface HarnessSessionStore {
	claim(
		scope: HarnessSessionScope,
		options?: { abortSignal?: AbortSignal },
	): Promise<HarnessSessionClaim>;
}
