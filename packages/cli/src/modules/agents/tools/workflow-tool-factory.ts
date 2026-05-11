import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents';
import { INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES } from '@n8n/api-types';
import type { SUPPORTED_WORKFLOW_TOOL_TRIGGERS } from '@n8n/api-types';
import type {
	ExecutionRepository,
	UserRepository,
	WorkflowRepository,
	WorkflowEntity,
} from '@n8n/db';
import type {
	IDataObject,
	INode,
	IPinData,
	IWorkflowExecutionDataProcess,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	createRunExecutionData,
	CHAT_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	TimeoutExecutionCancelledError,
} from 'n8n-workflow';
import { z } from 'zod';

import type { ActiveExecutions } from '@/active-executions';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { sanitizeToolName } from '../json-config/agent-config-composition';
import type { AgentJsonToolConfig } from '../json-config/agent-json-config';

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
	[SCHEDULE_TRIGGER_NODE_TYPE]: 'schedule',
	[FORM_TRIGGER_NODE_TYPE]: 'form',
};

// Compile-time check: `SUPPORTED_TRIGGERS` must cover every trigger the shared
// list declares. Adding a trigger to `SUPPORTED_WORKFLOW_TOOL_TRIGGERS` without
// adding its input-schema mapping here will fail this assertion.
const _assertSupportedTriggersInSync: Record<
	(typeof SUPPORTED_WORKFLOW_TOOL_TRIGGERS)[number],
	string
> = SUPPORTED_TRIGGERS;
void _assertSupportedTriggersInSync;

const INCOMPATIBLE_NODE_TYPES = new Set<string>(INCOMPATIBLE_WORKFLOW_TOOL_BODY_NODE_TYPES);

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_RESULT_CHARS = 20_000;
const MAX_NODE_OUTPUT_BYTES = 5_000;

// ---------------------------------------------------------------------------
// Context passed from the compile step
// ---------------------------------------------------------------------------

export interface WorkflowToolContext {
	workflowRepository: WorkflowRepository;
	workflowRunner: WorkflowRunner;
	activeExecutions: ActiveExecutions;
	executionRepository: ExecutionRepository;
	workflowFinderService: WorkflowFinderService;
	userRepository: UserRepository;
	userId: string;
	projectId?: string;
	/** Base URL for webhooks/forms (e.g. http://localhost:5678/) */
	webhookBaseUrl?: string;
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
	const nodes = workflow.nodes ?? [];
	const incompatible = nodes.filter((n) => INCOMPATIBLE_NODE_TYPES.has(n.type));

	if (incompatible.length > 0) {
		const names = incompatible.map((n) => `${n.name} (${n.type})`).join(', ');
		throw new Error(
			`Workflow "${workflow.name}" contains incompatible nodes for agent execution: ${names}`,
		);
	}
}

// ---------------------------------------------------------------------------
// 3. normalizeTriggerInput
// ---------------------------------------------------------------------------

