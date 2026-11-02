/**
 * Execution tools: one tool for each action of the former multi-action
 * `workflow_builder_executions` tool (list, get, run, run-step, debug,
 * get-node-output, get-resolved-node-parameters, stop).
 */
import {
	EXECUTION_TOOL_ACTIONS,
	EXECUTION_TOOL_NAME_BY_ACTION,
	getLegacyBuilderToolActions,
	buildRunStepSessionGrantKey,
	buildRunWorkflowSessionGrantKey,
	instanceAiApprovalDetailsSchema,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import type { ExecutionToolAction, InstanceAiApprovalDetails } from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { approvalSummarySchema, formatApprovalMessage } from './approval-copy';
import {
	TRIGGER_INPUT_DATA_DESCRIPTION,
	TRIGGER_NODE_NAME_DESCRIPTION,
} from './shared/trigger-input-descriptions';
import { recordLiveRunVerification } from './orchestration/verification/record-live-run';

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_TIMEOUT_MS = 600_000;

// ── Action schemas ─────────────────────────────────────────────────────────

const listAction = z.object({
	action: z
		.literal('list')
		.describe(
			'List recent workflow executions. Each row carries the `workflowVersionId` it ran. ' +
				'With `workflowId`, the result also carries `workflow.activeVersionId` (the published ' +
				'version, null while unpublished) and `workflow.draftVersionId`. Use them to answer ' +
				'whether the LIVE workflow works: a row ran the published code only when its ' +
				'`workflowVersionId` and `workflow.activeVersionId` are both set and equal. Two nulls ' +
				'are not a match — a null `activeVersionId` means the workflow is not published, so no ' +
				'row can prove production works, and a row with a null `workflowVersionId` ran an ' +
				'unknown version, which is not the same as a draft. A draft version different from the ' +
				'published one means the latest changes are not live yet.',
		),
	workflowId: z.string().optional().describe('Workflow ID'),
	status: z
		.string()
		.optional()
		.describe('Filter by status (e.g. "success", "error", "running", "waiting")'),
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
			'Get execution status without blocking (poll running ones). `workflowVersionId` is the ' +
				'version this run executed; it only tells you whether the run was live when compared ' +
				"with the workflow's `activeVersionId`.",
		),
	executionId: z.string().describe('Execution ID'),
});

const runAction = z.object({
	action: z.literal('run').describe('Execute a workflow and wait for completion'),
	approvalSummary: approvalSummarySchema,
	workflowId: z.string().describe('Workflow ID'),
	inputData: z.record(z.unknown()).optional().describe(TRIGGER_INPUT_DATA_DESCRIPTION),
	triggerNodeName: z.string().optional().describe(TRIGGER_NODE_NAME_DESCRIPTION),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(MAX_TIMEOUT_MS)
		.optional()
		.describe('Max wait time in milliseconds (default 300000, max 600000)'),
});

