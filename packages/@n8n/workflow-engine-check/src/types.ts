import type { IWorkflowBase } from 'n8n-workflow';

export type EngineV2EligibilityWorkflow = Pick<IWorkflowBase, 'nodes' | 'connections' | 'settings'>;

/** Stable identifiers. Consumers key messages and metrics on them, so never rename one. */
export type EngineV2ReasonCode =
	| 'ERROR_WORKFLOW'
	| 'REDACTION_POLICY'
	| 'END_USER_CREDENTIALS'
	| 'TRIGGER_EXTERNAL_IDENTITY'
	| 'AI_NODE'
	| 'FORM_NODE'
	| 'CHAT_NODE'
	| 'MCP_SERVER_TRIGGER'
	| 'MICROSOFT_AGENT365_TRIGGER'
	| 'EXECUTION_DATA_NODE'
	| 'TIME_SAVED_NODE'
	| 'MESSAGE_AN_AGENT_NODE'
	| 'EVALUATION_NODE'
	| 'TRIGGER_WAITS_FOR_RUN'
	| 'COMMUNITY_NODE';

export interface EngineV2Reason {
	code: EngineV2ReasonCode;
	severity: 'blocking' | 'warning';
	nodeId?: string;
	nodeName?: string;
	/** English fallback text. */
	message: string;
}

export interface EngineV2Eligibility {
	eligible: boolean;
	reasons: EngineV2Reason[];
}
