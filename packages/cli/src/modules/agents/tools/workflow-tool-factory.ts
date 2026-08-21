import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	getWorkflowToolIncompatibilityReason,
	WORKFLOW_WAIT_ACTION_CANCEL,
	WORKFLOW_WAIT_ACTION_CHECK,
	WORKFLOW_WAIT_SUSPEND_TYPE,
	type AgentJsonToolConfig,
	type SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
} from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { sleep } from '@n8n/utils/sleep';
import type {
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IPinData,
	IRun,
	IRunData,
	ITaskData,
	IWorkflowExecutionDataProcess,
	RelatedAgentRun,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	isTerminalExecutionStatus,
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	TimeoutExecutionCancelledError,
	WAIT_INDEFINITELY,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';
import { z } from 'zod';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { WebhookResponseRelay } from '@/scaling/webhook-response-relay';
import type { WorkflowRunner } from '@/workflow-runner';

import type { InstrumentToolAdditionalData } from '../agent-runtime-instrumentation';
import { sanitizeToolName } from '../json-config/agent-config-composition';
import type {
	WorkflowToolWorkflowLoader,
	WorkflowToolWorkflowReference,
} from './workflow-tool-workflow-loader.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Map a supported trigger node type to the input-schema key the workflow tool
 * builds against. Keys are sourced from `SUPPORTED_WORKFLOW_TOOL_TRIGGERS` in
 * `@n8n/api-types` so the backend compatibility check and the frontend
 * Available list can't drift.
 */
const SUPPORTED_TRIGGERS: Record<string, string> = {
	[MANUAL_TRIGGER_NODE_TYPE]: 'manual',
	[EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE]: 'executeWorkflow',
	[CHAT_TRIGGER_NODE_TYPE]: 'chat',
	[FORM_TRIGGER_NODE_TYPE]: 'form',
	[WEBHOOK_NODE_TYPE]: 'webhook',
};

// Compile-time check: `SUPPORTED_TRIGGERS` must cover every trigger the shared
// list declares. Adding a trigger to `SUPPORTED_WORKFLOW_TOOL_TRIGGERS` without
// adding its input-schema mapping here will fail this assertion.
const _assertSupportedTriggersInSync: Record<
	(typeof SUPPORTED_WORKFLOW_TOOL_TRIGGERS)[number],
	string
> = SUPPORTED_TRIGGERS;
void _assertSupportedTriggersInSync;

const DEFAULT_TIMEOUT_MS = 120_000;

/** Only a bounded wait due within this window is blocked on; longer ones go to HITL. */
const WAIT_POLL_ELIGIBLE_MS = 60_000;

/** How often `WaitTracker` sweeps for due executions, which is what resumes them. */
const WAIT_TRACKER_SWEEP_MS = 60_000;

const WAIT_POLL_INTERVAL_MS = 2_000;

/** `buildSuspendCardPayload` passes this through verbatim, so it doubles as the HITL card spec. */
const WAIT_SUSPEND_SCHEMA = z.object({
	type: z.literal(WORKFLOW_WAIT_SUSPEND_TYPE),
	title: z.string(),
	components: z.array(z.object({ type: z.string() }).catchall(z.unknown())),
});

/**
 * `Tool` only yields an interruptible context when both schemas are Zod, so this
 * mirrors `INTERACTIVE_CARD_RESUME_JSON_SCHEMA` — the shape card clicks arrive in.
 */
const WAIT_RESUME_SCHEMA = z.object({
	type: z.string().optional(),
	id: z.string().optional(),
	value: z.string().optional(),
});

/** Private state carried across the suspension; never shown to the model. */
const WAIT_CONTINUATION_SCHEMA = z.object({ executionId: z.string() });

type WaitSuspendPayload = z.infer<typeof WAIT_SUSPEND_SCHEMA>;
type WaitToolContext = InterruptibleToolContext<
	WaitSuspendPayload,
	z.infer<typeof WAIT_RESUME_SCHEMA>
>;

interface WorkflowWaitState {
	/** When the wait expires. Absent for an indefinite wait. */
	waitTill?: Date;
}

/** Tool-facing result — exactly the tool's declared output schema. */
interface WorkflowToolResult {
	executionId: string;
	status: string;
	data?: Record<string, unknown>;
	error?: string;
	/** Explains a non-obvious outcome to the model, e.g. that the user stopped waiting. */
	note?: string;
}

/** Internal result, carrying wait details that are stripped before the model sees them. */
export interface WorkflowToolExecutionResult extends WorkflowToolResult {
	wait?: WorkflowWaitState;
}

function isWorkflowToolResponse(value: unknown): value is IExecuteResponsePromiseData {
	return isRecord(value) && ('body' in value || 'headers' in value || 'statusCode' in value);
}

// ---------------------------------------------------------------------------
// Context passed from the compile step
// ---------------------------------------------------------------------------

export type WorkflowToolExecutionMode = Extract<WorkflowExecuteMode, 'manual' | 'integrated'>;

export interface WorkflowToolContext {
	workflowLoader: WorkflowToolWorkflowLoader;
	workflowRunner: WorkflowRunner;
	activeExecutions: ActiveExecutions;
	projectId: string;
	executionMode: WorkflowToolExecutionMode;
	/** Base URL for webhooks/forms (e.g. http://localhost:5678/) */
	webhookBaseUrl?: string;
	agentId?: string;
	/** Chat platform the run came from, if any. */
	integrationType?: string;
	userId?: string;
	/** Whether a suspension can be resumed at all. Defaults to true. */
	supportsHitl?: boolean;
	/** Eval-only additionalData decoration for the sub-execution — absent on every production path. */
	instrumentToolAdditionalData?: InstrumentToolAdditionalData;
}

/** {@link WorkflowToolContext} plus fields that only exist once a run does. */
export interface WorkflowToolRunContext extends WorkflowToolContext {
	/** Stamped onto sub-executions so a Wait node finishing can wake this run. */
	agentRun?: RelatedAgentRun;
}

// ---------------------------------------------------------------------------
// 1. detectTriggerNode
// ---------------------------------------------------------------------------

interface DetectedTrigger {
	node: INode;
	triggerType: string;
}

export function detectTriggerNode(workflow: WorkflowEntity): DetectedTrigger {
	const nodes = workflow.nodes ?? [];

	for (const node of nodes) {
		const triggerType = SUPPORTED_TRIGGERS[node.type];
		if (triggerType) {
			return { node, triggerType };
		}
	}

	throw new Error(
		`Workflow "${workflow.name}" has no supported trigger node. ` +
			`Supported triggers: ${Object.keys(SUPPORTED_TRIGGERS).join(', ')}`,
	);
}

// ---------------------------------------------------------------------------
// 2. validateCompatibility
// ---------------------------------------------------------------------------

export function validateCompatibility(workflow: WorkflowEntity): void {
	const incompatibility = getWorkflowToolIncompatibilityReason(workflow);
	if (!incompatibility) return;

	if (incompatibility.reason === 'incompatible_nodes') {
		// Re-resolve node names here (the shared function only returns types) so the
		// thrown message stays actionable for a developer reading the agent log.
		// Skip disabled nodes — they don't execute, so they aren't the problem.
		const nodes = workflow.nodes ?? [];
		const names = nodes
			.filter((n) => !n.disabled && incompatibility.nodeTypes.includes(n.type))
			.map((n) => `${n.name} (${n.type})`)
			.join(', ');
		throw new Error(
			`Workflow "${workflow.name}" contains nodes that aren't supported as agent tools: ${names}. ` +
				'Remove them or pick another workflow.',
		);
	}

	// `no_supported_trigger` — surface the supported set so the message is fixable.
	throw new Error(
		`Workflow "${workflow.name}" has no supported trigger node. ` +
			`Supported triggers: ${Object.keys(SUPPORTED_TRIGGERS).join(', ')}`,
	);
}

// ---------------------------------------------------------------------------
// 3. normalizeTriggerInput
// ---------------------------------------------------------------------------

export function normalizeTriggerInput(
	triggerNode: INode,
	triggerType: string,
	inputData: Record<string, unknown>,
	executionMode: WorkflowToolExecutionMode,
): IPinData {
	switch (triggerType) {
		case 'chat':
			return {
				[triggerNode.name]: [
					{
						json: {
							sessionId: `agent-${Date.now()}`,
							action: 'sendMessage',
							chatInput:
								typeof inputData.message === 'string'
									? inputData.message
									: JSON.stringify(inputData),
						},
					},
				],
			};

		case 'webhook': {
			const { body, headers, params, query } = inputData;
			return {
				[triggerNode.name]: [
					{
						json: {
							headers: isRecord(headers) ? headers : {},
							params: isRecord(params) ? params : {},
							query: isRecord(query) ? query : {},
							body: isRecord(body) ? body : inputData,
							webhookUrl: '',
							executionMode: executionMode === 'manual' ? 'test' : 'production',
						},
					},
				],
			};
		}

		default:
			// manual, executeWorkflow, and any other trigger type
			return {
				[triggerNode.name]: [{ json: inputData as IDataObject }],
			};
	}
}

// ---------------------------------------------------------------------------
// 4. inferInputSchema
// ---------------------------------------------------------------------------

/** Map an n8n-field primitive type to the matching Zod type. */
function fieldTypeToZod(type: string | undefined, label: string): z.ZodTypeAny {
	switch (type) {
		case 'number':
			return z.number().describe(label);
		case 'boolean':
			return z.boolean().describe(label);
		default:
			return z.string().describe(label);
	}
}

/** Derive a Zod schema from a trigger's declared `workflowInputs.values`. */
function schemaFromWorkflowInputs(triggerNode: INode): z.ZodObject<z.ZodRawShape> | null {
	const params = triggerNode.parameters ?? {};
	const workflowInputs = params.workflowInputs as
		| { values?: Array<{ name: string; type?: string }> }
		| undefined;

	if (!workflowInputs?.values?.length) return null;

	const shape: z.ZodRawShape = {};
	for (const field of workflowInputs.values) {
		if (!field.name) continue;
		shape[field.name] = fieldTypeToZod(field.type, field.name);
	}
	return Object.keys(shape).length > 0 ? z.object(shape) : null;
}

/** Derive a Zod schema from a trigger's `jsonExample` passthrough config. */
function schemaFromJsonExample(triggerNode: INode): z.ZodObject<z.ZodRawShape> | null {
	const jsonExample = triggerNode.parameters?.jsonExample as string | undefined;
	if (!jsonExample) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonExample);
	} catch {
		return null;
	}
	if (typeof parsed !== 'object' || parsed === null) return null;

	const shape: z.ZodRawShape = {};
	for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
		shape[key] = fieldTypeToZod(typeof value, key);
	}
	return Object.keys(shape).length > 0 ? z.object(shape) : null;
}

