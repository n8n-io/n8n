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

/** Discriminated union for the setup card list */
export type SetupCardItem =
	| { type: 'trigger'; state: TriggerSetupState }
	| { type: 'credential'; state: CredentialTypeSetupState };
