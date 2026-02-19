import type { INodeUi } from '@/Interface';
import type { IPinData } from 'n8n-workflow';

export interface CommonSetupState {
	isComplete: boolean;
	demoData?: IPinData[string];
}

/** One card per unique credential type — groups all nodes that need it */
export interface CredentialTypeSetupState extends CommonSetupState {
	credentialType: string;
	credentialDisplayName: string;
	selectedCredentialId?: string;
	issues: string[];
	/** All nodes that require this credential type */
	nodes: INodeUi[];
}

/** Trigger card — shows only the test button (no credential picker) */
export interface TriggerSetupState extends CommonSetupState {
	node: INodeUi;
}

/** Discriminated union for the setup card list */
export type SetupCardItem =
	| { type: 'trigger'; state: TriggerSetupState }
	| { type: 'credential'; state: CredentialTypeSetupState };