const runStepAction = z.object({
	action: z
		.literal('run-step')
		.describe(
			'Run ONE node of a saved workflow and return its real output — the canvas ' +
				'"Execute step". The node runs inside the real workflow, so expressions ' +
				'that reference other nodes resolve, sub-nodes (model, memory, tools) come ' +
				"along, and the run lands in the workflow's execution history. " +
				"This is a REAL run with the user's real credentials against their real " +
				'systems. Use it on reads and transforms. Do not use it to debug a node ' +
				'that writes (create/update/delete/send/append, non-GET HTTP) — that ' +
				'performs the effect again. Read the failed execution with debug_execution ' +
				'and get_resolved_node_parameters instead. When unsure, treat the ' +
				'node as a write. A tool runs through the node that owns it (the Agent), so ' +
				"mockInput and reuseExecutionId feed that node and the tool's own " +
				'arguments come from toolArguments. No other sub-node kind can run.',
		),
	workflowId: z.string().describe('Workflow ID'),
	nodeName: z.string().describe('Name of the node, as named in the workflow the action targets'),
	reuseExecutionId: z
		.string()
		.optional()
		.describe(
			"Replay this past execution's data for the nodes above the target, then run " +
				'only the target. Use when debugging a node that already failed a real run: ' +
				'it is the fastest option and the input is real. The execution must belong ' +
				'to the same workflow.',
		),
	mockInput: z
		.array(z.record(z.unknown()))
		.optional()
		.describe(
			'Items to feed the target node, skipping every node above it. Good for ' +
				'studying one node on its own: probing an edge case, or holding the input ' +
				'still while upstream data changes between runs. The result shows the node ' +
				'handles THIS input; it shows nothing about what the workflow really ' +
				'produces, so use reuseExecutionId or a chain run when that is the ' +
				'question. This does not make a write node safe: the node still runs for ' +
				'real, only its input is invented.',
		),
	toolArguments: z
		.union([z.string(), z.record(z.unknown())])
		.optional()
		.describe(
			'Only for a tool node: the arguments an agent would pass it. Keys are the ' +
				"tool's $fromAI argument names. Pass a plain string for a tool that takes " +
				'one free-text input (Wikipedia, Code Tool, a vector store used as a ' +
				'tool). Required when the node declares $fromAI arguments, because the ' +
				'tool runs with empty arguments otherwise.',
		),
	versionId: z
		.string()
		.optional()
		.describe('Run a past version of the workflow instead of the current draft'),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(MAX_TIMEOUT_MS)
		.optional()
		.describe('Max wait time in milliseconds (default 300000, max 600000)'),
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
			"Replay expression resolution for a node's parameters against a past execution. " +
				'Returns raw `parameters`, the `resolved` tree, `failedExpressions`, and ' +
				'`emptyResolutions` (resolved to `null`/`undefined`/`""` — the common silent ' +
				'cause of empty downstream fields). Use when debugging why a node received an ' +
				'unexpected value — more precise than guessing from raw expressions or input data.',
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

const ACTION_SCHEMAS = {
	list: listAction,
	get: getAction,
	run: runAction,
	'run-step': runStepAction,
	debug: debugAction,
	'get-node-output': getNodeOutputAction,
	'get-resolved-node-parameters': getResolvedNodeParametersAction,
	stop: stopAction,
} as const satisfies Record<ExecutionToolAction, z.ZodDiscriminatedUnionOption<'action'>>;

type Input = z.infer<(typeof ACTION_SCHEMAS)[ExecutionToolAction]>;

interface ExecutionsToolOptions {
	allowedActions?: readonly ExecutionToolAction[];
}

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
		resolveListedWorkflowVersions(context, input.workflowId),
	]);

	return workflow === undefined ? { executions } : { executions, workflow };
}

/**
 * Published and draft version of the listed workflow. Only for a list scoped to
 * one workflow: without it, "did the live version run?" is unanswerable from
 * the rows alone. A failed read drops the block rather than the whole list.
 */
