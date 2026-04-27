import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';

export interface WorkflowSetupCard {
	id: string;
	credentialType: string;
	targetNodeName: string;
	node: InstanceAiWorkflowSetupNode['node'];
	currentCredentialId: string | null;
}

export type TerminalState = 'applying' | 'applied' | 'partial' | 'deferred';