export function inferInputSchema(
	triggerNode: INode,
	triggerType: string,
): z.ZodObject<z.ZodRawShape> {
	switch (triggerType) {
		case 'chat':
			return z.object({ message: z.string() });

		case 'manual':
			return z.object({ input: z.string().optional() });

		case 'form':
			return z.object({
				reason: z.string().optional().describe('Why the user should fill out this form'),
			});

		case 'executeWorkflow':
			return (
				schemaFromWorkflowInputs(triggerNode) ??
				schemaFromJsonExample(triggerNode) ??
				z.object({}).catchall(z.unknown())
			);

		default:
			return z.object({}).catchall(z.unknown());
	}
}

// ---------------------------------------------------------------------------
// 5. executeWorkflow
// ---------------------------------------------------------------------------

export async function executeWorkflow(
	workflow: WorkflowEntity,
	triggerNode: INode,
	triggerType: string,
	inputData: Record<string, unknown>,
	context: WorkflowToolRunContext,
	allOutputs = false,
	/** Sanitized tool name for eval instrumentation; set only on instrumented runs. */
	instrumentedToolName?: string,
): Promise<WorkflowToolExecutionResult> {
	const { workflowRunner, activeExecutions } = context;

	// Build pin data for the trigger
	const triggerPinData = normalizeTriggerInput(
		triggerNode,
		triggerType,
		inputData,
		context.executionMode,
	);
	const workflowData =
		workflow.pinData === undefined ? workflow : { ...workflow, pinData: undefined };

	// Build execution data following Instance AI adapter's pattern
	const runData: IWorkflowExecutionDataProcess = {
		executionMode: context.executionMode,
		workflowData,
		startNodes: [{ name: triggerNode.name, sourceData: null }],
		pinData: triggerPinData,
		executionData: createRunExecutionData({
			...(context.agentRun ? { parentAgentRun: context.agentRun } : {}),
			startData: {},
			resultData: { pinData: triggerPinData, runData: {} },
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [
					{
						node: triggerNode,
						data: { main: [triggerPinData[triggerNode.name]] },
						source: null,
					},
				],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		}),
	};

	// Eval runs decorate the sub-execution's additionalData (HTTP mock handler,
	// mocked credentials helper). The closure does not survive queue
	// serialization — eval callers refuse queue mode upfront.
	const instrument = context.instrumentToolAdditionalData;
	if (instrument && instrumentedToolName) {
		runData.configureAdditionalData = (additionalData) => {
			instrument(additionalData, { toolName: instrumentedToolName, toolKind: 'workflow' });
		};
	}

	const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
	let webhookResponse: IExecuteResponsePromiseData | undefined;
	void responsePromise.promise
		.then((response) => {
			webhookResponse = response;
		})
		.catch(() => {});

	const executionId = await workflowRunner.run(
		runData,
		undefined,
		undefined,
		undefined,
		responsePromise,
	);

	// Wait for completion with timeout protection
	const timeoutMs = DEFAULT_TIMEOUT_MS;

	let completedRun: IRun | undefined;
	if (activeExecutions.has(executionId)) {
		let timeoutId: NodeJS.Timeout | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error(`Execution timed out after ${timeoutMs}ms`));
			}, timeoutMs);
		});

		try {
			completedRun = await Promise.race([
				activeExecutions.getPostExecutePromise(executionId),
				timeoutPromise,
			]);
			clearTimeout(timeoutId);
		} catch (error) {
			clearTimeout(timeoutId);
			if (error instanceof Error && error.message.includes('timed out')) {
				try {
					activeExecutions.stopExecution(
						executionId,
						new TimeoutExecutionCancelledError(executionId),
					);
				} catch {
					// Execution may have completed between timeout and cancel
				}
				return {
					executionId,
					status: 'error',
					error: `Execution timed out after ${timeoutMs}ms and was cancelled`,
				};
			}
			throw error;
		}
	}

	const result =
		completedRun && context.executionMode === 'integrated'
			? formatResult(executionId, completedRun.status, completedRun.data, allOutputs)
			: await extractResult(executionId, allOutputs);
	if (isWorkflowToolResponse(webhookResponse)) {
		const response = await Container.get(WebhookResponseRelay).restoreOffloadedBody(
			webhookResponse,
			{ reclaim: true, context: { workflowId: workflow.id, executionId } },
		);
		result.data = {
			...(result.data ?? {}),
			response: truncateWebhookResponse(response),
		};
	}
	return result;
}