export function normalizeTriggerInput(
	triggerNode: INode,
	triggerType: string,
	inputData: Record<string, unknown>,
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

		case 'schedule': {
			const now = new Date();
			// Keys below match the schedule trigger's $json output shape, which uses
			// human-readable labels — the naming-convention rule doesn't apply.
			/* eslint-disable @typescript-eslint/naming-convention */
			return {
				[triggerNode.name]: [
					{
						json: {
							timestamp: now.toISOString(),
							'Readable date': now.toLocaleString(),
							'Day of week': now.toLocaleDateString('en-US', { weekday: 'long' }),
							Year: String(now.getFullYear()),
							Month: now.toLocaleDateString('en-US', { month: 'long' }),
							'Day of month': String(now.getDate()).padStart(2, '0'),
							Hour: String(now.getHours()).padStart(2, '0'),
							Minute: String(now.getMinutes()).padStart(2, '0'),
							Second: String(now.getSeconds()).padStart(2, '0'),
						},
					},
				],
			};
			/* eslint-enable @typescript-eslint/naming-convention */
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

		case 'schedule':
			return z.object({});

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
): Promise<{
	executionId: string;
	status: string;
	data?: Record<string, unknown>;
	error?: string;
}> {
	const { workflowRunner, activeExecutions, executionRepository } = context;

	// Build pin data for the trigger
	const triggerPinData = normalizeTriggerInput(triggerNode, triggerType, inputData);

	// Merge with workflow's existing pinData
	const workflowPinData = workflow.pinData ?? {};
	const mergedPinData: IPinData = { ...workflowPinData, ...triggerPinData };

	// Determine execution mode from trigger type
	const executionMode: WorkflowExecuteMode =
		triggerType === 'chat' ? 'chat' : triggerType === 'schedule' ? 'trigger' : 'manual';

	// Build execution data following Instance AI adapter's pattern
	const runData: IWorkflowExecutionDataProcess = {
		executionMode,
		workflowData: workflow,
		userId: context.userId,
		startNodes: [{ name: triggerNode.name, sourceData: null }],
		pinData: mergedPinData,
		executionData: createRunExecutionData({
			startData: {},
			resultData: { pinData: mergedPinData, runData: {} },
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

	const executionId = await workflowRunner.run(runData);

	// Wait for completion with timeout protection
	const timeoutMs = DEFAULT_TIMEOUT_MS;

	if (activeExecutions.has(executionId)) {
		let timeoutId: NodeJS.Timeout | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(new Error(`Execution timed out after ${timeoutMs}ms`));
			}, timeoutMs);
		});

		try {
			await Promise.race([activeExecutions.getPostExecutePromise(executionId), timeoutPromise]);
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

	return await extractResult(executionRepository, executionId, allOutputs);
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
function outputItemsFromNodeRuns(
	nodeRuns: Array<{ data?: { main?: Array<Array<{ json: unknown } | null | undefined>> } }>,
): unknown[] {
	const lastRun = nodeRuns[nodeRuns.length - 1];
	if (!lastRun?.data?.main) return [];
	return lastRun.data.main
		.flat()
		.filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined)
		.map((item) => item.json);
}

/** Build the resultData map from an execution's runData, scoped by `allOutputs`. */
function collectResultData(
	runData: Record<string, Parameters<typeof outputItemsFromNodeRuns>[0]>,
	allOutputs: boolean,
): Record<string, unknown> {
	const resultData: Record<string, unknown> = {};

	if (allOutputs) {
		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			const outputItems = outputItemsFromNodeRuns(nodeRuns);
			if (outputItems.length > 0) {
				resultData[nodeName] = truncateNodeOutput(outputItems);
			}
		}
		return resultData;
	}

	const nodeNames = Object.keys(runData);
	const lastNodeName = nodeNames[nodeNames.length - 1];
	if (lastNodeName) {
		const outputItems = outputItemsFromNodeRuns(runData[lastNodeName]);
		if (outputItems.length > 0) {
			resultData[lastNodeName] = truncateNodeOutput(outputItems);
		}
	}
	return resultData;
}

export async function extractResult(
	executionRepository: ExecutionRepository,
	executionId: string,
	allOutputs: boolean,
): Promise<{
	executionId: string;
	status: string;
	data?: Record<string, unknown>;
	error?: string;
}> {
	const execution = await executionRepository.findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	if (!execution) {
		return { executionId, status: 'unknown' };
	}

	const runData = execution.data?.resultData?.runData;
	const resultData = runData
		? collectResultData(
				runData as Record<string, Parameters<typeof outputItemsFromNodeRuns>[0]>,
				allOutputs,
			)
		: {};

	return {
		executionId,
		status: normaliseExecutionStatus(execution.status),
		data: Object.keys(resultData).length > 0 ? truncateResultData(resultData) : undefined,
		error: execution.data?.resultData?.error?.message,
	};
}

// ---------------------------------------------------------------------------
// Truncation helpers (following Instance AI patterns)
// ---------------------------------------------------------------------------

function truncateNodeOutput(items: unknown[]): unknown {
	const serialized = JSON.stringify(items);
	if (serialized.length <= MAX_NODE_OUTPUT_BYTES) return items;

	const truncated: unknown[] = [];
	let size = 2; // account for "[]"
	for (const item of items) {
		const itemStr = JSON.stringify(item);
		if (size + itemStr.length + 2 > MAX_NODE_OUTPUT_BYTES) break;
		truncated.push(item);
		size += itemStr.length + 1;
	}

	return {
		items: truncated,
		truncated: true,
		totalItems: items.length,
		shownItems: truncated.length,
		message: `Output truncated: showing ${truncated.length} of ${items.length} items.`,
	};
}

function truncateResultData(data: Record<string, unknown>): Record<string, unknown> {
	const serialized = JSON.stringify(data);
	if (serialized.length <= MAX_RESULT_CHARS) return data;

	const truncated: Record<string, unknown> = {};
	for (const [nodeName, rawItems] of Object.entries(data)) {
		if (!Array.isArray(rawItems) || rawItems.length === 0) {
			truncated[nodeName] = rawItems;
			continue;
		}

		const items = rawItems as unknown[];
		const firstItem = items[0];
		const itemStr = JSON.stringify(firstItem);
		const preview = itemStr.length > 1_000 ? `${itemStr.slice(0, 1_000)}…` : firstItem;

		truncated[nodeName] = {
			_itemCount: items.length,
			_truncated: true,
			_firstItemPreview: preview,
		};
	}
	return truncated;
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
	const { workflowRepository, workflowFinderService, userRepository } = context;
	const workflowName = descriptor.workflow;

	// Step 1: Find the workflow by name, scoped to the project if available.
	const whereClause: Record<string, unknown> = { name: workflowName };
	if (context.projectId) {
		whereClause.shared = { projectId: context.projectId };
	}
	const candidateWorkflow = await workflowRepository.findOne({
		where: whereClause,
		relations: ['shared'],
	});

	if (!candidateWorkflow) {
		throw new Error(`Workflow "${workflowName}" not found`);
	}

	// Step 2: Verify the user has execute access via RBAC.
	const user = await userRepository.findOne({ where: { id: context.userId }, relations: ['role'] });
	if (!user) {
		throw new Error(`User "${context.userId}" not found`);
	}

	const workflow = await workflowFinderService.findWorkflowForUser(candidateWorkflow.id, user, [
		'workflow:execute',
	]);

	if (!workflow) {
		throw new Error(`Workflow "${workflowName}" not found or user does not have execute access`);
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

	// Form triggers return a link — the user fills out the form in their browser,
	// and the workflow executes independently when they submit.
	if (triggerType === 'form') {
		const formPath =
			(triggerNode.parameters?.path as string) ??
			((triggerNode.parameters?.options as Record<string, unknown>)?.path as string) ??
			triggerNode.webhookId ??
			workflow.id;
		const baseUrl = (context.webhookBaseUrl ?? 'http://localhost:5678/').replace(/\/$/, '');
		const formUrl = `${baseUrl}/form/${formPath}`;

		const builder = new Tool(toolName)
			.description(
				toolDescription === `Execute the "${workflowName}" workflow`
					? `Send the user a link to the "${workflowName}" form. The workflow runs automatically when they submit.`
					: toolDescription,
			)
			.input(inputSchema)
			.toMessage(
				() =>
					({
						type: 'custom',
						components: [
							{ type: 'section', text: `📋 *<${formUrl}|Click here to open the form>*` },
						],
					}) as never,
			)
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async (input: Record<string, unknown>) => {
				const reason = (input.reason as string) ?? `Please fill out the ${workflowName} form`;
				return { status: 'form_link_sent', formUrl, message: reason };
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
			return await executeWorkflow(workflow, triggerNode, triggerType, input, context, allOutputs);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Re-export the shared sanitiser under the local name used in this file.
 * Lives in `agent-config-composition` so save-time healing and runtime
 * fallback share a single source of truth.
 */
const toToolName = sanitizeToolName;
