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
import { createDelegateTool } from './orchestration/delegate.tool';
import { createPlanWithAgentTool } from './orchestration/plan-with-agent.tool';
import { createPlanTool } from './orchestration/plan.tool';
import { createReportVerificationVerdictTool } from './orchestration/report-verification-verdict.tool';
import { createVerifyBuiltWorkflowTool } from './orchestration/verify-built-workflow.tool';
import { createResearchTool } from './research.tool';
import { createAskUserTool } from './shared/ask-user.tool';
import { createTaskControlTool } from './task-control.tool';
import { createTemplatesTool } from './templates.tool';
import { createApplyWorkflowCredentialsTool } from './workflows/apply-workflow-credentials.tool';
import { createBuildWorkflowTool } from './workflows/build-workflow.tool';
import { createWorkflowsTool } from './workflows.tool';
import { createWorkspaceTool } from './workspace.tool';

/**
 * Creates all native n8n domain tools with the full action surface.
 * Used for delegate/builder tool resolution — sub-agents get unrestricted access.
 */
export function createAllTools(context: InstanceAiContext) {
	return {
		workflows: createWorkflowsTool(context),
		executions: createExecutionsTool(context),
		credentials: createCredentialsTool(context),
		'data-tables': createDataTablesTool(context),
		workspace: createWorkspaceTool(context),
		research: createResearchTool(context),
		nodes: createNodesTool(context),
		templates: createTemplatesTool(),
		'ask-user': createAskUserTool(),
		'build-workflow': createBuildWorkflowTool(context),
		...(context.localMcpServer ? createToolsFromLocalMcpServer(context.localMcpServer) : {}),
		...(context.currentUserAttachments?.some(isStructuredAttachment)
			? { 'parse-file': createParseFileTool(context) }
			: {}),
	};
}

/**
 * Creates orchestrator-scoped domain tools — restricted action surfaces
 * for tools where the orchestrator should not have write/builder access.
 */
export function createOrchestratorDomainTools(context: InstanceAiContext) {
	return {
		workflows: createWorkflowsTool(context, 'orchestrator'),
		executions: createExecutionsTool(context),
		credentials: createCredentialsTool(context),
		'data-tables': createDataTablesTool(context, 'orchestrator'),
		workspace: createWorkspaceTool(context),
		research: createResearchTool(context),
		nodes: createNodesTool(context, 'orchestrator'),
		templates: createTemplatesTool(),
		'ask-user': createAskUserTool(),
		...(context.localMcpServer ? createToolsFromLocalMcpServer(context.localMcpServer) : {}),
	};
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
