import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import type { INodeParameters } from 'n8n-workflow';

/**
 * One form unit (per `node × credential-or-parameters`).
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
}

/**
 * Root node + its setup/sub-node sections grouped under a single wizard step.
 *
 * `rootSection` is optional because the root node may not have a setup
 * request of its own — its sub-nodes can carry all the configuration. When
 * the root node does have a setup request, credentials and parameters from
 * that request are bundled into a single section.
 */
export interface WorkflowSetupGroup {
	subnodeRootNode: { name: string; type: string; typeVersion: number; id: string };
	rootSection?: WorkflowSetupSection;
	subnodeSections: WorkflowSetupSection[];
}

/**
 * What the wizard navigates: either a single section or a grouped step.
 */
export type WorkflowSetupStep =
	| { kind: 'section'; section: WorkflowSetupSection }
	| { kind: 'group'; group: WorkflowSetupGroup };

export interface WorkflowSetupApplyPayload {
	nodeCredentials?: Record<string, Record<string, string>>;
	nodeParameters?: Record<string, INodeParameters>;
}

export type TerminalState = 'applying' | 'applied' | 'partial' | 'deferred';
