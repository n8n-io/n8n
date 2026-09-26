/**
 * Consolidated executions tool — list, get, run, run-step, debug,
 * get-node-output, get-resolved-node-parameters, stop.
 */
import {
	buildRunStepSessionGrantKey,
	buildRunWorkflowSessionGrantKey,
	instanceAiApprovalDetailsSchema,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import type { InstanceAiApprovalDetails } from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import { ExecutionStatusList } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { approvalSummarySchema, formatApprovalMessage } from './approval-copy';
import { recordLiveRunVerification } from './orchestration/verification/record-live-run';

// ── Action schemas ─────────────────────────────────────────────────────────

const listAction = z.object({
	action: z
		.literal('list')
		.describe(
			'List recent executions. With `workflowId`, only rows with `ranPublishedVersion: true` prove the live workflow works.',
		),
	workflowId: z.string().optional().describe('Workflow ID'),
	status: z
		.enum(ExecutionStatusList)
		.optional()
		.describe('Filter by status. Failed runs are "error" or "crashed".'),
	limit: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe('Max results to return (default 20)'),
});

const getAction = z.object({
	action: z
		.literal('get')
		.describe(
			'Get execution status without blocking (poll running ones). `ranPublishedVersion` says whether the live version ran.',
		),
	executionId: z.string().describe('Execution ID'),
});

const runAction = z.object({
	action: z.literal('run').describe('Execute a workflow and wait for completion'),
	approvalSummary: approvalSummarySchema,
	workflowId: z.string().describe('Workflow ID'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			'Injected as the trigger output, for any trigger type. For a webhook, flat data becomes `body`; ' +
				'pass { body, query, headers, params } to set the others.',
		),
	triggerNodeName: z
		.string()
		.optional()
		.describe(
			'Trigger to start from. Required when the workflow has more than one trigger: run once per trigger. ' +
				'Never edit the workflow to reach a branch.',
		),
});

const runStepAction = z.object({
	action: z
		.literal('run-step')
		.describe(
			"Run ONE node of a saved workflow for real, with the user's credentials. Use it on reads " +
				'and transforms. NEVER on a node that writes (create/update/delete/send, non-GET HTTP); ' +
				'debug those with action="debug" or "get-resolved-node-parameters". When unsure, treat ' +
				'the node as a write.',
		),
	workflowId: z.string().describe('Workflow ID'),
	nodeName: z.string().describe('Name of the node, as named in the workflow the action targets'),
	reuseExecutionId: z
		.string()
		.optional()
		.describe(
			"Replay this past execution's data for the nodes above the target. Same workflow only.",
		),
	mockInput: z
		.array(z.record(z.unknown()))
		.optional()
		.describe('Items to feed the target node, skipping every node above it.'),
	toolArguments: z
		.union([z.string(), z.record(z.unknown())])
		.optional()
		.describe(
			'Only for a tool node: its $fromAI arguments, or a plain string for a free-text tool. Required when it declares $fromAI arguments.',
		),
});

const debugAction = z.object({
	action: z
		.literal('debug')
		.describe(
			'Analyze a failed execution with structured diagnostics. When a node failed, ' +
				"`failedNode.resolvedParameters` includes that node's raw parameters, the same " +
				'tree with expressions substituted, and lists of expressions that threw or resolved to empty values',
		),
	executionId: z.string().describe('Execution ID'),
});

const getNodeOutputAction = z.object({
	action: z
		.literal('get-node-output')
		.describe(
			"Retrieve raw output of a specific node from an execution, grouped per output (e.g. a Filter's Kept and Discarded). All outputs are listed, including outputs with no downstream connection; only items on a connected output continue through the workflow.",
		),
	executionId: z.string().describe('Execution ID'),
	nodeName: z.string().describe('Name of the node, as named in the workflow the action targets'),
	startIndex: z.number().int().min(0).optional().describe('Item index to start from (default 0)'),
	maxItems: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.describe('Maximum number of items to return (default 10, max 50)'),
});

const getResolvedNodeParametersAction = z.object({
	action: z
		.literal('get-resolved-node-parameters')
		.describe(
			"Replay a node's expression resolution against a past execution: raw `parameters`, " +
				'the `resolved` tree, `failedExpressions`, and `emptyResolutions` (the usual silent ' +
				'cause of empty fields). Use it to debug why a node got an unexpected value.',
		),
	executionId: z.string().describe('Execution ID'),
	nodeName: z.string().describe('Name of the node, as named in the workflow the action targets'),
	itemIndex: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Input item index to resolve against (default 0)'),
	runIndex: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Which run of the node to use, if it ran multiple times (default: last run)'),
});

const stopAction = z.object({
	action: z.literal('stop').describe('Cancel a running workflow execution'),
	executionId: z.string().describe('Execution ID'),
});

function buildInputSchema(context: InstanceAiContext) {
	return sanitizeInputSchema(
		z.discriminatedUnion('action', [
			listAction,
			getAction,
			runAction,
			...(context.executionService.runStep ? [runStepAction] : []),
			debugAction,
			getNodeOutputAction,
			getResolvedNodeParametersAction,
			stopAction,
		]),
	);
}

type Input =
	| z.infer<typeof listAction>
	| z.infer<typeof getAction>
	| z.infer<typeof runAction>
	| z.infer<typeof runStepAction>
	| z.infer<typeof debugAction>
	| z.infer<typeof getNodeOutputAction>
	| z.infer<typeof getResolvedNodeParametersAction>
	| z.infer<typeof stopAction>;

// ── Suspend / resume schemas (used by `run`) ───────────────────────────────

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	approvalDetails: instanceAiApprovalDetailsSchema.optional(),
	resourceName: z.string().optional(),
	severity: instanceAiConfirmationSeveritySchema,
});

