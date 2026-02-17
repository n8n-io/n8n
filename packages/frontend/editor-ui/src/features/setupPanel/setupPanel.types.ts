import type { INodeUi } from '@/Interface';

export interface NodeCredentialRequirement {
	credentialType: string;
	credentialDisplayName: string;
	selectedCredentialId?: string;
	issues: string[];
	/** Names of all nodes in the setup panel that require this credential type */
	nodesWithSameCredential: string[];
}

/** One card per unique credential type — groups all nodes that need it */
export interface CredentialTypeSetupState {
	credentialType: string;
	credentialDisplayName: string;
	selectedCredentialId?: string;
	issues: string[];
	/** All nodes that require this credential type */
	nodes: INodeUi[];
	isComplete: boolean;
	/** Whether this is a generic auth type (e.g. Basic Auth, OAuth2) vs a service-specific one */
	isGenericAuth: boolean;
}

/** Trigger card — shows only the test button (no credential picker) */
export interface TriggerSetupState {
	node: INodeUi;
	isComplete: boolean;
}

/** Discriminated union for the setup card list */
export type SetupCardItem =
	| { type: 'trigger'; state: TriggerSetupState }
	| { type: 'credential'; state: CredentialTypeSetupState };
