// ---------------------------------------------------------------------------
// Package requirements — dependencies that workflows need but aren't in the package
// ---------------------------------------------------------------------------

export interface PackageRequirements {
	credentials: PackageCredentialRequirement[];
	subWorkflows: PackageSubWorkflowRequirement[];
	nodeTypes: PackageNodeTypeRequirement[];
	variables: PackageVariableRequirement[];
}

export interface PackageCredentialRequirement {
	id: string;
	name: string;
	type: string;
	usedByWorkflows: string[];
}

export interface PackageSubWorkflowRequirement {
	id: string;
	usedByWorkflows: string[];
}

export interface PackageNodeTypeRequirement {
	type: string;
	typeVersion: number;
	usedByWorkflows: string[];
}

export interface PackageVariableRequirement {
	name: string;
	usedByWorkflows: string[];
}
