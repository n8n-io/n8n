/**
 * Consolidated executions tool — list, get, run, listen, debug, get-node-output,
 * get-resolved-node-parameters, stop.
 */
import { Tool } from '@n8n/agents';
import {
	buildRunWorkflowSessionGrantKey,
	instanceAiApprovalResumeSchema,
	instanceAiConfirmationSeveritySchema,
	testListenerCardSchema,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_TIMEOUT_MS = 600_000;

// ── Action schemas ─────────────────────────────────────────────────────────

const listAction = z.object({
	action: z.literal('list').describe('List recent workflow executions'),
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
	action: z.literal('get').describe('Get execution status without blocking (poll running ones)'),
	executionId: z.string().describe('Execution ID'),
});

const runAction = z.object({
	action: z.literal('run').describe('Execute a workflow and wait for completion'),
	workflowId: z.string().describe('Workflow ID'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			'Input data passed to the workflow trigger. Works for ANY trigger type — ' +
				'the system injects inputData as the trigger node output, bypassing the need for a real event. ' +
				'For webhook triggers, a flat inputData is treated as the request body (placed under `body`; ' +
				'`query`, `headers` and `params` stay empty). To exercise $json.query.*, $json.headers.* or ' +
				'$json.params.*, pass the request envelope { body: {...}, query: {...}, headers: {...}, params: {...} } instead. ' +
				'For event-based triggers (e.g. Linear, GitHub, Slack), pass inputData matching ' +
				'the shape the trigger would emit (e.g. { action: "create", data: { ... } }).',
		),
	triggerNodeName: z
		.string()
		.optional()
		.describe(
			'Name of the trigger node to start the run from. REQUIRED when the workflow has ' +
				'more than one trigger: without it a single trigger is auto-detected and the other ' +
				"triggers' branches never run. To run each branch, call run once per trigger. " +
				"Trigger names come from build-workflow's `triggerNodes` or " +
				'workflows(action="get-as-code"). Never disable, delete, or otherwise edit a saved ' +
				'workflow to reach a branch — use this instead.',
		),
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
		.describe('Retrieve raw output of a specific node from an execution'),
	executionId: z.string().describe('Execution ID'),
	nodeName: z.string().describe("Name of the node (must exist in the execution's workflow)"),
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
	nodeName: z.string().describe("Name of the node (must exist in the execution's workflow)"),
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

const listenAction = z.object({
	action: z
		.literal('listen')
		.describe(
			'Arm the test URL of a Webhook or Form Trigger, wait for one real request, and return the execution it started. The workflow stays unpublished.',
		),
	workflowId: z.string().describe('Workflow ID'),
	triggerNodeName: runAction.shape.triggerNodeName,
});

const stopAction = z.object({
	action: z.literal('stop').describe('Cancel a running workflow execution'),
	executionId: z.string().describe('Execution ID'),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		listAction,
		getAction,
		runAction,
		listenAction,
		debugAction,
		getNodeOutputAction,
		getResolvedNodeParametersAction,
		stopAction,
	]),
);

type Input = z.infer<typeof inputSchema>;

// ── Suspend / resume schemas (used by `run` and `listen`) ──────────────────

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	/** Renders the "waiting for a test request" card instead of an approval. */
	testListener: testListenerCardSchema.optional(),
});

type SuspendPayload = z.infer<typeof suspendSchema>;
type Suspend = (payload: SuspendPayload) => Promise<never>;

/** Listeners this tool instance armed, keyed by the workflow ID the agent passed. */
type ArmedListeners = Map<string, { armedAt: string; card: SuspendPayload; earlyAnswers?: number }>;
/** Premature "I sent the request" answers tolerated before the tool hands the turn back. */
const MAX_EARLY_LISTENER_ANSWERS = 2;

/** Includes `scope` for "always allow" session grants (see handler). */
const resumeSchema = instanceAiApprovalResumeSchema;

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleList(context: InstanceAiContext, input: Extract<Input, { action: 'list' }>) {
	const executions = await context.executionService.list({
		workflowId: input.workflowId,
		status: input.status,
		limit: input.limit,
	});
	return { executions };
}

async function handleGet(context: InstanceAiContext, input: Extract<Input, { action: 'get' }>) {
	return await context.executionService.getStatus(input.executionId);
}

function normalizeWorkflowName(name: string): string {
	return name.trim().toLowerCase();
}

function hasWorkflowName(
	allowList: ReadonlySet<string>,
	workflowName: string | undefined,
): boolean {
	if (!workflowName) return false;

	const normalizedWorkflowName = normalizeWorkflowName(workflowName);
	for (const allowedName of allowList) {
		if (normalizeWorkflowName(allowedName) === normalizedWorkflowName) return true;
	}

	return false;
}