// ---------------------------------------------------------------------------
// 6. extractResult
// ---------------------------------------------------------------------------

/** Map an execution's raw status into the tool's simplified status value. */
function normaliseExecutionStatus(status: string | undefined): string {
	if (status === 'error' || status === 'crashed') return 'error';
	if (status === 'running' || status === 'new') return 'running';
	if (status === 'waiting') return 'waiting';
	return 'success';
}

/** Extract the JSON items produced by the last run of a node. */
function outputItemsFromNodeRuns(nodeRuns: ITaskData[]): unknown[] {
	const lastRun = nodeRuns[nodeRuns.length - 1];
	if (!lastRun?.data?.main) return [];
	return lastRun.data.main.flatMap((items) => items ?? []).map((item) => item.json);
}

/** Build the resultData map from an execution's runData, scoped by `allOutputs`. */
function collectResultData(runData: IRunData, allOutputs: boolean): Record<string, unknown> {
	const resultData: Record<string, unknown> = {};

	if (allOutputs) {
		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			const outputItems = outputItemsFromNodeRuns(nodeRuns);
			if (outputItems.length > 0) {
				resultData[nodeName] = outputItems;
			}
		}
		return resultData;
	}

	const nodeNames = Object.keys(runData);
	const lastNodeName = nodeNames[nodeNames.length - 1];
	if (lastNodeName) {
		const outputItems = outputItemsFromNodeRuns(runData[lastNodeName]);
		if (outputItems.length > 0) {
			resultData[lastNodeName] = outputItems;
		}
	}
	return resultData;
}

