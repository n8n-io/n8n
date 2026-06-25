/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports */
import type { BuiltTool } from '@n8n/agents';

import { isParseableAttachment } from '../parsers/structured-file-parser';
import { createToolRegistry } from '../tool-registry';
import type { InstanceAiContext, InstanceAiToolRegistry, OrchestrationContext } from '../types';
import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from './tool-ids';

const lazyMod = <T>(loader: () => T): (() => T) => {
	let cached: T | undefined;
	return () => (cached ??= loader());
};

const loadParseFileTool = lazyMod(
	() => require('./attachments/parse-file.tool') as typeof import('./attachments/parse-file.tool'),
);
const loadCredentialsTool = lazyMod(
	() => require('./credentials.tool') as typeof import('./credentials.tool'),
);
const loadDataTablesTool = lazyMod(
	() => require('./data-tables.tool') as typeof import('./data-tables.tool'),
);
const loadEvalsTool = lazyMod(
	() => require('./evals/evals.tool') as typeof import('./evals/evals.tool'),
);
const loadExecutionsTool = lazyMod(
	() => require('./executions.tool') as typeof import('./executions.tool'),
);
const loadNodesTool = lazyMod(() => require('./nodes.tool') as typeof import('./nodes.tool'));
const loadN8nDocsTool = lazyMod(
	() => require('./n8n-docs.tool') as typeof import('./n8n-docs.tool'),
);
const loadCompleteCheckpointTool = lazyMod(
	() =>
		require('./orchestration/complete-checkpoint.tool') as typeof import('./orchestration/complete-checkpoint.tool'),
);
const loadDelegateTool = lazyMod(
	() => require('./orchestration/delegate.tool') as typeof import('./orchestration/delegate.tool'),
);
const loadEvalDataAgentTool = lazyMod(
	() =>
		require('./orchestration/eval-data-agent.tool') as typeof import('./orchestration/eval-data-agent.tool'),
);
const loadEvalSetupAgentTool = lazyMod(
	() =>
		require('./orchestration/eval-setup-agent.tool') as typeof import('./orchestration/eval-setup-agent.tool'),
);
const loadPlanTool = lazyMod(
	() => require('./orchestration/plan.tool') as typeof import('./orchestration/plan.tool'),
);
const loadReportVerificationVerdictTool = lazyMod(
	() =>
		require('./orchestration/report-verification-verdict.tool') as typeof import('./orchestration/report-verification-verdict.tool'),
);
const loadVerifyBuiltWorkflowTool = lazyMod(
	() =>
		require('./orchestration/verify-built-workflow.tool') as typeof import('./orchestration/verify-built-workflow.tool'),
);
const loadResearchTool = lazyMod(
	() => require('./research.tool') as typeof import('./research.tool'),
);
const loadAskUserTool = lazyMod(
	() => require('./shared/ask-user.tool') as typeof import('./shared/ask-user.tool'),
);
const loadTaskControlTool = lazyMod(
	() => require('./task-control.tool') as typeof import('./task-control.tool'),
);
const loadApplyWorkflowCredentialsTool = lazyMod(
	() =>
		require('./workflows/apply-workflow-credentials.tool') as typeof import('./workflows/apply-workflow-credentials.tool'),
);
const loadBuildWorkflowTool = lazyMod(
	() =>
		require('./workflows/build-workflow.tool') as typeof import('./workflows/build-workflow.tool'),
);
const loadWorkflowsTool = lazyMod(
	() => require('./workflows.tool') as typeof import('./workflows.tool'),
);
const loadWorkspaceTool = lazyMod(
	() => require('./workspace.tool') as typeof import('./workspace.tool'),
);

/**
 * Creates all native n8n domain tools with the full action surface.
 * Used for delegate/builder tool resolution — sub-agents get unrestricted access.
 */
export function createAllTools(context: InstanceAiContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [
		[DOMAIN_TOOL_IDS.WORKFLOWS, loadWorkflowsTool().createWorkflowsTool(context)],
		[DOMAIN_TOOL_IDS.EVALS, loadEvalsTool().createEvalsTool(context)],
		[DOMAIN_TOOL_IDS.EXECUTIONS, loadExecutionsTool().createExecutionsTool(context)],
		[DOMAIN_TOOL_IDS.CREDENTIALS, loadCredentialsTool().createCredentialsTool(context)],
		[DOMAIN_TOOL_IDS.DATA_TABLES, loadDataTablesTool().createDataTablesTool(context)],
		[DOMAIN_TOOL_IDS.WORKSPACE, loadWorkspaceTool().createWorkspaceTool(context)],
		[DOMAIN_TOOL_IDS.RESEARCH, loadResearchTool().createResearchTool(context)],
		[DOMAIN_TOOL_IDS.N8N_DOCS, loadN8nDocsTool().createN8nDocsTool(context)],
		[DOMAIN_TOOL_IDS.NODES, loadNodesTool().createNodesTool(context)],
		[DOMAIN_TOOL_IDS.ASK_USER, loadAskUserTool().createAskUserTool()],
		[DOMAIN_TOOL_IDS.BUILD_WORKFLOW, loadBuildWorkflowTool().createBuildWorkflowTool(context)],
	];

	if (context.currentUserAttachments?.some(isParseableAttachment)) {
		tools.push([DOMAIN_TOOL_IDS.PARSE_FILE, loadParseFileTool().createParseFileTool(context)]);
	}

	return createToolRegistry(tools);
}