async function findAllowedWorkflowByName(
	context: InstanceAiContext,
	allowList: ReadonlySet<string> | undefined,
): Promise<{ id: string; name: string } | undefined> {
	if (process.env.E2E_TESTS !== 'true' || allowList === undefined) return undefined;

	for (const allowedName of allowList) {
		const { workflows } = await context.workflowService.list({ query: allowedName, limit: 10 });
		const match = workflows.find((workflow) => hasWorkflowName(allowList, workflow.name));
		if (match) return { id: match.id, name: match.name };
	}

	return undefined;
}

type RunGate =
	| { kind: 'blocked' }
	| { kind: 'denied' }
	| { kind: 'needs-approval'; workflowName: string }
	| { kind: 'allowed'; workflowId: string; workflowName: string | undefined };

/**
 * Permission gate shared by `run` and `listen`. Both start an execution of the
 * named workflow under the user's authority, so both honour the same admin
 * policy, allow-lists, and session grants.
 */
async function resolveRunGate(
	context: InstanceAiContext,
	requestedWorkflowId: string,
	resumeData: z.infer<typeof resumeSchema> | undefined,
): Promise<RunGate> {
	if (context.permissions?.runWorkflow === 'blocked') {
		return { kind: 'blocked' };
	}

	// `always_allow` is only honored for the workflow IDs the caller pre-authorized.
	// Checkpoint follow-ups pass an explicit allow-list (the workflows the checkpoint is
	// verifying). When the allow-list is unset (e.g. planned-build follow-ups, which grant
	// `runWorkflow: 'always_allow'` without one), the bypass is scoped to the workflows the
	// agent created during the active plan cycle. Running any other pre-existing workflow
	// still requires HITL approval, so a prompt injection can't silently run arbitrary
	// workflows under the user's authority.
	const allowList = context.allowedRunWorkflowIds;
	const workflowNameAllowList = context.allowedRunWorkflowNames;
	let workflowName: string | undefined;
	let workflowId = requestedWorkflowId;
	const getWorkflowName = async () => {
		workflowName ??= await context.workflowService
			.get(workflowId)
			.then((wf) => wf.name)
			.catch(() => undefined);
		return workflowName;
	};
	let allowedByName =
		context.permissions?.runWorkflow === 'always_allow' &&
		workflowNameAllowList !== undefined &&
		hasWorkflowName(workflowNameAllowList, await getWorkflowName());
	if (
		context.permissions?.runWorkflow === 'always_allow' &&
		workflowNameAllowList !== undefined &&
		!allowedByName &&
		workflowName === undefined
	) {
		const fallbackWorkflow = await findAllowedWorkflowByName(context, workflowNameAllowList);
		if (fallbackWorkflow) {
			workflowId = fallbackWorkflow.id;
			workflowName = fallbackWorkflow.name;
			allowedByName = true;
		}
	}
	const allowedByList =
		allowList !== undefined
			? allowList.has(workflowId)
			: (context.aiCreatedWorkflowIds?.has(workflowId) ?? false);
	const allowedByScope =
		context.requireRunWorkflowApproval !== true &&
		context.permissions?.runWorkflow === 'always_allow' &&
		(allowedByList || allowedByName);

	// A per-workflow "always allow" grant skips HITL for the rest of the session, but an
	// admin's `requireRunWorkflowApproval` always wins - same gate as `allowedByScope`.
	const grantKey = buildRunWorkflowSessionGrantKey(workflowId);
	const allowedBySessionGrant =
		context.requireRunWorkflowApproval !== true &&
		context.sessionApprovedToolKeys?.has(grantKey) === true;
	const needsApproval = !allowedByScope && !allowedBySessionGrant;

	// Approval is required and this is the first call
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return {
			kind: 'needs-approval',
			workflowName: (await getWorkflowName()) ?? requestedWorkflowId,
		};
	}

	// Resumed with denial
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return { kind: 'denied' };
	}

	// "Always allow" — persist the grant so subsequent runs of this workflow skip HITL.
	if (resumeData?.approved && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(grantKey);
	}

	return { kind: 'allowed', workflowId, workflowName: await getWorkflowName() };
}

async function handleRun(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'run' }>,
	resumeData: z.infer<typeof resumeSchema> | undefined,
	suspend: Suspend,
	abortSignal?: AbortSignal,
) {
	const gate = await resolveRunGate(context, input.workflowId, resumeData);
	if (gate.kind === 'blocked' || gate.kind === 'denied') {
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: gate.kind === 'blocked' ? 'Action blocked by admin' : 'User denied the action',
		};
	}
	if (gate.kind === 'needs-approval') {
		return await suspend({
			requestId: nanoid(),
			message: `Execute ${gate.workflowName} (ID: ${input.workflowId})`,
			severity: 'warning' as const,
		});
	}

	// Approved or always_allow — execute
	return await context.executionService.run(gate.workflowId, input.inputData, {
		timeout: input.timeout,
		triggerNodeName: input.triggerNodeName,
		abortSignal,
	});
}

