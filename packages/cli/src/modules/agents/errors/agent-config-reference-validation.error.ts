import { UserError } from 'n8n-workflow';

export interface AgentConfigReferenceIssue {
	path: string;
	message: string;
}

export class AgentConfigReferenceValidationError extends UserError {
	readonly code = 'AGENT_CONFIG_REFERENCE_VALIDATION';

	constructor(readonly issues: AgentConfigReferenceIssue[]) {
		super(
			`Agent config contains unavailable references: ${issues.map((issue) => issue.path).join(', ')}`,
		);
	}
}