function formatResult(
	executionId: string,
	status: string | undefined,
	data: IRun['data'] | undefined,
	allOutputs: boolean,
): WorkflowToolExecutionResult {
	const runData = data?.resultData?.runData;
	const resultData = runData ? collectResultData(runData, allOutputs) : {};
	const normalisedStatus = normaliseExecutionStatus(status);
	const wait = normalisedStatus === 'waiting' ? extractWaitState(data) : undefined;

	return {
		executionId,
		status: normalisedStatus,
		data: Object.keys(resultData).length > 0 ? resultData : undefined,
		error: data?.resultData?.error?.message,
		...(wait ? { wait } : {}),
	};
}

export async function extractResult(
	executionId: string,
	allOutputs: boolean,
): Promise<WorkflowToolExecutionResult> {
	const execution = await Container.get(ExecutionPersistence).findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	if (!execution) {
		return { executionId, status: 'unknown' };
	}

	return formatResult(executionId, execution.status, execution.data, allOutputs);
}

// ---------------------------------------------------------------------------
// Webhook response safeguards
// ---------------------------------------------------------------------------

/**
 * Describes webhook bodies that cannot safely enter the textual result path.
 * Headers and status code pass through.
 *
 * @remarks A Buffer body is described without being serialized at all:
 * `JSON.stringify` turns it into one array element per byte, which costs about
 * twelve times the body and throws above V8's max string length. A body
 * `JSON.stringify` rejects (a cycle, a BigInt) is described bare, with neither
 * length nor preview.
 */
