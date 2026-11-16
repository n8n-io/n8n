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

/**
 * - `temporary`: engine v2 will support this later. The message tells the user to run
 *   the workflow on engine v1 for now.
 * - `permanent`: engine v2 will not support this. The message names the migration.
 * - `invalid`: the workflow cannot run on any engine. The message names the fix.
 */
export type EngineV2ReasonKind = 'temporary' | 'permanent' | 'invalid';

export interface EngineV2Reason {
	code: EngineV2ReasonCode;
	kind: EngineV2ReasonKind;
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
