import type { InstanceAiCredentialSetupHint, InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import type { INodeParameters } from 'n8n-workflow';

/**
 * One form unit (per `node × credential-or-parameters`) and one wizard step.
 * Backs all input/skip/payload state.
 */
export interface WorkflowSetupSection {
	id: string;
	credentialType?: string;
	targetNodeName: string;
	node: InstanceAiWorkflowSetupNode['node'];
	currentCredentialId: string | null;
	parameterNames: string[];
	credentialTargetNodes: Array<{ id: string; name: string; type: string }>;
	setupHint?: InstanceAiCredentialSetupHint;
	/** The user asked for a fresh credential: don't preselect an existing one. */
	preferNewCredential?: boolean;
}

export interface WorkflowSetupApplyPayload {
	nodeCredentials?: Record<string, Record<string, string>>;
	nodeParameters?: Record<string, INodeParameters>;
	/** Nodes the user skipped. Sent so the backend can tell a dismissed card apart from one
	 *  that just isn't filled in yet, and stop asking for it later in the conversation. */
	skippedNodes?: string[];
}

export type TerminalState = 'applying' | 'applied' | 'partial' | 'deferred';
