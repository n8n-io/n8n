export type InactiveCredsReport = {
	risk: string;
	riskTypes: Array<{ riskType: string; description: string; credentialIds: string[] }>;
};

export type RiskySqlWorkflow = {
	workflowId: string;
	workflowName: string;
	nodeId: string;
	nodeName: string;
	nodeType: string;
};

export type WorkflowIdsToCredIds = { [workflowId: string]: Set<string> };