/** Includes `scope` for "always allow" session grants (see handler). */
const resumeSchema = instanceAiApprovalResumeSchema;

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleList(context: InstanceAiContext, input: Extract<Input, { action: 'list' }>) {
	const [executions, workflow] = await Promise.all([
		context.executionService.list({
			workflowId: input.workflowId,
			status: input.status,
			limit: input.limit,
		}),
		resolveWorkflowVersions(context, input.workflowId),
	]);

	if (workflow === undefined) return { executions };

	const { activeVersionId, draftVersionId } = workflow;
	return {
		executions: executions.map((execution) => ({
			...execution,
			ranPublishedVersion: ranPublishedVersion(execution.workflowVersionId, activeVersionId),
		})),
		workflow: {
			...workflow,
			hasUnpublishedChanges: activeVersionId !== null && activeVersionId !== draftVersionId,
		},
	};
}

/**
 * Published and draft version of one workflow. Without it, "did the live
 * version run?" is unanswerable from execution rows alone. A failed read drops
 * the version fields rather than the whole result.
 */
async function resolveWorkflowVersions(
	context: InstanceAiContext,
	workflowId: string | undefined,
): Promise<{ activeVersionId: string | null; draftVersionId: string } | undefined> {
	if (workflowId === undefined) return undefined;

	try {
		const head = await context.workflowService.getWorkflowHead(workflowId);
		return { activeVersionId: head.activeVersionId, draftVersionId: head.versionId };
	} catch (error) {
		context.logger.warn('Failed to read workflow versions for the execution list', {
			workflowId,
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

async function handleGet(context: InstanceAiContext, input: Extract<Input, { action: 'get' }>) {
	const result = await context.executionService.getStatus(input.executionId);
	const workflow = await resolveWorkflowVersions(context, result.workflowId);
	if (workflow === undefined) return result;

	return {
		...result,
		ranPublishedVersion: ranPublishedVersion(result.workflowVersionId, workflow.activeVersionId),
	};
}

/** A null on either side is an unknown or unpublished version, never a match. */
function ranPublishedVersion(
	workflowVersionId: string | null | undefined,
	activeVersionId: string | null,
): boolean {
	return (
		activeVersionId !== null &&
		workflowVersionId !== null &&
		workflowVersionId !== undefined &&
		workflowVersionId === activeVersionId
	);
}

async function handleRun(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'run' }>,
	resumeData: z.infer<typeof resumeSchema> | undefined,
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>,
	abortSignal?: AbortSignal,
) {
	if (context.permissions?.runWorkflow === 'blocked') {
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: 'Action blocked by admin',
		};
	}

	// `always_allow` is only honored for workflows the agent created in this session.
	// Running any other pre-existing workflow still requires HITL approval, so a prompt
	// injection can't silently run arbitrary workflows under the user's authority.
	const workflowId = input.workflowId;
	const allowedByScope =
		context.permissions?.runWorkflow === 'always_allow' &&
		(context.aiCreatedWorkflowIds?.has(workflowId) ?? false);

	// A per-workflow "always allow" grant skips HITL for the rest of the session.
	const grantKey = buildRunWorkflowSessionGrantKey(workflowId);
	const allowedBySessionGrant = context.sessionApprovedToolKeys?.has(grantKey) === true;
	const needsApproval = !allowedByScope && !allowedBySessionGrant;

	// If approval is required and this is the first call, suspend for confirmation
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName =
			(await context.workflowService
				.get(workflowId)
				.then((wf) => wf.name)
				.catch(() => undefined)) ?? workflowId;
		return await suspend({
			requestId: nanoid(),
			message: formatApprovalMessage(
				`Run this workflow live${input.triggerNodeName ? ` from "${input.triggerNodeName}"` : ''}`,
				input.approvalSummary,
			),
			resourceName: workflowName,
			approvalDetails: {
				action: 'run-workflow',
				summary: input.approvalSummary,
				trigger: input.triggerNodeName,
			} satisfies InstanceAiApprovalDetails,
			severity: 'warning' as const,
		});
	}

	// If resumed with denial
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: 'User denied the action',
		};
	}

	// "Always allow" — persist the grant so subsequent runs of this workflow skip HITL.
	if (resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(grantKey);
	}

	// Approved or always_allow — execute
	const result = await context.executionService.run(workflowId, input.inputData, {
		triggerNodeName: input.triggerNodeName,
		abortSignal,
	});
	// A live test is the evidence verification cannot produce itself. Record it
	// so the publish gate stops disclosing simulations that this run replaced.
	const verificationClaim = await recordLiveRunVerification({
		context,
		workflowId,
		triggerNodeName: input.triggerNodeName,
		result,
	});
	return verificationClaim ? { ...result, verificationClaim } : result;
}