function truncateWebhookResponse(response: IExecuteResponsePromiseData): unknown {
	const { body, ...rest } = response;

	if (Buffer.isBuffer(body)) {
		return { ...rest, body: { _truncated: true, _byteLength: body.length } };
	}

	try {
		JSON.stringify(body);
	} catch {
		return { ...rest, body: { _truncated: true } };
	}
	return response;
}

// ---------------------------------------------------------------------------
// Wait-node handoff
// ---------------------------------------------------------------------------

/** All-or-nothing: a partial marker would leave the resume path guessing. */
function agentRunOf(
	context: WorkflowToolContext,
	ctx: WaitToolContext,
): RelatedAgentRun | undefined {
	const threadId = ctx.persistence?.threadId;
	if (!context.agentId || !threadId || !ctx.runId || !ctx.toolCallId) return undefined;

	return {
		agentId: context.agentId,
		projectId: context.projectId,
		threadId,
		runId: ctx.runId,
		toolCallId: ctx.toolCallId,
		...(context.integrationType ? { integrationType: context.integrationType } : {}),
		...(context.userId ? { userId: context.userId } : {}),
	};
}

/**
 * Deliberately excludes the Wait node's signed resume URL: delivering that to the
 * right recipient is the waiting workflow's job, not the calling agent's.
 */
