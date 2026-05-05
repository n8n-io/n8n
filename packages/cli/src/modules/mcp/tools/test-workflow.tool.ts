import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { normalizePinData } from '@n8n/workflow-sdk';
import {
	type INode,
	type IPinData,
	type INodeExecutionData,
	type IWorkflowExecutionDataProcess,
	createRunExecutionData,
	jsonStringify,
	ensureError,
	isTriggerNode,
} from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { McpExecutionTimeoutError, WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { waitForExecutionResult, WORKFLOW_EXECUTION_TIMEOUT_MS } from './execution-utils';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { ActiveExecutions } from '@/active-executions';
import type { NodeTypes } from '@/node-types';
import type { McpService } from '@/modules/mcp/mcp.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to test'),
	pinData: z
		.record(z.array(z.record(z.unknown())))
		.describe(
			'Pin data for all workflow nodes. Use the prepare_test_pin_data tool to generate this. Keys are node names, values are arrays of items. Each item MUST be wrapped in a "json" property, e.g. [{"json": {"id": "123", "name": "test"}}]. Do NOT pass flat objects like [{"id": "123"}].',
		),
	triggerNodeName: z
		.string()
		.optional()
		.describe(
			'Optional name of the trigger node to start execution from. Useful for workflows with multiple triggers. Defaults to the first trigger node found.',
		),
});

type TestWorkflowOutput = {
	executionId: string | null;
	status: 'success' | 'error' | 'running' | 'waiting' | 'canceled' | 'crashed' | 'new' | 'unknown';
	error?: string;
};

const outputSchema = {
	executionId: z.string().nullable(),
	status: z
		.enum(['success', 'error', 'running', 'waiting', 'canceled', 'crashed', 'new', 'unknown'])
		.describe('The status of the test execution'),
	error: z.string().optional().describe('Error message if the execution failed'),
} satisfies z.ZodRawShape;

export const createTestWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	nodeTypes: NodeTypes,
	telemetry: Telemetry,
	mcpService: McpService,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'test_workflow',
	config: {
		description:
			'Test a workflow using pin data to bypass external services. Trigger nodes, nodes with credentials, and HTTP Request nodes are pinned (use simulated data). Other nodes (Set, If, Code, etc.) execute normally — including credential-free I/O nodes like Execute Command or file read/write nodes. Use prepare_test_pin_data to generate the pin data first.',
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Test Workflow',
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false, // Nodes like Execute Command, file write, and Code execute for real even with pin data
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId, pinData, triggerNodeName }: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'test_workflow',
			parameters: {
				workflowId,
				nodeCount: Object.keys(pinData).length,
				hasTriggerNodeName: !!triggerNodeName,
			},
		};

		try {
			const output = await testWorkflow(
				user,
				workflowFinderService,
				activeExecutions,
				workflowRunner,
				nodeTypes,
				mcpService,
				workflowId,
				pinData as IPinData,
				triggerNodeName,
			);

			telemetryPayload.results = {
				success: output.status === 'success',
				data: { executionId: output.executionId, status: output.status },
			};
			if (output.status === 'error' && output.error) {
				telemetryPayload.results.error = output.error;
			}
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isTimeout = error instanceof McpExecutionTimeoutError;
			const isAccessError = error instanceof WorkflowAccessError;

			const output: TestWorkflowOutput = {
				executionId: isTimeout ? error.executionId : null,
				status: 'error',
				error: isTimeout
					? `Workflow execution timed out after ${WORKFLOW_EXECUTION_TIMEOUT_MS * Time.milliseconds.toSeconds} seconds`
					: (error.message ?? `${error.constructor.name}: (no message)`),
			};

			telemetryPayload.results = {
				success: false,
				error: isTimeout ? 'Workflow execution timed out' : error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		}
	},
});

// =============================================================================
// Core Logic
// =============================================================================

export async function testWorkflow(
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	nodeTypes: NodeTypes,
	mcpService: McpService,
	workflowId: string,
	pinData: IPinData,
	triggerNodeName?: string,
): Promise<TestWorkflowOutput> {
	const workflow = await getMcpWorkflow(
		workflowId,
		user,
		['workflow:execute'],
		workflowFinderService,
	);

	const nodes = workflow.nodes ?? [];
	const connections = workflow.connections ?? {};

	// Find the trigger node — support any trigger type
	const triggerNode = findTriggerNode(nodes, nodeTypes, triggerNodeName);
	if (!triggerNode) {
		throw new WorkflowAccessError(
			triggerNodeName
				? `Trigger node "${triggerNodeName}" not found in the workflow. Check the node name and ensure it is a trigger node.`
				: 'Workflow has no trigger node. A trigger node is required to test the workflow.',
			'unsupported_trigger',
		);
	}

	// Validate pin data keys match actual workflow node names
	const nodeNames = new Set(nodes.map((n) => n.name));
	const unknownKeys = Object.keys(pinData).filter((key) => !nodeNames.has(key));
	if (unknownKeys.length > 0) {
		throw new WorkflowAccessError(
			`Pin data contains unknown node names: ${unknownKeys.join(', ')}. Check for typos — node names must match exactly.`,
			'invalid_pin_data',
		);
	}

	// Normalize pin data: ensure each item has a "json" wrapper
	const normalizedPinData = normalizePinData(pinData);

	// Ensure trigger has pin data
	const triggerPinData: INodeExecutionData[] = normalizedPinData[triggerNode.name] ?? [
		{ json: {} },
	];

	const mcpMessageId = `mcp-test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

	const runData: IWorkflowExecutionDataProcess = {
		executionMode: 'manual',
		workflowData: { ...workflow, nodes, connections },
		userId: user.id,
		isMcpExecution: mcpService.isQueueMode,
		mcpType: 'service',
		mcpSessionId: mcpMessageId,
		mcpMessageId,
		startNodes: [{ name: triggerNode.name, sourceData: null }],
		pinData: normalizedPinData,
		executionData: createRunExecutionData({
			startData: {},
			resultData: {
				pinData: normalizedPinData,
				runData: {},
			},
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [
					{
						node: triggerNode,
						data: {
							main: [triggerPinData],
						},
						source: null,
					},
				],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		}),
	};

	const executionId = await workflowRunner.run(runData);
	const data = await waitForExecutionResult(executionId, activeExecutions, mcpService);
	const hasError = data.status === 'error' || data.data.resultData?.error;

	return {
		executionId,
		status: hasError ? 'error' : data.status,
		error: hasError
			? (data.data.resultData?.error?.message ?? 'Execution completed with errors')
			: undefined,
	};
}

/**
 * Find a trigger node in the workflow.
 * When triggerNodeName is provided, returns that specific node if it is a trigger.
 * Otherwise returns the first trigger node found.
 */
function findTriggerNode(
	nodes: INode[],
	nodeTypes: NodeTypes,
	triggerNodeName?: string,
): INode | undefined {
	for (const node of nodes) {
		if (node.disabled) continue;
		if (triggerNodeName && node.name !== triggerNodeName) continue;
		try {
			const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			if (isTriggerNode(nodeType.description)) {
				return node;
			}
		} catch {
			// Node type not found — skip
		}
	}
	return undefined;
}
