/**
 * Consolidated workflow_builder_executions tool — list, get, run, debug, get-node-output,
 * get-resolved-node-parameters, stop.
 */
import {
	getLegacyBuilderToolNames,
	buildRunStepSessionGrantKey,
	buildRunWorkflowSessionGrantKey,
	instanceAiApprovalDetailsSchema,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
} from '@n8n/api-types';
import type { InstanceAiApprovalDetails } from '@n8n/api-types';
import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { InstanceAiContext } from '../types';
import { approvalSummarySchema, formatApprovalMessage } from './approval-copy';
import { restrictToolActions } from './restrict-tool-actions';
import { recordLiveRunVerification } from './orchestration/verification/record-live-run';
import { DOMAIN_TOOL_IDS } from './tool-ids';

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_TIMEOUT_MS = 600_000;

// ── Action schemas ─────────────────────────────────────────────────────────

const listAction = z.object({
	action: z
		.literal('list')
		.describe(
			'List recent workflow executions. Each row carries `workflowVersionId` it ran. ' +
				'With `workflowId`, result also carries `workflow.activeVersionId` (published ' +
				'version, null while unpublished) and `workflow.draftVersionId`. Use them to answer ' +
				'whether LIVE workflow works: row ran published code only when its ' +
				'`workflowVersionId` and `workflow.activeVersionId` are both set and equal. Two nulls ' +
				'are not a match — null `activeVersionId` means workflow is not published, so no ' +
				'row can prove production works, and row with null `workflowVersionId` ran ' +
				'unknown version, not the same as draft. Draft version different from ' +
				'published one means latest changes are not live yet.',
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
			'Get execution status without blocking (poll running ones). `workflowVersionId` is ' +
				'version this run executed; tells whether run was live only when compared ' +
				"with workflow's `activeVersionId`.",
		),
	executionId: z.string().describe('Execution ID'),
});

const runAction = z.object({
	action: z.literal('run').describe('Execute workflow and wait for completion'),
	approvalSummary: approvalSummarySchema,
	workflowId: z.string().describe('Workflow ID'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			'Input data passed to workflow trigger. Works for ANY trigger type — ' +
				'system injects inputData as trigger node output, bypassing need for real event. ' +
				'For webhook triggers, flat inputData is treated as request body (placed under `body`; ' +
				'`query`, `headers` and `params` stay empty). To exercise $json.query.*, $json.headers.* or ' +
				'$json.params.*, pass request envelope { body: {...}, query: {...}, headers: {...}, params: {...} } instead. ' +
				'For event-based triggers (e.g. Linear, GitHub, Slack), pass inputData matching ' +
				'shape trigger would emit (e.g. { action: "create", data: { ... } }).',
		),
	triggerNodeName: z
		.string()
		.optional()
		.describe(
			'Name of trigger node to start run from. REQUIRED when workflow has ' +
				'more than one trigger: without it single trigger is auto-detected and other ' +
				"triggers' branches never run. To run each branch, call run once per trigger. " +
				"Trigger names come from workflow_builder_build_workflow's `triggerNodes` or " +
				'workflow_builder_workflows(action="get-as-code"). Never disable, delete, or otherwise edit saved ' +
				'workflow to reach branch — use this instead.',
		),
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
			'Run ONE node of saved workflow and return its real output — canvas ' +
				'"Execute step". Node runs inside real workflow, so expressions ' +
				'that reference other nodes resolve, sub-nodes (model, memory, tools) come ' +
				"along, and run lands in workflow's execution history. " +
				"This is a REAL run with user's real credentials against their real " +
				'systems. Use on reads and transforms. Do not use to debug node ' +
				'that writes (create/update/delete/send/append, non-GET HTTP) — that ' +
				'performs effect again. Read failed execution with action="debug" ' +
				'and action="get-resolved-node-parameters" instead. When unsure, treat ' +
				'node as write. A tool runs through node that owns it (the Agent), so ' +
				"mockInput and reuseExecutionId feed that node and tool's own " +
				'arguments come from toolArguments. No other sub-node kind can run.',
		),
	workflowId: z.string().describe('Workflow ID'),
	nodeName: z.string().describe('Name of the node, as named in the workflow the action targets'),
	reuseExecutionId: z
		.string()
		.optional()
		.describe(
			"Replay this past execution's data for nodes above target, then run " +
				'only target. Use when debugging node that already failed real run: ' +
				'fastest option and input is real. Execution must belong ' +
				'to same workflow.',
		),
	mockInput: z
		.array(z.record(z.unknown()))
		.optional()
		.describe(
			'Items to feed target node, skipping every node above it. Good for ' +
				'studying one node on its own: probing edge case, or holding input ' +
				'still while upstream data changes between runs. Result shows node ' +
				'handles THIS input; shows nothing about what workflow really ' +
				'produces, so use reuseExecutionId or chain run when that is the ' +
				'question. This does not make write node safe: node still runs for ' +
				'real, only its input is invented.',
		),
	toolArguments: z
		.union([z.string(), z.record(z.unknown())])
		.optional()
		.describe(
			'Only for tool node: arguments an agent would pass it. Keys are ' +
				"tool's $fromAI argument names. Pass plain string for tool that takes " +
				'one free-text input (Wikipedia, Code Tool, vector store used as ' +
				'tool). Required when node declares $fromAI arguments, because ' +
				'tool runs with empty arguments otherwise.',
		),
	versionId: z
		.string()
		.optional()
		.describe('Run past version of workflow instead of current draft'),
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
			'Analyze failed execution with structured diagnostics. When node failed, ' +
				"`failedNode.resolvedParameters` includes that node's raw parameters, same " +
				'tree with expressions substituted, and lists of expressions that threw or resolved to empty values',
		),
	executionId: z.string().describe('Execution ID'),
});