function extractWaitState(data: IRun['data'] | undefined): WorkflowWaitState | undefined {
	if (!data) return undefined;

	// An indefinite wait is a sentinel far-future date, not an absent one — drop it
	// rather than report it as a deadline.
	const waitTill = data.waitTill ? new Date(data.waitTill) : undefined;
	const bounded = waitTill !== undefined && waitTill.getTime() < WAIT_INDEFINITELY.getTime();

	return bounded ? { waitTill } : {};
}

function withoutWaitState(result: WorkflowToolExecutionResult): WorkflowToolResult {
	const { wait: _wait, ...rest } = result;
	return rest;
}

function isPollableWait(wait: WorkflowWaitState | undefined): wait is { waitTill: Date } {
	return (
		wait?.waitTill !== undefined && wait.waitTill.getTime() - Date.now() <= WAIT_POLL_ELIGIBLE_MS
	);
}

/**
 * Polls the database because the resume runs on the leader, which in multi-main is
 * another process. Status only — the data bundle is needed just once the wait ends.
 */
async function pollWaitingExecution(
	executionId: string,
	waitTill: Date,
	allOutputs: boolean,
	abortSignal: AbortSignal | undefined,
): Promise<WorkflowToolExecutionResult | undefined> {
	// The wait's own deadline plus one sweep, never a flat budget: that would sit on
	// a wait due in a second for two more minutes. Clamped so an overdue wait still
	// gets at least one probe.
	const deadline = Math.min(
		Date.now() + DEFAULT_TIMEOUT_MS,
		Math.max(waitTill.getTime(), Date.now()) + WAIT_TRACKER_SWEEP_MS,
	);
	const persistence = Container.get(ExecutionPersistence);

	while (Date.now() < deadline) {
		try {
			await sleep(WAIT_POLL_INTERVAL_MS, abortSignal);
		} catch {
			return undefined; // Aborted mid-sleep; `sleep` rejects rather than resolving.
		}
		// Stop only once the execution is truly finished: a resumed one passes through
		// `running` first, so stopping at "no longer waiting" would hand the model a
		// `running` status and no output.
		const status = (await persistence.findSingleExecution(executionId))?.status;
		if (isTerminalExecutionStatus(status)) return await extractResult(executionId, allOutputs);
	}

	return undefined;
}

function buildWaitCard(
	workflowName: string,
	wait: WorkflowWaitState | undefined,
): WaitSuspendPayload {
	const components: WaitSuspendPayload['components'] = [
		{ type: 'section', text: `The "${workflowName}" workflow is paused, waiting to continue.` },
	];

	if (wait?.waitTill) {
		components.push({
			type: 'fields',
			fields: [{ label: 'Continues at', value: wait.waitTill.toISOString() }],
		});
	}

	components.push(
		{
			type: 'button',
			label: 'Check for the result',
			value: WORKFLOW_WAIT_ACTION_CHECK,
			style: 'primary',
		},
		{
			type: 'button',
			label: 'Stop waiting',
			value: WORKFLOW_WAIT_ACTION_CANCEL,
			style: 'danger',
		},
	);

	return {
		type: WORKFLOW_WAIT_SUSPEND_TYPE,
		title: `Waiting on "${workflowName}"`,
		components,
	};
}

/** True when the user clicked the card's "stop waiting" button. */
function isWaitCancelled(resumeData: WaitToolContext['resumeData']): boolean {
	return resumeData?.value === WORKFLOW_WAIT_ACTION_CANCEL;
}

/** So the model gets the workflow's real output rather than an interim "waiting". */
async function pollIfDueSoon(
	parked: WorkflowToolExecutionResult,
	allOutputs: boolean,
	abortSignal: AbortSignal | undefined,
): Promise<WorkflowToolExecutionResult> {
	if (!isPollableWait(parked.wait)) return parked;

	const settled = await pollWaitingExecution(
		parked.executionId,
		parked.wait.waitTill,
		allOutputs,
		abortSignal,
	);
	return settled ?? parked;
}

