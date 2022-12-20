import type { INode, INodeCredentialsDetails } from 'n8n-workflow';

export type InactiveCredsReport = {
	risk: string;
	riskTypes: Array<{
		riskType: string;
		description: string;
		credentials: INodeCredentialsDetails[];
	}>;
};

export type FlaggedLocation = {
	workflowId: string;
	workflowName: string;
	nodeId: string;
	nodeName: string;
	nodeType: string;
};

export type WorkflowIdsToCredIds = { [workflowId: string]: INodeCredentialsDetails[] };

export type Version = {
	name: string;
	nodes: Array<INode & { iconData?: { type: string; fileBuffer: string } }>;
	createdAt: string;
	description: string;
	documentationUrl: string;
	hasBreakingChange: boolean;
	hasSecurityFix: boolean;
	hasSecurityIssue: boolean;
	securityIssueFixVersion: string;
};