/**
 * Creates orchestrator domain tools. Skills run in the orchestrator now, so
 * domain tools keep their workflow-building surface while hiding raw full
 * WorkflowJSON update actions.
 */
export function createOrchestratorDomainTools(context: InstanceAiContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [
		[DOMAIN_TOOL_IDS.WORKFLOWS, loadWorkflowsTool().createWorkflowsTool(context, 'orchestrator')],
		[DOMAIN_TOOL_IDS.EVALS, loadEvalsTool().createEvalsTool(context)],
		[DOMAIN_TOOL_IDS.EXECUTIONS, loadExecutionsTool().createExecutionsTool(context)],
		[DOMAIN_TOOL_IDS.CREDENTIALS, loadCredentialsTool().createCredentialsTool(context)],
		[DOMAIN_TOOL_IDS.DATA_TABLES, loadDataTablesTool().createDataTablesTool(context)],
		[DOMAIN_TOOL_IDS.WORKSPACE, loadWorkspaceTool().createWorkspaceTool(context)],
		[DOMAIN_TOOL_IDS.RESEARCH, loadResearchTool().createResearchTool(context)],
		[DOMAIN_TOOL_IDS.N8N_DOCS, loadN8nDocsTool().createN8nDocsTool(context)],
		[DOMAIN_TOOL_IDS.NODES, loadNodesTool().createNodesTool(context)],
		[DOMAIN_TOOL_IDS.ASK_USER, loadAskUserTool().createAskUserTool()],
		[DOMAIN_TOOL_IDS.BUILD_WORKFLOW, loadBuildWorkflowTool().createBuildWorkflowTool(context)],
	];

	if (context.currentUserAttachments?.some(isParseableAttachment)) {
		tools.push([DOMAIN_TOOL_IDS.PARSE_FILE, loadParseFileTool().createParseFileTool(context)]);
	}

	return createToolRegistry(tools);
}

/**
 * Creates orchestration-only tools (task planning, delegation, task control).
 * These tools are given to the orchestrator agent but never to sub-agents.
 */
export function createOrchestrationTools(context: OrchestrationContext): InstanceAiToolRegistry {
	const tools: Array<[string, BuiltTool]> = [
		[ORCHESTRATION_TOOL_IDS.CREATE_TASKS, loadPlanTool().createPlanTool(context)],
		[ORCHESTRATION_TOOL_IDS.TASK_CONTROL, loadTaskControlTool().createTaskControlTool(context)],
		[ORCHESTRATION_TOOL_IDS.DELEGATE, loadDelegateTool().createDelegateTool(context)],
		[
			ORCHESTRATION_TOOL_IDS.COMPLETE_CHECKPOINT,
			loadCompleteCheckpointTool().createCompleteCheckpointTool(context),
		],
		[
			ORCHESTRATION_TOOL_IDS.EVAL_SETUP_WITH_AGENT,
			loadEvalSetupAgentTool().createEvalSetupAgentTool(context),
		],
		[ORCHESTRATION_TOOL_IDS.EVAL_DATA, loadEvalDataAgentTool().createEvalDataAgentTool(context)],
	];

	if (context.workflowTaskService) {
		tools.push([
			ORCHESTRATION_TOOL_IDS.REPORT_VERIFICATION_VERDICT,
			loadReportVerificationVerdictTool().createReportVerificationVerdictTool(context),
		]);
	}

	if (context.workflowTaskService && context.domainContext) {
		tools.push([
			ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
			loadVerifyBuiltWorkflowTool().createVerifyBuiltWorkflowTool(context),
		]);
		tools.push([
			ORCHESTRATION_TOOL_IDS.APPLY_WORKFLOW_CREDENTIALS,
			loadApplyWorkflowCredentialsTool().createApplyWorkflowCredentialsTool(context),
		]);
	}

	return createToolRegistry(tools);
}