// ---------------------------------------------------------------------------
// 7. resolveWorkflowTool — resolve a single workflow tool descriptor
// ---------------------------------------------------------------------------

export async function resolveWorkflowTool(
	descriptor: Extract<AgentJsonToolConfig, { type: 'workflow' }>,
	context: WorkflowToolContext,
): Promise<BuiltTool> {
	return await buildWorkflowTool(descriptor, context);
}

async function buildWorkflowTool(
	descriptor: Extract<AgentJsonToolConfig, { type: 'workflow' }>,
	context: WorkflowToolContext,
): Promise<BuiltTool> {
	const workflowName = descriptor.workflow;
	const initialReference: WorkflowToolWorkflowReference = {
		workflowName,
		...(descriptor.workflowId !== undefined ? { workflowId: descriptor.workflowId } : {}),
	};
	const workflow = await context.workflowLoader.loadWorkflow(context.projectId, initialReference);
	if (!workflow) {
		throw new Error(`Workflow "${workflowName}" not found`);
	}

	validateCompatibility(workflow);
	const { node: triggerNode, triggerType } = detectTriggerNode(workflow);

	// Always run through `toToolName` even when the user supplied `descriptor.name`.
	// Anthropic and OpenAI both require tool names to match `^[a-zA-Z0-9_-]{1,128}$`,
	// so a workflow display name like "D&D Invite" must be sanitized before reaching
	// the model. Schema validation rejects invalid names on save (see
	// `agent-json-config.ts`); this is the runtime safety net for legacy configs.
	const toolName = toToolName(descriptor.name ?? workflowName);
	const toolDescription = descriptor.description ?? `Execute the "${workflowName}" workflow`;
	const inputSchema = inferInputSchema(triggerNode, triggerType);
	const allOutputs = descriptor.allOutputs ?? false;
	const reference: WorkflowToolWorkflowReference = {
		workflowId: workflow.id,
		workflowName: workflow.name,
	};

	// Form triggers return a link — the user fills out the form in their browser,
	// and the workflow executes independently when they submit.
	if (triggerType === 'form') {
		const builder = new Tool(toolName)
			.description(
				toolDescription === `Execute the "${workflowName}" workflow`
					? `Send the user a link to the "${workflowName}" form. The workflow runs automatically when they submit.`
					: toolDescription,
			)
			.input(inputSchema)
			.output(
				z.object({
					status: z.literal('form_link_sent'),
					formUrl: z.string(),
					message: z.string(),
				}),
			)
			.toMessage(
				(output) =>
					({
						type: 'custom',
						components: [
							{
								type: 'section',
								text: `📋 *<${output.formUrl}|Click here to open the form>*`,
							},
						],
					}) as never,
			)
			.handler(async (input: Record<string, unknown>) => {
				const current = await loadCurrentWorkflow(context, reference, triggerType);
				const parsedInput = inferInputSchema(current.triggerNode, current.triggerType).parse(input);
				const formUrl = getFormUrl(current.workflow, current.triggerNode, context.webhookBaseUrl);
				const reason = parsedInput.reason;
				return {
					status: 'form_link_sent' as const,
					formUrl,
					message:
						typeof reason === 'string'
							? reason
							: `Please fill out the ${current.workflow.name} form`,
				};
			});

		const built = builder.build();
		return {
			...built,
			metadata: {
				kind: 'workflow',
				workflowId: workflow.id,
				workflowName: workflow.name,
				triggerType,
			},
		};
	}

	// Standard execution-based tool for all other triggers. A body Wait node parks
	// the sub-execution and hands off to the user — but only where a suspension can
	// be resumed; elsewhere it reports the waiting status instead of parking forever.
	const supportsHitl = context.supportsHitl ?? true;
	const builder = new Tool(toolName)
		.description(toolDescription)
		.input(inputSchema)
		.output(
			z.object({
				executionId: z.string(),
				status: z.string(),
				data: z.record(z.unknown()).optional(),
				error: z.string().optional(),
				note: z.string().optional(),
			}),
		)
		.suspend(WAIT_SUSPEND_SCHEMA)
		.resume(WAIT_RESUME_SCHEMA)
		.handler(async (input: Record<string, unknown>, ctx) => {
			// A continuation means this workflow already ran on without us, so re-running
			// it would be wrong. Skip the reload too: a settled run's output should still
			// come back even if the workflow was archived since.
			const pending = WAIT_CONTINUATION_SCHEMA.safeParse(ctx.continuation);
			let current: Awaited<ReturnType<typeof loadCurrentWorkflow>> | undefined;
			let result: WorkflowToolExecutionResult;

			if (pending.success) {
				result = await extractResult(pending.data.executionId, allOutputs);
			} else {
				current = await loadCurrentWorkflow(context, reference, triggerType);
				result = await executeWorkflow(
					current.workflow,
					current.triggerNode,
					current.triggerType,
					inferInputSchema(current.triggerNode, current.triggerType).parse(input),
					{ ...context, agentRun: agentRunOf(context, ctx) },
					allOutputs,
					toolName,
				);
			}

			// The user gave up on the wait: report where the workflow got to rather
			// than polling or parking again. Re-invoking the tool would start a
			// second execution, so say so.
			if (result.status === 'waiting' && isWaitCancelled(ctx.resumeData)) {
				return {
					...withoutWaitState(result),
					note: 'The user stopped waiting for this workflow. It is still paused — do not start it again.',
				};
			}

			if (result.status === 'waiting') {
				result = await pollIfDueSoon(result, allOutputs, ctx.abortSignal);
			}
			if (result.status !== 'waiting' || !supportsHitl) return withoutWaitState(result);

			current ??= await loadCurrentWorkflow(context, reference, triggerType);
			return await ctx.suspend(buildWaitCard(current.workflow.name, result.wait), {
				continuation: { executionId: result.executionId },
			});
		});

	const built = builder.build();
	return {
		...built,
		metadata: {
			kind: 'workflow',
			workflowId: workflow.id,
			workflowName: workflow.name,
			triggerType,
		},
	};
}

