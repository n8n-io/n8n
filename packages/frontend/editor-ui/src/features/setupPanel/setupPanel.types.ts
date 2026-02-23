import type { INodeUi } from '@/Interface';

/** One card per unique credential type — groups all nodes that need it */
export interface CredentialTypeSetupState {
	credentialType: string;
	credentialDisplayName: string;
	selectedCredentialId?: string;
	issues: string[];
	/** All nodes that require this credential type */
	nodes: INodeUi[];
	isComplete: boolean;
}

/** Trigger card — shows only the test button (no credential picker) */
export interface TriggerSetupState {
	node: INodeUi;
	isComplete: boolean;
}

/** Node parameter card — shows required parameters that need to be filled */
export interface NodeParameterSetupState {
	node: INodeUi;
	parameterIssues: Record<string, string[]>;
	credentialTypes: string[];
	isTrigger: boolean;
	isFirstOfType: boolean;
	isComplete: boolean;
}

/** Node credential card — combines credential picker and parameters for a single node */
export interface NodeCredentialSetupState {
	node: INodeUi;
	credentialType: string;
	credentialDisplayName: string;
	selectedCredentialId?: string;
	issues: string[];
	parameterIssues: Record<string, string[]>;
	isTrigger: boolean;
	isFirstNodeWithCredential: boolean;
	showCredentialPicker: boolean;
	isComplete: boolean;
	/** All nodes that use this credential type (for "Used in X nodes" hint) */
	allNodesUsingCredential: INodeUi[];
}

/** Discriminated union for the setup card list */
export type SetupCardItem =
	| { type: 'trigger'; state: TriggerSetupState }
	| { type: 'credential'; state: CredentialTypeSetupState }
	| { type: 'parameter'; state: NodeParameterSetupState }
	| { type: 'nodeCredential'; state: NodeCredentialSetupState };
