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
	/** True when the credential was auto-applied (not manually selected by the user) */
	isAutoApplied?: boolean;
}

/** Trigger card — shows only the test button (no credential picker) */
export interface TriggerSetupState {
	node: INodeUi;
	isComplete: boolean;
}

/** Per-node setup card — handles parameter-only, credential-only, or both */
export interface NodeSetupState {
	node: INodeUi;
	parameterIssues: Record<string, string[]>;
	isTrigger: boolean;
	isComplete: boolean;

	/** Parameter names from the upstream template that should always be shown
	 * (resource locators and missing required parameters in the template). */
	additionalParameterNames?: string[];

	// Credential fields — present when the node requires credentials
	credentialType?: string;
	credentialDisplayName?: string;
	selectedCredentialId?: string;
	issues?: string[];
	showCredentialPicker?: boolean;
	/** All nodes that use this credential type (for "Used in X nodes" hint) */
	allNodesUsingCredential?: INodeUi[];
	/** True when the credential was auto-applied (not manually selected by the user) */
	isAutoApplied?: boolean;
}

/** Groups a parent node with its subnode setup cards */
export interface NodeGroupItem {
	parentNode: INodeUi;
	/** Parent node's own setup state, if it has credentials/params needing setup */
	parentState?: NodeSetupState;
	/** Subnode cards pulled from the flat list, in execution order */
	subnodeCards: NodeSetupState[];
}

/** A card is either a single-node card or a node group */
export type SetupCardItem =
	| { state: NodeSetupState; nodeGroup?: undefined }
	| { nodeGroup: NodeGroupItem; state?: undefined };

/** Payload emitted when a credential is selected on a setup card */
export interface CredentialSelectedPayload {
	credentialType: string;
	credentialId: string;
	nodeName: string;
}

/** Payload emitted when a credential is deselected on a setup card */
export interface CredentialDeselectedPayload {
	credentialType: string;
	nodeName: string;
}