async function loadCurrentWorkflow(
	context: WorkflowToolContext,
	reference: WorkflowToolWorkflowReference,
	expectedTriggerType: string,
) {
	const workflow = await context.workflowLoader.loadWorkflow(context.projectId, reference);
	if (!workflow) {
		throw new Error(`Workflow "${reference.workflowName}" is no longer accessible`);
	}

	validateCompatibility(workflow);
	const { node: triggerNode, triggerType } = detectTriggerNode(workflow);
	if (triggerType !== expectedTriggerType) {
		throw new Error(
			`Workflow "${reference.workflowName}" changed trigger type from ${expectedTriggerType} to ${triggerType}`,
		);
	}

	return { workflow, triggerNode, triggerType };
}

function getFormUrl(
	workflow: WorkflowEntity,
	triggerNode: INode,
	webhookBaseUrl: string | undefined,
): string {
	const directPath = triggerNode.parameters?.path;
	const options: unknown = triggerNode.parameters?.options;
	const optionPath = isRecord(options) ? options.path : undefined;
	const formPath =
		typeof directPath === 'string'
			? directPath
			: typeof optionPath === 'string'
				? optionPath
				: (triggerNode.webhookId ?? workflow.id);
	const baseUrl = (webhookBaseUrl ?? 'http://localhost:5678/').replace(/\/$/, '');
	return `${baseUrl}/form/${formPath}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Re-export the shared sanitiser under the local name used in this file.
 * Lives in `agent-config-composition` so save-time healing and runtime
 * fallback share a single source of truth.
 */
const toToolName = sanitizeToolName;
