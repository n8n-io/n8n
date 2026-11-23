import type { GuardrailResult } from '@n8n/ai-utilities/guardrails';
import type { AgentToolGuardrailConfig } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import {
	detectTriggerNode,
	inferInputSchema,
	validateCompatibility,
} from '@/workflows/callable/callable-workflow-input';

import {
	executeWorkflow,
	type WorkflowToolContext,
	type WorkflowToolRunContext,
} from './workflow-tool-factory';

/** The check runs before every covered tool call, so it gets a tighter budget than a tool execution. */
const GUARDRAIL_WORKFLOW_TIMEOUT_MS = 30_000;

/** Metadata key that marks an execution as a guardrail check, for the re-entry guard in `executeAgent`. */
export const GUARDRAIL_CHECK_FOR_KEY = 'guardrailCheckFor';

type WorkflowGuardrailConfig = Extract<AgentToolGuardrailConfig, { kind: 'workflow' }>;

/**
 * A guardrail check that runs a workflow. Fails closed: a load error, a
 * schema mismatch, an error status, or a timeout all report an execution
 * failure, which stops the covered call like any other guardrail trip.
 */
export type WorkflowGuardrailCheck = (toolName: string, input: unknown) => Promise<GuardrailResult>;

export function createWorkflowGuardrailCheck(
	guardrail: WorkflowGuardrailConfig,
	context: WorkflowToolContext,
): WorkflowGuardrailCheck {
	const guardrailName = guardrail.name ?? guardrail.id;

	return async (toolName, input) => {
		try {
			// Reload on every call, like the workflow tools: a fixed or removed
			// check workflow surfaces as a failure on the next call, not a stale one.
			const workflow = await context.workflowLoader.loadWorkflow(
				context.projectId,
				// The name is required by the reference type but never read once an id is set.
				{ workflowId: guardrail.workflowId, workflowName: guardrail.workflowId },
				{ usePublishedVersion: context.usePublishedWorkflowVersion === true },
			);
			if (!workflow) {
				return failed(
					guardrailName,
					`The check workflow "${guardrail.workflowId}" is not accessible`,
				);
			}
			if (context.canExecuteWorkflow && !(await context.canExecuteWorkflow(workflow.id))) {
				return failed(
					guardrailName,
					`The user cannot execute the check workflow "${guardrail.workflowId}"`,
				);
			}

			validateCompatibility(workflow);
			const { node: triggerNode, triggerType } = detectTriggerNode(workflow);
			const inputSchema = inferInputSchema(triggerNode, triggerType);
			const checkInput = inputSchema.parse({ toolName, input, guardrailName });

			const runContext: WorkflowToolRunContext = {
				...context,
				timeoutMs: GUARDRAIL_WORKFLOW_TIMEOUT_MS,
				// A check execution cannot re-enter the agent it guards, or each
				// turn would run the check again before its tool calls.
				...(context.agentId !== undefined && {
					executionMetadata: { [GUARDRAIL_CHECK_FOR_KEY]: context.agentId },
				}),
			};
			const result = await executeWorkflow(workflow, triggerNode, checkInput, runContext);

			if (result.error !== undefined || result.status !== 'success') {
				return failed(
					guardrailName,
					result.error ?? `The check workflow finished with status "${result.status}"`,
				);
			}

			return {
				guardrailName,
				// Guardrails-node convention: any output item that reports a tripwire stops the call.
				tripwireTriggered: Object.values(result.data ?? {}).some(
					(items) =>
						Array.isArray(items) &&
						items.some((item) => isRecord(item) && item.tripwireTriggered === true),
				),
				info: {},
			};
		} catch (error) {
			return failed(guardrailName, error instanceof Error ? error.message : String(error));
		}
	};
}

function failed(guardrailName: string, message: string): GuardrailResult {
	return {
		guardrailName,
		tripwireTriggered: false,
		executionFailed: true,
		originalException: new Error(message),
		info: {},
	};
}
