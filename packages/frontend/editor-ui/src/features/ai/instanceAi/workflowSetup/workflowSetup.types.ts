import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import type { INodeParameters } from 'n8n-workflow';

export interface WorkflowSetupCard {
	id: string;
	credentialType?: string;
	targetNodeName: string;
	node: InstanceAiWorkflowSetupNode['node'];
	currentCredentialId: string | null;
	parameterNames: string[];
	credentialTargetNodes: Array<{ id: string; name: string; type: string }>;
}

export interface WorkflowSetupApplyPayload {
	nodeCredentials?: Record<string, Record<string, string>>;
	nodeParameters?: Record<string, INodeParameters>;
}

export type TerminalState = 'applying' | 'applied' | 'partial' | 'deferred';
