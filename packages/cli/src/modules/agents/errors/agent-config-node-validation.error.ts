import { UserError } from 'n8n-workflow';

export interface AgentConfigNodeValidationIssue {
	code: 'NODE_NOT_AGENT_TOOL' | 'INVALID_NODE_PARAMETERS';
	path: string;
	message: string;
	toolName: string;
	nodeType: string;
	nodeTypeVersion: number;
}

export class AgentConfigNodeValidationError extends UserError {
	readonly code = 'AGENT_CONFIG_NODE_VALIDATION';

	constructor(readonly issues: AgentConfigNodeValidationIssue[]) {
		super(`Agent node tools are invalid: ${issues.map((issue) => issue.path).join(', ')}`);
	}
}