async function resolveListedWorkflowVersions(
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
	return await context.executionService.getStatus(input.executionId);
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

	// `always_allow` is only honored for workflows the agent created in this thread.
	// Running any other workflow still requires HITL approval, so a prompt injection
	// can't silently run arbitrary workflows under the user's authority.
	const workflowId = input.workflowId;
	const getWorkflowName = async () =>
		await context.workflowService
			.get(workflowId)
			.then((wf) => wf.name)
			.catch(() => undefined);
	const allowedByScope =
		context.permissions?.runWorkflow === 'always_allow' &&
		(context.aiCreatedWorkflowIds?.has(workflowId) ?? false);

	// A per-workflow "always allow" grant skips HITL for the rest of the session.
	const grantKey = buildRunWorkflowSessionGrantKey(workflowId);
	const allowedBySessionGrant = context.sessionApprovedToolKeys?.has(grantKey) === true;
	const needsApproval = !allowedByScope && !allowedBySessionGrant;

	// If approval is required and this is the first call, suspend for confirmation
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		await context.assertInThreadProject?.({ kind: 'workflow', id: workflowId });
		const workflowName = (await getWorkflowName()) ?? input.workflowId;
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
		timeout: input.timeout,
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

	// Same pre-authorization the full run uses: workflows the agent created in this thread.
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
		await context.assertInThreadProject?.({ kind: 'workflow', id: input.workflowId });
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
		versionId: input.versionId,
		timeout: input.timeout,
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

/**
 * Appended to the description of each tool that reads execution data: each
 * caller reads executions redacted for its user.
 */
const REDACTED_RESULT_GUIDANCE =
	' A result with `redaction` set carries no output items: n8n hides that ' +
	"execution's data from this user, for example because a node uses a colleague's " +
	'personal credential. Tell the user so. Do not read the empty result as a bug, ' +
	'and do not try to get the data another way.';

/**
 * Appended to the description of each tool that reads execution data: the
 * user's own canvas runs are often not saved, and `list_executions` does not show them.
 */
const UNSAVED_EXECUTION_GUIDANCE =
	' When saving manual executions is turned off, n8n can keep a finished manual run ' +
	'for a short time, only for the user who ran it, and list_executions does not show it. ' +
	'Read such a run by its execution id. When the execution the user means is not ' +
	'found, tell the user that you cannot read that run. Do not debug a different ' +
	'execution from list_executions in its place.';

const EXTRA_DESCRIPTIONS: Partial<Record<ExecutionToolAction, string>> = {
	run:
		' This is how you satisfy "trigger/run my <workflow>": find the workflow with ' +
		"list_workflows, then run it here with the user's values as inputData. " +
		'Do not treat such a request as a request to build something. ' +
		'To verify a workflow you built, use workflow_builder_verify_built_workflow, not this tool. ' +
		'Reserve this tool for runs the user explicitly asked for: it runs the workflow live ' +
		'with no pin data and prompts the user for approval.',
	'run-step':
		' Use it to see what one node really returns. When debugging a read node that failed ' +
		'a real execution, pass reuseExecutionId so the node re-runs on the data it actually received.',
};

/** Actions whose result carries execution data, so redaction and unsaved runs apply. */
const DATA_READING_ACTIONS = new Set<ExecutionToolAction>([
	'list',
	'get',
	'run',
	'run-step',
	'debug',
	'get-node-output',
	'get-resolved-node-parameters',
]);

function getActionDescription(action: ExecutionToolAction): string {
	const base = ACTION_SCHEMAS[action].shape.action.description ?? '';
	const guidance = DATA_READING_ACTIONS.has(action)
		? REDACTED_RESULT_GUIDANCE + UNSAVED_EXECUTION_GUIDANCE
		: '';
	return base + (EXTRA_DESCRIPTIONS[action] ?? '') + guidance;
}

async function runExecutionAction(
	context: InstanceAiContext,
	input: Input,
	resumeData: z.infer<typeof resumeSchema> | undefined,
	suspend: (payload: z.infer<typeof suspendSchema>) => Promise<never>,
	abortSignal?: AbortSignal,
) {
	switch (input.action) {
		case 'list':
			return await handleList(context, input);
		case 'get':
			return await handleGet(context, input);
		case 'run':
			return await handleRun(context, input, resumeData, suspend, abortSignal);
		case 'run-step':
			return await handleRunStep(context, input, resumeData, suspend, abortSignal);
		case 'debug':
			return await handleDebug(context, input);
		case 'get-node-output':
			return await handleGetNodeOutput(context, input);
		case 'get-resolved-node-parameters':
			return await handleGetResolvedNodeParameters(context, input);
		case 'stop':
			return await handleStop(context, input);
	}
}

/** Actions that can ask the user for approval. */
const SUSPENDING_ACTIONS = new Set<ExecutionToolAction>(['run', 'run-step']);

const neverSuspend = async (): Promise<never> => {
	throw new Error('This execution tool cannot ask for approval');
};

/** Builds the tool for one execution action. */
export function createExecutionTool(context: InstanceAiContext, action: ExecutionToolAction) {
	const name = EXECUTION_TOOL_NAME_BY_ACTION[action];
	const schema: z.ZodDiscriminatedUnionOption<'action'> = ACTION_SCHEMAS[action];
	const tool = new Tool(name)
		.description(getActionDescription(action))
		.input(sanitizeInputSchema(schema.omit({ action: true })));
	for (const [legacyName, actions] of getLegacyBuilderToolActions(name)) {
		tool.legacyActions(legacyName, ...actions);
	}
	// The input schema omits `action`, so restore it for the shared handlers.
	const withAction = (input: unknown) =>
		({ ...(typeof input === 'object' && input !== null ? input : {}), action }) as Input;

	if (!SUSPENDING_ACTIONS.has(action)) {
		return tool
			.handler(
				async (input, ctx) =>
					await runExecutionAction(
						context,
						withAction(input),
						undefined,
						neverSuspend,
						ctx.abortSignal,
					),
			)
			.build();
	}

	return tool
		.suspend(suspendSchema)
		.resume(resumeSchema)
		.handler(
			async (input, ctx) =>
				await runExecutionAction(
					context,
					withAction(input),
					ctx.resumeData,
					ctx.suspend,
					ctx.abortSignal,
				),
		)
		.build();
}

/** Builds the execution tools, optionally only for some actions. */
export function createExecutionTools(
	context: InstanceAiContext,
	options: ExecutionsToolOptions = {},
) {
	const allowed = new Set(options.allowedActions ?? EXECUTION_TOOL_ACTIONS);
	return EXECUTION_TOOL_ACTIONS.filter((action) => allowed.has(action)).map((action) =>
		createExecutionTool(context, action),
	);
}
