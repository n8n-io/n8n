import { APPROVAL_SUSPEND_SCHEMA } from '@n8n/agents';
import type { BuiltTool } from '@n8n/agents';
import {
	instanceAiApprovalDetailsSchema,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import type { InstanceAiApprovalDetails, InstanceAiConfirmationSeverity } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { DOMAIN_TOOL_IDS } from '../tools/tool-ids';

export type McpToolHints = NonNullable<BuiltTool['mcpAnnotations']>;

/**
 * An approval that a tool asks for before it acts, as the approval card would
 * show it. Only plain approvals qualify: setup, credential, question and
 * resource-decision cards need input from the user, so they always show.
 */
export interface PendingApproval {
	toolName: string;
	toolCallId?: string;
	/** The input that the model sent to the tool. */
	args: unknown;
	/** What the action does, in the words of the card. */
	message: string;
	severity: InstanceAiConfirmationSeverity;
	resourceName?: string;
	approvalDetails?: InstanceAiApprovalDetails;
	/** Set for MCP tool calls. */
	mcp?: { serverName?: string; hints?: McpToolHints };
}

/**
 * How Auto mode handles a pending approval:
 * - `always-ask`: the action removes or stops something that the user relies on, so a person confirms.
 * - `low-risk`: the action only adds something small that is easy to remove, so it runs.
 * - `judge`: the judge model decides.
 */
export type ApprovalRoute = 'always-ask' | 'low-risk' | 'judge';

/** Payload fields of cards that need more than a yes or no from the user. */
const INPUT_CARD_FIELDS = [
	'inputType',
	'questions',
	'credentialRequests',
	'setupRequests',
	'credentialFlow',
	'credentialDestination',
	'resourceDecision',
	'channelConfig',
	'mcpConnectRequest',
	'testListener',
] as const;

const ALWAYS_ASK_TOOLS: ReadonlySet<string> = new Set([
	// A deleted credential breaks every workflow that uses it.
	DOMAIN_TOOL_IDS.DELETE_CREDENTIAL,
	// A deleted table takes all its rows.
	DOMAIN_TOOL_IDS.DELETE_DATA_TABLE,
	// Without a target folder, the folder's workflows are archived with it.
	DOMAIN_TOOL_IDS.DELETE_FOLDER,
	// These can be undone, but each one stops or replaces a workflow that the user
	// relies on, and requests for them are often unclear.
	DOMAIN_TOOL_IDS.ARCHIVE_WORKFLOW,
	DOMAIN_TOOL_IDS.UNPUBLISH_WORKFLOW,
	DOMAIN_TOOL_IDS.RESTORE_WORKFLOW_VERSION,
]);

const LOW_RISK_TOOLS: ReadonlySet<string> = new Set([
	DOMAIN_TOOL_IDS.CREATE_DATA_TABLE,
	DOMAIN_TOOL_IDS.ADD_DATA_TABLE_COLUMN,
	DOMAIN_TOOL_IDS.CREATE_FOLDER,
	DOMAIN_TOOL_IDS.TAG_WORKFLOW,
]);

/** A skill delete cannot be undone, and the skills tool never lets "Always allow" cover it. */
function isSkillDelete(approval: Pick<PendingApproval, 'toolName' | 'args'>): boolean {
	return (
		approval.toolName === DOMAIN_TOOL_IDS.SKILLS &&
		isRecord(approval.args) &&
		approval.args.action === 'delete'
	);
}

export function routeApproval(
	approval: Pick<PendingApproval, 'toolName' | 'args' | 'mcp'>,
): ApprovalRoute {
	// An MCP tool can share a name with a built-in tool, so the rules never apply to it.
	if (approval.mcp) return 'judge';
	if (ALWAYS_ASK_TOOLS.has(approval.toolName) || isSkillDelete(approval)) return 'always-ask';
	if (LOW_RISK_TOOLS.has(approval.toolName)) return 'low-risk';
	return 'judge';
}

function presentString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

/**
 * Reads the payload that a tool passed to `suspend()`. Returns `undefined` when
 * the suspension is not a plain approval, so the caller shows the card as usual.
 */
export function readPendingApproval(
	tool: BuiltTool,
	args: unknown,
	payload: unknown,
	toolCallId?: string,
): PendingApproval | undefined {
	if (!isRecord(payload)) return undefined;

	// The SDK approval gate of an MCP tool. Other tools that use this gate
	// belong to the Agent Builder, which keeps its own approvals.
	const gate = APPROVAL_SUSPEND_SCHEMA.safeParse(payload);
	if (gate.success) {
		if (tool.mcpTool !== true) return undefined;
		const hints = tool.mcpAnnotations;
		return {
			toolName: tool.name,
			toolCallId,
			args,
			message: `Call ${gate.data.displayName ?? tool.mcpToolName ?? tool.name}`,
			severity: hints?.destructiveHint === true ? 'destructive' : 'warning',
			mcp: {
				...(tool.mcpServerName ? { serverName: tool.mcpServerName } : {}),
				...(hints ? { hints } : {}),
			},
		};
	}

	if (INPUT_CARD_FIELDS.some((field) => payload[field] !== undefined)) return undefined;
	const message = presentString(payload.message);
	const severity = instanceAiConfirmationSeveritySchema.safeParse(payload.severity);
	if (!message || !severity.success) return undefined;

	const details = instanceAiApprovalDetailsSchema.safeParse(payload.approvalDetails);
	const resourceName = presentString(payload.resourceName);
	return {
		toolName: tool.name,
		toolCallId,
		args,
		message,
		severity: severity.data,
		...(resourceName ? { resourceName } : {}),
		...(details.success ? { approvalDetails: details.data } : {}),
	};
}
