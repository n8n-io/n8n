import type { BuiltTool } from '@n8n/agents';

import { isParseableAttachment } from '../parsers/structured-file-parser';
import { createToolRegistry } from '../tool-registry';
import type { InstanceAiContext, InstanceAiToolRegistry, OrchestrationContext } from '../types';
import { createParseFileTool } from './attachments/parse-file.tool';
import { createCredentialsTool } from './credentials.tool';
import { createDataTablesTool } from './data-tables.tool';
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
import { createAskUserTool } from './shared/ask-user.tool';
import { createTaskControlTool } from './task-control.tool';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from './tool-ids';
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
		[DOMAIN_TOOL_IDS.WORKFLOWS, createWorkflowsTool(context)],
		[DOMAIN_TOOL_IDS.EXECUTIONS, createExecutionsTool(context)],
		[DOMAIN_TOOL_IDS.CREDENTIALS, createCredentialsTool(context)],
		[DOMAIN_TOOL_IDS.DATA_TABLES, createDataTablesTool(context)],
		[DOMAIN_TOOL_IDS.WORKSPACE, createWorkspaceTool(context)],
		[DOMAIN_TOOL_IDS.RESEARCH, createResearchTool(context)],
		[DOMAIN_TOOL_IDS.NODES, createNodesTool(context)],
		[DOMAIN_TOOL_IDS.ASK_USER, createAskUserTool()],
		[DOMAIN_TOOL_IDS.BUILD_WORKFLOW, createBuildWorkflowTool(context)],
	];

	if (context.currentUserAttachments?.some(isParseableAttachment)) {
		tools.push([DOMAIN_TOOL_IDS.PARSE_FILE, createParseFileTool(context)]);
	}

	return createToolRegistry(tools);
}

/**
 * Creates orchestrator-scoped domain tools — restricted action surfaces
 * for tools where the orchestrator should not have write/builder access.
 */
export function createOrchestratorDomainTools(context: InstanceAiContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [
		[DOMAIN_TOOL_IDS.WORKFLOWS, createWorkflowsTool(context, 'orchestrator')],
		[DOMAIN_TOOL_IDS.EXECUTIONS, createExecutionsTool(context)],
		[DOMAIN_TOOL_IDS.CREDENTIALS, createCredentialsTool(context)],
		[DOMAIN_TOOL_IDS.DATA_TABLES, createDataTablesTool(context, 'orchestrator')],
		[DOMAIN_TOOL_IDS.WORKSPACE, createWorkspaceTool(context)],
		[DOMAIN_TOOL_IDS.RESEARCH, createResearchTool(context)],
		[DOMAIN_TOOL_IDS.NODES, createNodesTool(context, 'orchestrator')],
		[DOMAIN_TOOL_IDS.ASK_USER, createAskUserTool()],
	];

	if (context.currentUserAttachments?.some(isParseableAttachment)) {
		tools.push([DOMAIN_TOOL_IDS.PARSE_FILE, createParseFileTool(context)]);
	}

	return createToolRegistry(tools);
}

/**
 * Creates orchestration-only tools (planner, delegation, task control).
 * These tools are given to the orchestrator agent but never to sub-agents.
 */
export function createOrchestrationTools(context: OrchestrationContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [
		[ORCHESTRATION_TOOL_IDS.PLAN, createPlanWithAgentTool(context)],
		[ORCHESTRATION_TOOL_IDS.CREATE_TASKS, createPlanTool(context)],
		[ORCHESTRATION_TOOL_IDS.TASK_CONTROL, createTaskControlTool(context)],
		[ORCHESTRATION_TOOL_IDS.DELEGATE, createDelegateTool(context)],
		[ORCHESTRATION_TOOL_IDS.BUILD_WORKFLOW_WITH_AGENT, createBuildWorkflowAgentTool(context)],
		[ORCHESTRATION_TOOL_IDS.COMPLETE_CHECKPOINT, createCompleteCheckpointTool(context)],
	];

	if (context.browserMcpConfig || hasGatewayBrowserTools(context)) {
		tools.push([
			ORCHESTRATION_TOOL_IDS.BROWSER_CREDENTIAL_SETUP,
			createBrowserCredentialSetupTool(context),
		]);
	}

	if (context.workflowTaskService) {
		tools.push([
			ORCHESTRATION_TOOL_IDS.REPORT_VERIFICATION_VERDICT,
			createReportVerificationVerdictTool(context),
		]);
	}

	if (context.workflowTaskService && context.domainContext) {
		tools.push([
			ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
			createVerifyBuiltWorkflowTool(context),
		]);
		tools.push([
			ORCHESTRATION_TOOL_IDS.APPLY_WORKFLOW_CREDENTIALS,
			createApplyWorkflowCredentialsTool(context),
		]);
	}

	return createToolRegistry(tools);
}

function hasGatewayBrowserTools(context: OrchestrationContext): boolean {
	return (context.localMcpServer?.getToolsByCategory('browser').length ?? 0) > 0;
}
