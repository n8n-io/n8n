import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import {
	getWorkflowToolIncompatibilityReason,
	type AgentJsonToolConfig,
	type SUPPORTED_WORKFLOW_TOOL_TRIGGERS,
} from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	IDataObject,
	IExecuteResponsePromiseData,
	INode,
	IPinData,
	IRun,
	IRunData,
	ITaskData,
	IWorkflowExecutionDataProcess,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	TimeoutExecutionCancelledError,
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
	/** Eval-only additionalData decoration for the sub-execution — absent on every production path. */
	instrumentToolAdditionalData?: InstrumentToolAdditionalData;
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
	context: WorkflowToolContext,
	allOutputs = false,
	/** Sanitized tool name for eval instrumentation; set only on instrumented runs. */
	instrumentedToolName?: string,
): Promise<{
	executionId: string;
	status: string;
	data?: Record<string, unknown>;
	error?: string;
}> {
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
) {
	const runData = data?.resultData?.runData;
	const resultData = runData ? collectResultData(runData, allOutputs) : {};

	return {
		executionId,
		status: normaliseExecutionStatus(status),
		data: Object.keys(resultData).length > 0 ? resultData : undefined,
		error: data?.resultData?.error?.message,
	};
}

export async function extractResult(
	executionId: string,
	allOutputs: boolean,
): Promise<{
	executionId: string;
	status: string;
	data?: Record<string, unknown>;
	error?: string;
}> {
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

	// Standard execution-based tool for all other triggers
	const builder = new Tool(toolName)
		.description(toolDescription)
		.input(inputSchema)
		.output(
			z.object({
				executionId: z.string(),
				status: z.string(),
				data: z.record(z.unknown()).optional(),
				error: z.string().optional(),
			}),
		)
		.handler(async (input: Record<string, unknown>) => {
			const current = await loadCurrentWorkflow(context, reference, triggerType);
			const parsedInput = inferInputSchema(current.triggerNode, current.triggerType).parse(input);
			return await executeWorkflow(
				current.workflow,
				current.triggerNode,
				current.triggerType,
				parsedInput,
				context,
				allOutputs,
				toolName,
			);
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
