import type { BuiltTool } from '@n8n/agents';

import { isParseableAttachment } from '../parsers/structured-file-parser';
import { createToolRegistry } from '../tool-registry';
import type { InstanceAiContext, InstanceAiToolRegistry, OrchestrationContext } from '../types';
import { createParseFileTool } from './attachments/parse-file.tool';
import { createCredentialsTool, CREDENTIALS_TOOL_ID } from './credentials.tool';
import { createDataTablesTool, DATA_TABLES_TOOL_ID } from './data-tables.tool';
import { createExecutionsTool } from './executions.tool';
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
import { ASK_USER_TOOL_ID, createAskUserTool } from './shared/ask-user.tool';
import { createTaskControlTool } from './task-control.tool';
import { createApplyWorkflowCredentialsTool } from './workflows/apply-workflow-credentials.tool';
import { createBuildWorkflowTool } from './workflows/build-workflow.tool';
import { createWorkflowsTool } from './workflows.tool';
import { createWorkspaceTool } from './workspace.tool';

/**
 * Creates all native n8n domain tools with the full action surface.
 * Used for delegate/builder tool resolution — sub-agents get unrestricted access.
 */
export function createAllTools(context: InstanceAiContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [
		['workflows', createWorkflowsTool(context)],
		['executions', createExecutionsTool(context)],
		[CREDENTIALS_TOOL_ID, createCredentialsTool(context)],
		[DATA_TABLES_TOOL_ID, createDataTablesTool(context)],
		['workspace', createWorkspaceTool(context)],
		['research', createResearchTool(context)],
		['nodes', createNodesTool(context)],
		[ASK_USER_TOOL_ID, createAskUserTool()],
		['build-workflow', createBuildWorkflowTool(context)],
	];

	if (context.currentUserAttachments?.some(isParseableAttachment)) {
		tools.push(['parse-file', createParseFileTool(context)]);
	}

	return createToolRegistry(tools);
}

/**
 * Creates orchestrator-scoped domain tools — restricted action surfaces
 * for tools where the orchestrator should not have write/builder access.
 */
export function createOrchestratorDomainTools(context: InstanceAiContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [
		['workflows', createWorkflowsTool(context, 'orchestrator')],
		['executions', createExecutionsTool(context)],
		[CREDENTIALS_TOOL_ID, createCredentialsTool(context)],
		[DATA_TABLES_TOOL_ID, createDataTablesTool(context, 'orchestrator')],
		['workspace', createWorkspaceTool(context)],
		['research', createResearchTool(context)],
		['nodes', createNodesTool(context, 'orchestrator')],
		[ASK_USER_TOOL_ID, createAskUserTool()],
	];

	if (context.currentUserAttachments?.some(isParseableAttachment)) {
		tools.push(['parse-file', createParseFileTool(context)]);
	}

	return createToolRegistry(tools);
}

/**
 * Creates orchestration-only tools (planner, delegation, task control).
 * These tools are given to the orchestrator agent but never to sub-agents.
 */
export function createOrchestrationTools(context: OrchestrationContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [
		['plan', createPlanWithAgentTool(context)],
		['create-tasks', createPlanTool(context)],
		['task-control', createTaskControlTool(context)],
		['delegate', createDelegateTool(context)],
		['build-workflow-with-agent', createBuildWorkflowAgentTool(context)],
		['complete-checkpoint', createCompleteCheckpointTool(context)],
	];

	if (context.browserMcpConfig || hasGatewayBrowserTools(context)) {
		tools.push(['browser-credential-setup', createBrowserCredentialSetupTool(context)]);
	}

	if (context.workflowTaskService) {
		tools.push(['report-verification-verdict', createReportVerificationVerdictTool(context)]);
	}

	if (context.workflowTaskService && context.domainContext) {
		tools.push(['verify-built-workflow', createVerifyBuiltWorkflowTool(context)]);
		tools.push(['apply-workflow-credentials', createApplyWorkflowCredentialsTool(context)]);
	}

	return createToolRegistry(tools);
}

function hasGatewayBrowserTools(context: OrchestrationContext): boolean {
	return (context.localMcpServer?.getToolsByCategory('browser').length ?? 0) > 0;
}
