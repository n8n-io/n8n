/**
 * Verify Built Workflow Tool
 *
 * Runs a built workflow using sidecar verification pin data from the build outcome.
 * The verification pin data is never persisted to the workflow; it only exists
 * for this execution.
 */

import { Tool } from '@n8n/agents';
import { z } from 'zod';

import type { OrchestrationContext } from '../../types';
import { analyzeVerificationResult, buildNodePreviews } from './verification/analyze-result';
import {
	handleMissingSimulationPlan,
	persistVerificationOutcome,
} from './verification/finalize-result';
import { prepareVerificationRun } from './verification/prepare-run';
import { resolveVerificationTarget } from './verification/resolve-target';

const DEFAULT_NODE_PREVIEW_CHARS = 600;

export const verifyBuiltWorkflowInputSchema = z.object({
	workItemId: z
		.string()
		.optional()
		.describe(
			'The work item ID from the build (wi_XXXXXXXX). Optional for follow-up verification; when omitted, the latest build outcome for workflowId in this thread is used.',
		),
	workflowId: z.string().describe('The workflow ID to verify'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			"Input data for the workflow trigger. Shape MUST match the trigger's real-world output: " +
				'Form Trigger -> flat field map like {name: "Alice", email: "a@b.c"} (do NOT wrap in formFields); ' +
				'Webhook -> the body payload like {event: "signup", userId: "..."} (adapter wraps it under body); ' +
				'Chat Trigger -> {chatInput: "user message"}; ' +
				'Schedule Trigger -> omit inputData. ' +
				"If you wrap a form payload in {formFields: {...}} the adapter will reject the call; the builder's " +
				'downstream expressions reference $json.<field>, matching the flat production shape.',
		),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(600_000)
		.optional()
		.describe('Max wait time in milliseconds (default 300000)'),
	includeData: z
		.boolean()
		.optional()
		.describe('Set true only when you need the full execution data payload. Default false.'),
	maxDataChars: z
		.number()
		.int()
		.min(0)
		.max(20_000)
		.optional()
		.describe('Max characters per node preview in the compact response (default 600).'),
	fixtureOverrides: z
		.record(z.array(z.record(z.unknown())))
		.optional()
		.describe(
			'Optional per-run output fixtures keyed by node name. Only nodes already classified as simulated in the build outcome may be overridden. Use this for alternate deterministic scenarios, not raw trigger input.',
		),
});

const remediationOutputSchema = z
	.object({
		category: z.enum(['code_fixable', 'needs_setup', 'blocked']),
		shouldEdit: z.boolean(),
		guidance: z.string(),
		reason: z.string().optional(),
		remainingSubmitFixes: z.number().int().min(0).optional(),
		attemptCount: z.number().int().min(0).optional(),
	})
	.optional();

const verifyBuiltWorkflowOutputSchema = z.object({
	resolvedWorkItemId: z.string().optional(),
	executionId: z.string().optional(),
	success: z.boolean(),
	status: z.enum(['running', 'success', 'error', 'waiting', 'unknown']).optional(),
	nodesExecuted: z.array(z.string()).optional(),
	nodePreviews: z
		.array(
			z.object({
				nodeName: z.string(),
				itemCount: z.number().optional(),
				preview: z.string(),
				truncated: z.boolean(),
				chars: z.number(),
				simulated: z.boolean().optional(),
			}),
		)
		.optional(),
	simulatedNodes: z.array(z.object({ nodeName: z.string(), reason: z.string() })).optional(),
	simulationNote: z.string().optional(),
	lastNodeExecuted: z.string().optional(),
	nodesNotReached: z.array(z.string()).optional(),
	coverageNote: z.string().optional(),
	data: z.record(z.unknown()).optional(),
	error: z.string().optional(),
	remediation: remediationOutputSchema,
	guidance: z.string().optional(),
});

type VerifyInput = z.infer<typeof verifyBuiltWorkflowInputSchema>;

export function createVerifyBuiltWorkflowTool(context: OrchestrationContext) {
	return new Tool('verify-built-workflow')
		.description(
			'Run a built workflow using sidecar verification context from the build outcome. ' +
				'Call when the current turn is responsible for post-build verification. ' +
				'Use this as the standard verifier for workflows produced by the workflow-builder. ' +
				'It supports manual, schedule, form, webhook, chat, and other event triggers with build-outcome pin data, mocked credential context, or trigger-shaped inputData. ' +
				'Use `executions(action="run")` only for ad hoc runs outside build verification. ' +
				'CRITICAL: `inputData` shape depends on the trigger type; see the per-trigger guidance on the inputData field. ' +
				'Passing the wrong shape (e.g. wrapping form fields under `formFields`) produces null downstream values that ' +
				'look like an expression bug but are not. Do not patch the workflow; re-run verify with the correct shape.',
		)
		.input(verifyBuiltWorkflowInputSchema)
		.output(verifyBuiltWorkflowOutputSchema)
		.handler(async (input: VerifyInput) => {
			const targetResult = await resolveVerificationTarget(input, context);
			if (targetResult.kind === 'blocked') return targetResult.result;
			const { target } = targetResult;
			const { input: resolvedInput, buildOutcome, workflowId, workflowTaskService } = target;

			if (buildOutcome.nodeSimulationPlan === undefined) {
				return await handleMissingSimulationPlan({
					input: resolvedInput,
					context,
					workflowTaskService,
					workflowId,
				});
			}

			const preparedResult = prepareVerificationRun(buildOutcome, resolvedInput.fixtureOverrides);
			if (preparedResult.kind === 'blocked') {
				return {
					...preparedResult.result,
					resolvedWorkItemId: resolvedInput.workItemId,
				};
			}
			const { prepared } = preparedResult;

			const result = await target.domainContext.executionService.run(
				workflowId,
				resolvedInput.inputData,
				{
					timeout: resolvedInput.timeout,
					verificationPinData: prepared.verificationPinData,
				},
			);

			const analysis = analyzeVerificationResult({
				result,
				buildOutcome,
				simulatedNodes: prepared.simulatedNodes,
				stateBefore: target.stateBefore,
				runId: context.runId,
			});
			await persistVerificationOutcome({
				input: resolvedInput,
				context,
				workflowTaskService,
				workflowId,
				result,
				analysis,
			});

			const maxDataChars = resolvedInput.maxDataChars ?? DEFAULT_NODE_PREVIEW_CHARS;
			const simulatedNames = new Set(analysis.reachedSimulatedNodes.map((n) => n.nodeName));
			return {
				resolvedWorkItemId: resolvedInput.workItemId,
				executionId: result.executionId || undefined,
				success: analysis.success,
				status: result.status,
				nodesExecuted: analysis.nodesExecuted,
				lastNodeExecuted: result.lastNodeExecuted,
				nodePreviews: buildNodePreviews(result.data, maxDataChars, simulatedNames),
				simulatedNodes:
					analysis.reachedSimulatedNodes.length > 0 ? analysis.reachedSimulatedNodes : undefined,
				simulationNote: analysis.simulationNote,
				nodesNotReached: analysis.nodesNotReached.length > 0 ? analysis.nodesNotReached : undefined,
				coverageNote: analysis.coverageNote,
				...(resolvedInput.includeData ? { data: result.data } : {}),
				error: result.error,
				remediation: analysis.remediation,
				guidance: analysis.remediation?.guidance,
			};
		})
		.build();
}