/**
 * Runs one node of a saved workflow.
 *
 * Gated exactly like `action="run"`: the admin `runWorkflow` policy, the
 * pre-authorized workflow list, and session grants. Running one node of a
 * workflow is not safer than running the workflow — the node holds the same
 * credentials and reaches the same systems — so it gets the same gate rather
 * than a weaker one.
 */
async function handleRunStep(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'run-step' }>,
	resumeData: z.infer<typeof resumeSchema> | undefined,
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>,
	abortSignal?: AbortSignal,
) {
	if (!context.executionService.runStep) {
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: 'Running a single node is not available on this instance',
		};
	}

	if (context.permissions?.runWorkflow === 'blocked') {
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: 'Action blocked by admin',
		};
	}

	// Same pre-authorization the full run uses: the workflows this session created.
	const allowedByScope =
		context.permissions?.runWorkflow === 'always_allow' &&
		(context.aiCreatedWorkflowIds?.has(input.workflowId) ?? false);

	// A per-node grant keeps a debug loop from re-prompting on every attempt. A
	// whole-workflow run grant also covers a single node of that workflow.
	const stepGrantKey = buildRunStepSessionGrantKey(input.workflowId, input.nodeName);
	const allowedBySessionGrant =
		context.sessionApprovedToolKeys?.has(stepGrantKey) === true ||
		context.sessionApprovedToolKeys?.has(buildRunWorkflowSessionGrantKey(input.workflowId)) ===
			true;

	const needsApproval = !allowedByScope && !allowedBySessionGrant;

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName =
			(await context.workflowService
				.get(input.workflowId)
				.then((wf) => wf.name)
				.catch(() => undefined)) ?? input.workflowId;
		return await suspend({
			requestId: nanoid(),
			message: `Run the node "${input.nodeName}" in ${workflowName}`,
			severity: 'warning' as const,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: 'User denied the action',
		};
	}

	if (resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(stepGrantKey);
	}

	return await context.executionService.runStep(input.workflowId, input.nodeName, {
		reuseExecutionId: input.reuseExecutionId,
		mockInput: input.mockInput,
		toolArguments: input.toolArguments,
		abortSignal,
	});
}

async function handleDebug(context: InstanceAiContext, input: Extract<Input, { action: 'debug' }>) {
	return await context.executionService.getDebugInfo(input.executionId);
}

async function handleGetNodeOutput(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-node-output' }>,
) {
	return await context.executionService.getNodeOutput(input.executionId, input.nodeName, {
		startIndex: input.startIndex,
		maxItems: input.maxItems,
	});
}

async function handleGetResolvedNodeParameters(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-resolved-node-parameters' }>,
) {
	return await context.executionService.getResolvedNodeParameters(
		input.executionId,
		input.nodeName,
		{
			itemIndex: input.itemIndex,
			runIndex: input.runIndex,
		},
	);
}

async function handleStop(context: InstanceAiContext, input: Extract<Input, { action: 'stop' }>) {
	return await context.executionService.stop(input.executionId);
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createExecutionsTool(context: InstanceAiContext) {
	return new Tool('executions')
		.description(
			'Inspect, run, debug, and stop workflow executions. ' +
				'"Trigger/run my <workflow>" is action="run" (find it with workflows(action="list"), ' +
				'pass the user\'s values as inputData), not a build request. Reserve action="run" for ' +
				'runs the user asked for: it runs live with no pin data and asks for approval. ' +
				'To verify a workflow you built, use verify-built-workflow instead.',
		)
		.input(buildInputSchema(context))
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(async (input: Input, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'get':
					return await handleGet(context, input);
				case 'run': {
					return await handleRun(context, input, ctx.resumeData, ctx.suspend, ctx.abortSignal);
				}
				case 'run-step': {
					return await handleRunStep(context, input, ctx.resumeData, ctx.suspend, ctx.abortSignal);
				}
				case 'debug':
					return await handleDebug(context, input);
				case 'get-node-output':
					return await handleGetNodeOutput(context, input);
				case 'get-resolved-node-parameters':
					return await handleGetResolvedNodeParameters(context, input);
				case 'stop':
					return await handleStop(context, input);
			}
		})
		.build();
}