const getNodeOutputAction = z.object({
	action: z
		.literal('get-node-output')
		.describe(
			"Retrieve raw output of specific node from execution, grouped per output (e.g. a Filter's Kept and Discarded). All outputs listed, including outputs with no downstream connection; only items on connected output continue through workflow.",
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
		.describe('Max items to return (default 10, max 50)'),
});

const getResolvedNodeParametersAction = z.object({
	action: z
		.literal('get-resolved-node-parameters')
		.describe(
			"Replay expression resolution for node's parameters against past execution. " +
				'Returns raw `parameters`, `resolved` tree, `failedExpressions`, and ' +
				'`emptyResolutions` (resolved to `null`/`undefined`/`""` — common silent ' +
				'cause of empty downstream fields). Use when debugging why node received ' +
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
		.describe('Which run of node to use, if it ran multiple times (default: last run)'),
});

const stopAction = z.object({
	action: z.literal('stop').describe('Cancel a running workflow execution'),
	executionId: z.string().describe('Execution ID'),
});

const actions = [
	listAction,
	getAction,
	runAction,
	runStepAction,
	debugAction,
	getNodeOutputAction,
	getResolvedNodeParametersAction,
	stopAction,
] as const;

type Input = z.infer<(typeof actions)[number]>;

interface ExecutionsToolOptions {
	allowedActions?: ReadonlyArray<Input['action']>;
	description?: string;
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
 * Appended to every description, a custom one too: each caller reads
 * executions redacted for its user.
 */
const REDACTED_RESULT_GUIDANCE =
	' A result with `redaction` set carries no output items: n8n hides that ' +
	"execution's data from this user, e.g. because node uses colleague's " +
	'personal credential. Tell user so. Do not read empty result as bug, ' +
	'and do not try to get data another way.';

export function createExecutionsTool(
	context: InstanceAiContext,
	options: ExecutionsToolOptions = {},
) {
	const inputSchema = restrictToolActions(actions, options.allowedActions);

	return new Tool(DOMAIN_TOOL_IDS.EXECUTIONS)
		.legacyNames(...getLegacyBuilderToolNames(DOMAIN_TOOL_IDS.EXECUTIONS))
		.description(
			(options.description ??
				'Manage workflow executions — list, inspect, run, run one node, debug, ' +
					'get node output, get resolved node parameters for past run, and stop. ' +
					'action="run" is how you satisfy "trigger/run my <workflow>": find workflow with ' +
					'workflow_builder_workflows(action="list"), then run it here with user\'s values as inputData — ' +
					'do not treat such request as request to build something. ' +
					'To verify workflow you built, use workflow_builder_verify_built_workflow, not action="run". ' +
					'Reserve action="run" for runs user explicitly asked for: it runs workflow live with no pin data and prompts user for approval. ' +
					'action="run-step" runs single node of saved workflow, like canvas ' +
					'"Execute step" button. Use it to see what one node really returns — when ' +
					'debugging read node that failed real execution, pass reuseExecutionId so ' +
					'node re-runs on data it actually received. It runs for real, so do ' +
					'not point it at node that writes.') + REDACTED_RESULT_GUIDANCE,
		)
		.input(inputSchema)
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
