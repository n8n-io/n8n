import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents';

import type { WorkflowToolDescriptor } from './types';
import type {
	ExecutionRepository,
	UserRepository,
	WorkflowRepository,
	WorkflowEntity,
} from '@n8n/db';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_TRIGGERS: Record<string, string> = {
	[MANUAL_TRIGGER_NODE_TYPE]: 'manual',
	[EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE]: 'executeWorkflow',
	[CHAT_TRIGGER_NODE_TYPE]: 'chat',
	[SCHEDULE_TRIGGER_NODE_TYPE]: 'schedule',
	[FORM_TRIGGER_NODE_TYPE]: 'form',
};

const INCOMPATIBLE_NODE_TYPES = new Set([
	'n8n-nodes-base.wait',
	'n8n-nodes-base.form',
	'n8n-nodes-base.respondToWebhook',
]);

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 300_000;
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

		case 'executeWorkflow': {
			// Read the trigger node's declared input fields from workflowInputs.values
			const params = triggerNode.parameters ?? {};
			const workflowInputs = params.workflowInputs as
				| { values?: Array<{ name: string; type?: string }> }
				| undefined;

			if (workflowInputs?.values?.length) {
				const shape: z.ZodRawShape = {};
				for (const field of workflowInputs.values) {
					if (!field.name) continue;
					// Map n8n field types to Zod types
					switch (field.type) {
						case 'number':
							shape[field.name] = z.number().describe(field.name);
							break;
						case 'boolean':
							shape[field.name] = z.boolean().describe(field.name);
							break;
						default:
							// string and any other type
							shape[field.name] = z.string().describe(field.name);
							break;
					}
				}
				if (Object.keys(shape).length > 0) {
					return z.object(shape);
				}
			}

			// Check for JSON example mode
			const jsonExample = params.jsonExample as string | undefined;
			if (jsonExample) {
				try {
					const parsed: unknown = JSON.parse(jsonExample);
					if (typeof parsed === 'object' && parsed !== null) {
						const shape: z.ZodRawShape = {};
						for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
							if (typeof value === 'number') {
								shape[key] = z.number().describe(key);
							} else if (typeof value === 'boolean') {
								shape[key] = z.boolean().describe(key);
							} else {
								shape[key] = z.string().describe(key);
							}
						}
						if (Object.keys(shape).length > 0) {
							return z.object(shape);
						}
					}
				} catch {
					// Invalid JSON example, fall through
				}
			}

			// Passthrough mode or no fields defined
			return z.object({}).catchall(z.unknown());
		}

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
	const timeoutMs = Math.min(DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);

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

	return await extractResult(executionRepository, executionId, false);
}

// ---------------------------------------------------------------------------
// 6. extractResult
// ---------------------------------------------------------------------------

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

	const status =
		execution.status === 'error' || execution.status === 'crashed'
			? 'error'
			: execution.status === 'running' || execution.status === 'new'
				? 'running'
				: execution.status === 'waiting'
					? 'waiting'
					: 'success';

	const resultData: Record<string, unknown> = {};
	const runData = execution.data?.resultData?.runData;

	if (runData) {
		if (allOutputs) {
			// Return all node outputs keyed by node name
			for (const [nodeName, nodeRuns] of Object.entries(runData)) {
				const lastRun = nodeRuns[nodeRuns.length - 1];
				if (lastRun?.data?.main) {
					const outputItems = lastRun.data.main
						.flat()
						.filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined)
						.map((item) => item.json);
					if (outputItems.length > 0) {
						resultData[nodeName] = truncateNodeOutput(outputItems);
					}
				}
			}
		} else {
			// Find the last executed node's output
			const nodeNames = Object.keys(runData);
			const lastNodeName = nodeNames[nodeNames.length - 1];
			if (lastNodeName) {
				const nodeRuns = runData[lastNodeName];
				const lastRun = nodeRuns[nodeRuns.length - 1];
				if (lastRun?.data?.main) {
					const outputItems = lastRun.data.main
						.flat()
						.filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined)
						.map((item) => item.json);
					if (outputItems.length > 0) {
						resultData[lastNodeName] = truncateNodeOutput(outputItems);
					}
				}
			}
		}
	}

	const errorMessage = execution.data?.resultData?.error?.message;

	return {
		executionId,
		status,
		data: Object.keys(resultData).length > 0 ? truncateResultData(resultData) : undefined,
		error: errorMessage,
	};
}

// ---------------------------------------------------------------------------
// Truncation helpers (following Instance AI patterns)
// ---------------------------------------------------------------------------

function truncateNodeOutput(items: unknown[]): unknown[] | unknown {
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
	for (const [nodeName, items] of Object.entries(data)) {
		if (!Array.isArray(items) || items.length === 0) {
			truncated[nodeName] = items;
			continue;
		}

		const itemStr = JSON.stringify(items[0]);
		const preview = itemStr.length > 1_000 ? `${itemStr.slice(0, 1_000)}…` : items[0];

		truncated[nodeName] = {
			_itemCount: items.length,
			_truncated: true,
			_firstItemPreview: preview,
		};
	}
	return truncated;
}

// ---------------------------------------------------------------------------
// 7. resolveWorkflowTools — main entry point
// ---------------------------------------------------------------------------

export async function resolveWorkflowTools(
	workflowNames: string[],
	workflowToolDescriptors: WorkflowToolDescriptor[],
	context: WorkflowToolContext,
): Promise<BuiltTool[]> {
	const tools: BuiltTool[] = [];

	// Process plain workflow names (no custom options)
	for (const name of workflowNames) {
		const tool = await buildWorkflowTool(name, undefined, context);
		tools.push(tool);
	}

	// Process workflow tool descriptors (with custom options)
	for (const descriptor of workflowToolDescriptors) {
		const tool = await buildWorkflowTool(descriptor.workflowName, descriptor, context);
		tools.push(tool);
	}

	return tools;
}

async function buildWorkflowTool(
	workflowName: string,
	descriptor: WorkflowToolDescriptor | undefined,
	context: WorkflowToolContext,
): Promise<BuiltTool> {
	const { workflowRepository, executionRepository, workflowFinderService, userRepository } =
		context;

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

	const options = descriptor?.options;
	const toolName = options?.name ?? toToolName(workflowName);
	const toolDescription = options?.description ?? `Execute the "${workflowName}" workflow`;
	const inputSchema = options?.input ?? inferInputSchema(triggerNode, triggerType);
	const allOutputs = options?.allOutputs ?? false;

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
			.handler(async (input: Record<string, unknown>) => {
				const reason = (input.reason as string) ?? `Please fill out the ${workflowName} form`;
				return { status: 'form_link_sent', formUrl, message: reason };
			});

		return builder.build();
	}

	// Standard execution-based tool for all other triggers
	const builder = new Tool(toolName)
		.description(toolDescription)
		.input(inputSchema)
		.output(
			options?.output ??
				z.object({
					executionId: z.string(),
					status: z.string(),
					data: z.record(z.unknown()).optional(),
					error: z.string().optional(),
				}),
		)
		.handler(async (input: Record<string, unknown>) => {
			const result = await executeWorkflow(workflow, triggerNode, triggerType, input, context);

			// If allOutputs is requested and the execution succeeded, re-extract with allOutputs
			if (allOutputs && result.status === 'success') {
				return await extractResult(executionRepository, result.executionId, true);
			}

			return result;
		});

	return builder.build();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a workflow name to a valid tool name (lowercase, hyphens, no spaces). */
function toToolName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