/**
 * Arm a trigger's test URL and suspend on a listener card. The card settles when
 * the browser sees the `testWebhookReceived` push, when the user clicks
 * "I sent the request", or when the user cancels. The outcome is read from
 * durable state (registration, executions), never from the click alone.
 */
async function handleListen(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'listen' }>,
	resumeData: z.infer<typeof resumeSchema> | undefined,
	suspend: Suspend,
	listeners: ArmedListeners,
) {
	const { executionService } = context;
	if (!executionService.armTestListener || !executionService.resolveTestListener) {
		return {
			state: 'unsupported' as const,
			reason:
				'This instance cannot arm test listeners. Ask the user to test the trigger from the editor.',
		};
	}

	// Phase 2: the listener card was answered.
	const armed = listeners.get(input.workflowId);
	if (armed && resumeData) {
		const executionId =
			typeof resumeData.userInput === 'string' && resumeData.userInput.length > 0
				? resumeData.userInput
				: undefined;
		const outcome = await executionService.resolveTestListener(
			armed.card.testListener?.workflowId ?? input.workflowId,
			{
				armedAt: armed.armedAt,
				executionId,
				cancel: !resumeData.approved,
			},
		);
		if (outcome.state === 'armed') {
			// "I sent the request" before anything arrived: keep waiting on a fresh card, but not
			// forever — a client that answers every card at once would otherwise loop here.
			armed.earlyAnswers = (armed.earlyAnswers ?? 0) + 1;
			if (armed.earlyAnswers <= MAX_EARLY_LISTENER_ANSWERS) {
				armed.card = { ...armed.card, requestId: nanoid() };
				return await suspend(armed.card);
			}
			listeners.delete(input.workflowId);
			return {
				state: 'armed' as const,
				listenerCleared: false,
				reason: `No request has reached the test URL yet. The listener stays armed until ${armed.card.testListener?.deadlineAt ?? 'the deadline'}; call action="listen" again to keep waiting.`,
			};
		}
		listeners.delete(input.workflowId);
		if (outcome.state === 'received') {
			return { state: 'received' as const, ...outcome.result };
		}
		return {
			state: outcome.state,
			listenerCleared: true,
			reason:
				outcome.state === 'cancelled'
					? 'The user cancelled the test listener.'
					: `No request reached the test URL before ${armed.card.testListener?.deadlineAt ?? 'the deadline'}. Call action="listen" again to re-arm.`,
		};
	}

	// Phase 1: permission gate, then arm.
	const gate = await resolveRunGate(context, input.workflowId, resumeData);
	if (gate.kind === 'blocked' || gate.kind === 'denied') {
		return {
			state: 'denied' as const,
			reason: gate.kind === 'blocked' ? 'Action blocked by admin' : 'User denied the action',
		};
	}
	if (gate.kind === 'needs-approval') {
		return await suspend({
			requestId: nanoid(),
			message: `Listen for a test request to ${gate.workflowName} (ID: ${input.workflowId})`,
			severity: 'warning' as const,
		});
	}

	const listener = await executionService.armTestListener(gate.workflowId, {
		triggerNodeName: input.triggerNodeName,
	});
	const card: SuspendPayload = {
		requestId: nanoid(),
		message: `Waiting for a test request to ${gate.workflowName ?? gate.workflowId}`,
		severity: 'info' as const,
		testListener: {
			workflowId: gate.workflowId,
			triggers: listener.triggers,
			deadlineAt: listener.deadlineAt,
		},
	};
	listeners.set(input.workflowId, { armedAt: listener.armedAt, card });
	return await suspend(card);
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
	const listeners: ArmedListeners = new Map();
	return new Tool('executions')
		.description(
			'Manage workflow executions — list, inspect, run, listen, debug, get node output, ' +
				'get resolved node parameters for a past run, and stop. ' +
				'action="run" is how you satisfy "trigger/run my <workflow>": find the workflow with ' +
				'workflows(action="list"), then run it here with the user\'s values as inputData — ' +
				'do not treat such a request as a request to build something. ' +
				'To verify a workflow you built, use verify-built-workflow, not action="run". ' +
				'Reserve action="run" for runs the user explicitly asked for: it runs the workflow live with no pin data and prompts the user for approval. ' +
				'action="listen" arms the test URL of a Webhook or Form Trigger and waits for one real request ' +
				'(curl, a browser form, a third-party callback), then returns the execution it started. ' +
				'Use it instead of action="run" when the trigger\'s auth, query parameters, response mode, or form must be exercised for real; ' +
				'the workflow stays unpublished and the listener clears itself at the stated deadline.',
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
				case 'listen':
					return await handleListen(context, input, ctx.resumeData, ctx.suspend, listeners);
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
