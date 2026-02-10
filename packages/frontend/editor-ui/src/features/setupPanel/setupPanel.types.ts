import type { INodeUi } from '@/Interface';

export interface NodeCredentialRequirement {
	credentialType: string;
	credentialDisplayName: string;
	selectedCredentialId?: string;
	issues: string[];
	/** Names of all nodes in the setup panel that require this credential type */
	nodesWithSameCredential: string[];
}

export interface NodeSetupState {
	node: INodeUi;
	credentialRequirements: NodeCredentialRequirement[];
	isComplete: boolean;
	isTrigger: boolean;
}
