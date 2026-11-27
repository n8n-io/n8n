import type { GuardrailResult } from '@n8n/ai-utilities/guardrails';
import {
	AGENT_DECISION_TRIGGER_NODE_TYPE,
	getGuardrailCheckWorkflowIncompatibilityReason,
	SUPPORTED_GUARDRAIL_CHECK_TRIGGERS,
	WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME,
	type AgentToolGuardrailConfig,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { detectTriggerNode, inferInputSchema } from '@/workflows/callable/callable-workflow-input';

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

			// A guardrail check accepts the callable tool trigger and the
			// decision trigger; body-node rules stay those of a callable run.
			const incompatibility = getGuardrailCheckWorkflowIncompatibilityReason(workflow);
			if (incompatibility) {
				if (incompatibility.reason === 'incompatible_nodes') {
					const names = (workflow.nodes ?? [])
						.filter((node) => !node.disabled && incompatibility.nodeTypes.includes(node.type))
						.map((node) => `${node.name} (${node.type})`)
						.join(', ');
					return failed(
						guardrailName,
						`The check workflow "${workflow.name}" contains nodes that aren't supported in a guardrail check: ${names}`,
					);
				}
				return failed(
					guardrailName,
					`The check workflow "${workflow.name}" needs a '${WORKFLOW_TOOL_TRIGGER_DISPLAY_NAME}' or 'Request from agent' trigger`,
				);
			}
			// Entry point: the first supported check trigger in node order,
			// mirroring the workflow-tool scan.
			const entryNode = (workflow.nodes ?? []).find((node) =>
				(SUPPORTED_GUARDRAIL_CHECK_TRIGGERS as readonly string[]).includes(node.type),
			);
			if (!entryNode) {
				return failed(
					guardrailName,
					`The check workflow "${workflow.name}" has no supported trigger`,
				);
			}

			let checkInput: Record<string, unknown>;
			if (entryNode.type === AGENT_DECISION_TRIGGER_NODE_TYPE) {
				// The decision request contract: the trigger documents
				// `$json.toolInput`, and the review routing sends this shape.
				checkInput = {
					toolName,
					description: guardrailName,
					toolInput: input,
					requestedAt: new Date().toISOString(),
				};
			} else {
				const { node: triggerNode, triggerType } = detectTriggerNode(workflow);
				checkInput = inferInputSchema(triggerNode, triggerType).parse({
					toolName,
					input,
					guardrailName,
				});
			}

			const runContext: WorkflowToolRunContext = {
				...context,
				timeoutMs: GUARDRAIL_WORKFLOW_TIMEOUT_MS,
				// A check execution cannot re-enter the agent it guards, or each
				// turn would run the check again before its tool calls.
				...(context.agentId !== undefined && {
					executionMetadata: { [GUARDRAIL_CHECK_FOR_KEY]: context.agentId },
				}),
			};
			const result = await executeWorkflow(workflow, entryNode, checkInput, runContext);

			if (result.error !== undefined || result.status !== 'success') {
				return failed(
					guardrailName,
					result.error ?? `The check workflow finished with status "${result.status}"`,
				);
			}

			return {
				guardrailName,
				// Guardrails-node convention: any output item that reports a tripwire stops the call.
				// A decision-trigger check answers with the approval contract's
				// terminal item, so `{ approved: false }` is a refusal too.
				tripwireTriggered: Object.values(result.data ?? {}).some(
					(items) =>
						Array.isArray(items) &&
						items.some(
							(item) =>
								isRecord(item) && (item.tripwireTriggered === true || item.approved === false),
						),
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
