import type {
	InstanceAiPermissions,
	InstanceGatewayResourceDecision,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
} from '@n8n/api-types';
import {
	GATEWAY_CONFIRMATION_REQUIRED_PREFIX,
	mcpToolCallResultSchema,
	mcpToolSchema,
} from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import {
	N8N_MCP_TOOL_CATEGORY,
	type InstanceAiContext,
	type LocalMcpServer,
	type ReplacedToolAction,
} from '@n8n/instance-ai';
import { isRecord } from '@n8n/utils/is-record';

import type { InProcessMcpTool } from '@/modules/mcp/mcp.types';

import {
	N8N_MCP_TOOL_PERMISSIONS,
	N8N_MCP_BUILD_TOOLS,
	NATIVE_ACTIONS_REPLACED_BY_N8N_MCP,
} from './n8n-mcp-tool-permissions';

const ARGS_PREVIEW_MAX_LENGTH = 500;

export interface N8nMcpApprovalGate {
	permissions: InstanceAiPermissions;
	sessionApprovedToolKeys: ReadonlySet<string>;
	grantSessionToolApproval: (key: string) => Promise<void>;
	/** Shows the tab of a workflow or data table that a tool changed. */
	onArtifactChanged?: InstanceAiContext['onArtifactChanged'];
}

const ARTIFACT_TYPE_BY_TOOL: Readonly<Record<string, 'workflow' | 'data-table'>> = {
	create_workflow_from_code: 'workflow',
	update_workflow: 'workflow',
	restore_workflow_version: 'workflow',
	publish_workflow: 'workflow',
	unpublish_workflow: 'workflow',
	create_data_table: 'data-table',
	rename_data_table: 'data-table',
	add_data_table_column: 'data-table',
	delete_data_table_column: 'data-table',
	rename_data_table_column: 'data-table',
	add_data_table_rows: 'data-table',
};

export function n8nMcpSessionGrantKey(toolName: string): string {
	return `${N8N_MCP_TOOL_CATEGORY}:${toolName}`;
}

/**
 * Exposes the tools of the n8n MCP server to n8n Assistant in the same
 * process. Tools that change data ask for approval through the
 * resource-decision card, according to the n8n Assistant permission that
 * governs them.
 */
export class N8nMcpLocalServer implements LocalMcpServer {
	private readonly toolsByName = new Map<string, InProcessMcpTool>();

	private readonly mcpTools: McpTool[] = [];

	private gate?: N8nMcpApprovalGate;

	constructor(tools: InProcessMcpTool[], logger: Logger) {
		for (const tool of tools) {
			if (!(tool.name in N8N_MCP_TOOL_PERMISSIONS)) continue;

			const parsed = mcpToolSchema.safeParse({
				name: tool.name,
				description: tool.description,
				inputSchema: tool.inputJsonSchema,
				annotations: { ...tool.annotations, category: N8N_MCP_TOOL_CATEGORY },
			});
			if (!parsed.success) {
				logger.warn('Skipping n8n MCP tool with unsupported input schema', { tool: tool.name });
				continue;
			}

			this.toolsByName.set(tool.name, tool);
			this.mcpTools.push(parsed.data);
		}
	}

	/** Until a gate is set, every tool that changes data fails. */
	setApprovalGate(gate: N8nMcpApprovalGate): void {
		this.gate = gate;
	}

	getAvailableTools(): McpTool[] {
		return this.mcpTools;
	}

	/** Only the replacements that this user actually has, so no native action goes missing. */
	getReplacedToolActions(): ReplacedToolAction[] {
		return NATIVE_ACTIONS_REPLACED_BY_N8N_MCP.filter((replaced) =>
			this.toolsByName.has(replaced.replacementToolName),
		);
	}

	/** Whether this user has every MCP tool that replaces the native build pipeline. */
	canBuildWorkflows(): boolean {
		return N8N_MCP_BUILD_TOOLS.every((name) => this.toolsByName.has(name));
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === N8N_MCP_TOOL_CATEGORY ? this.mcpTools : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		const tool = this.toolsByName.get(req.name);
		if (!tool) return errorResult(`Unknown n8n MCP tool: ${req.name}`);

		const { _confirmation, ...args } = req.arguments;

		const denial = await this.checkApproval(tool.name, args, _confirmation);
		if (denial) return denial;

		try {
			const result = await tool.call(args);
			await this.reportArtifact(tool.name, args, result);
			return toMcpToolCallResult(result);
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	}

	private async reportArtifact(
		toolName: string,
		args: Record<string, unknown>,
		result: Awaited<ReturnType<InProcessMcpTool['call']>>,
	): Promise<void> {
		const type = ARTIFACT_TYPE_BY_TOOL[toolName];
		const onArtifactChanged = this.gate?.onArtifactChanged;
		if (!type || !onArtifactChanged) return;
		if ('isError' in result && result.isError === true) return;

		const structured =
			'structuredContent' in result && isRecord(result.structuredContent)
				? result.structuredContent
				: {};
		const id =
			type === 'workflow'
				? (structured.workflowId ?? args.workflowId)
				: (args.dataTableId ?? structured.id);
		if (typeof id !== 'string' || id === '') return;

		await onArtifactChanged({ type, id });
	}

	private async checkApproval(
		toolName: string,
		args: Record<string, unknown>,
		confirmation: unknown,
	): Promise<McpToolCallResult | undefined> {
		const permission = N8N_MCP_TOOL_PERMISSIONS[toolName];
		if (permission === 'read') return undefined;

		const gate = this.gate;
		if (!gate) return errorResult(`${toolName} is not available: approvals are not configured`);

		const mode = gate.permissions[permission];
		if (mode === 'blocked') return errorResult(`${toolName} is blocked by admin`);
		if (mode === 'always_allow') return undefined;

		const grantKey = n8nMcpSessionGrantKey(toolName);
		if (gate.sessionApprovedToolKeys.has(grantKey)) return undefined;

		switch (confirmation) {
			case undefined:
				return confirmationRequiredResult(toolName, args, [
					'denyOnce',
					'allowOnce',
					'allowForSession',
				]);
			case 'allowOnce':
				return undefined;
			case 'allowForSession':
				await gate.grantSessionToolApproval(grantKey);
				return undefined;
			default:
				return errorResult('Access denied by user');
		}
	}
}

function toMcpToolCallResult(result: Awaited<ReturnType<InProcessMcpTool['call']>>) {
	if ('resultType' in result && result.resultType === 'input_required') {
		return errorResult('This tool needs client input, which n8n Assistant does not support');
	}

	const parsed = mcpToolCallResultSchema.safeParse(result);
	if (parsed.success) return parsed.data;

	return {
		content: [{ type: 'text' as const, text: JSON.stringify(result) }],
		...('isError' in result && result.isError === true ? { isError: true } : {}),
	};
}

function confirmationRequiredResult(
	toolName: string,
	args: Record<string, unknown>,
	options: InstanceGatewayResourceDecision[],
): McpToolCallResult {
	const argsPreview = JSON.stringify(args);
	const payload = {
		toolGroup: N8N_MCP_TOOL_CATEGORY,
		resource: toolName,
		description:
			argsPreview.length > ARGS_PREVIEW_MAX_LENGTH
				? `${argsPreview.slice(0, ARGS_PREVIEW_MAX_LENGTH)}…`
				: argsPreview,
		options,
	};
	return {
		content: [
			{ type: 'text', text: `${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(payload)}` },
		],
		isError: true,
	};
}

function errorResult(message: string): McpToolCallResult {
	return { content: [{ type: 'text', text: message }], isError: true };
}
