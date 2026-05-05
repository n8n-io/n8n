import type { ToolsInput } from '@mastra/core/agent';

import {
	addSafeMcpTools,
	createClaimedToolNames,
	type McpToolNameValidationError,
} from '../agent/mcp-tool-name-validation';
import { isStructuredAttachment } from '../parsers/structured-file-parser';
import type { InstanceAiContext, OrchestrationContext } from '../types';
import { createParseFileTool } from './attachments/parse-file.tool';
import { createCredentialsTool } from './credentials.tool';
import { createDataTablesTool } from './data-tables.tool';
import { createExecutionsTool } from './executions.tool';
import { createToolsFromLocalMcpServer } from './filesystem/create-tools-from-mcp-server';
import { createNodesTool } from './nodes.tool';
import { createBrowserCredentialSetupTool } from './orchestration/browser-credential-setup.tool';
import { createBuildWorkflowAgentTool } from './orchestration/build-workflow-agent.tool';
import { createCompleteCheckpointTool } from './orchestration/complete-checkpoint.tool';
import { createDelegateTool } from './orchestration/delegate.tool';
import { createPlanWithAgentTool } from './orchestration/plan-with-agent.tool';
import { createPlanTool } from './orchestration/plan.tool';
import { createReportVerificationVerdictTool } from './orchestration/report-verification-verdict.tool';
import { createVerifyBuiltWorkflowTool } from './orchestration/verify-built-workflow.tool';
import { createResearchTool } from './research.tool';
import { createAskUserTool } from './shared/ask-user.tool';
import { createTaskControlTool } from './task-control.tool';
import { createApplyWorkflowCredentialsTool } from './workflows/apply-workflow-credentials.tool';
import { createBuildWorkflowTool } from './workflows/build-workflow.tool';
import { createWorkflowsTool } from './workflows.tool';
import { createWorkspaceTool } from './workspace.tool';

const LOCAL_GATEWAY_MCP_SOURCE = 'local gateway MCP';

function warnSkippedLocalGatewayTool(context: InstanceAiContext) {
	return (error: McpToolNameValidationError) => {
		context.logger?.warn('Skipped MCP tool with unsafe name', {
			toolName: error.toolName,
			source: error.source,
			reason: error.message,
		});
	};
}

function createToolsWithLocalGateway(
	context: InstanceAiContext,
	nativeTools: ToolsInput,
	options: { excludeToolNames?: ReadonlySet<string> } = {},
): ToolsInput {
	const tools: ToolsInput = { ...nativeTools };
	if (!context.localMcpServer) return tools;

	const localGatewayTools = createToolsFromLocalMcpServer(context.localMcpServer, context.logger);
	const excludeToolNames = options.excludeToolNames;
	const filteredLocalGatewayTools =
		excludeToolNames && excludeToolNames.size > 0
			? Object.fromEntries(
					Object.entries(localGatewayTools).filter(([name]) => !excludeToolNames.has(name)),
				)
			: localGatewayTools;
	const nativeToolNames = Object.keys(nativeTools);

	addSafeMcpTools(tools, filteredLocalGatewayTools, {
		source: LOCAL_GATEWAY_MCP_SOURCE,
		claimedToolNames: createClaimedToolNames(nativeToolNames),
		reservedSuffixToolNames: createClaimedToolNames(nativeToolNames),
		warn: warnSkippedLocalGatewayTool(context),
	});

	return tools;
}

/**
 * Creates all native n8n domain tools with the full action surface.
 * Used for delegate/builder tool resolution — sub-agents get unrestricted access.
 */
export function createAllTools(context: InstanceAiContext): ToolsInput {
	const nativeTools: ToolsInput = {
		workflows: createWorkflowsTool(context),
		executions: createExecutionsTool(context),
		credentials: createCredentialsTool(context),
		'data-tables': createDataTablesTool(context),
		workspace: createWorkspaceTool(context),
		research: createResearchTool(context),
		nodes: createNodesTool(context),
		'ask-user': createAskUserTool(),
		'build-workflow': createBuildWorkflowTool(context),
		...(context.currentUserAttachments?.some(isStructuredAttachment)
			? { 'parse-file': createParseFileTool(context) }
			: {}),
	};
	return createToolsWithLocalGateway(context, nativeTools);
}

/**
 * Creates orchestrator-scoped domain tools — restricted action surfaces
 * for tools where the orchestrator should not have write/builder access.
 */
export function createOrchestratorDomainTools(context: InstanceAiContext): ToolsInput {
	const nativeTools: ToolsInput = {
		workflows: createWorkflowsTool(context, 'orchestrator'),
		executions: createExecutionsTool(context),
		credentials: createCredentialsTool(context),
		'data-tables': createDataTablesTool(context, 'orchestrator'),
		workspace: createWorkspaceTool(context),
		research: createResearchTool(context),
		nodes: createNodesTool(context, 'orchestrator'),
		'ask-user': createAskUserTool(),
	};
	const browserToolNames = new Set(
		context.localMcpServer?.getToolsByCategory('browser').map((tool) => tool.name) ?? [],
	);
	return createToolsWithLocalGateway(context, nativeTools, {
		excludeToolNames: browserToolNames,
	});
}

/**
 * Creates orchestration-only tools (planner, delegation, task control).
 * These tools are given to the orchestrator agent but never to sub-agents.
 */
export function createOrchestrationTools(context: OrchestrationContext) {
	return {
		plan: createPlanWithAgentTool(context),
		'create-tasks': createPlanTool(context),
		'task-control': createTaskControlTool(context),
		delegate: createDelegateTool(context),
		'build-workflow-with-agent': createBuildWorkflowAgentTool(context),
		'complete-checkpoint': createCompleteCheckpointTool(context),
		...(context.browserMcpConfig || hasGatewayBrowserTools(context)
			? {
					'browser-credential-setup': createBrowserCredentialSetupTool(context),
				}
			: {}),
		...(context.workflowTaskService
			? {
					'report-verification-verdict': createReportVerificationVerdictTool(context),
				}
			: {}),
		...(context.workflowTaskService && context.domainContext
			? {
					'verify-built-workflow': createVerifyBuiltWorkflowTool(context),
				}
			: {}),
		...(context.workflowTaskService && context.domainContext
			? {
					'apply-workflow-credentials': createApplyWorkflowCredentialsTool(context),
				}
			: {}),
	};
}

function hasGatewayBrowserTools(context: OrchestrationContext): boolean {
	return (context.localMcpServer?.getToolsByCategory('browser').length ?? 0) > 0;
}
