import type { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { normalizePinData } from '@n8n/workflow-sdk';
import { formatRedactedError } from '@n8n/instance-ai/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { truncate } from '@n8n/utils/string/truncate';
import {
	type ExecutionStatus,
	type IPinData,
	type INodeExecutionData,
	type IRedactedErrorInfo,
	type IRunData,
	type ITaskData,
	type IWorkflowExecutionDataProcess,
	ExecutionStatusList,
	createRunExecutionData,
	jsonStringify,
	isTriggerNode,
	type INodeTypes,
} from 'n8n-workflow';
import z from 'zod';

import type { ActiveExecutions } from '@/active-executions';
import { loadExecutionForViewer } from '@/executions/execution-viewer-reader';
import { findCredentialRefusal } from '@/executions/pre-execution-checks';
import type { McpService } from '@/modules/mcp/mcp.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { McpExecutionTimeoutError, WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { findEnabledEligibleTrigger } from '../mcp.utils';
import {
	REDACTION_CHECK_FAILED_MESSAGE,
	waitForExecutionResult,
	WORKFLOW_EXECUTION_TIMEOUT_DEFAULT_SECONDS,
	WORKFLOW_EXECUTION_TIMEOUT_MAX_SECONDS,
} from './execution-utils';
import { getMcpWorkflow } from './workflow-validation.utils';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to test'),
	pinData: z
		.record(z.array(z.record(z.unknown())))
		.describe(
			'Pin data for all workflow nodes. Use the prepare_workflow_pin_data tool to generate this. Keys are node names, values are arrays of items. Each item MUST be wrapped in a "json" property, e.g. [{"json": {"id": "123", "name": "test"}}]. Do NOT pass flat objects like [{"id": "123"}].',
		),
	triggerNodeName: z
		.string()
		.optional()
		.describe(
			'Optional name of the trigger node to start execution from. Useful for workflows with multiple triggers. Defaults to the first trigger node found.',
		),
	timeout: z
		.number()
		.int()
		.positive()
		.max(WORKFLOW_EXECUTION_TIMEOUT_MAX_SECONDS)
		.optional()
		.describe(
			`Optional timeout in seconds before the test execution is interrupted. Defaults to ${WORKFLOW_EXECUTION_TIMEOUT_DEFAULT_SECONDS} seconds. Increase this to test workflows that take longer to run.`,
		),
});

const MAX_NODE_RESULTS = 50;
const MAX_ERROR_LENGTH = 500;

type NodeResult = {
	nodeName: string;
	status: ExecutionStatus;
	itemCounts: number[];
	error?: string;
};

type TestWorkflowOutput = {
	executionId: string | null;
	status: 'success' | 'error' | 'running' | 'waiting' | 'canceled' | 'crashed' | 'new' | 'unknown';
	error?: string;
	nodeResults?: NodeResult[];
	truncated?: boolean;
};

const nodeResultSchema = z.object({
	nodeName: z.string(),
	status: z.enum(ExecutionStatusList),
	itemCounts: z
		.array(z.number().int())
		.describe('The number of output items on each main output of the node, in output order'),
	error: z.string().optional().describe('Error message if the node failed'),
});

const outputSchema = {
	executionId: z.string().nullable(),
	status: z
		.enum(['success', 'error', 'running', 'waiting', 'canceled', 'crashed', 'new', 'unknown'])
		.describe('The status of the test execution'),
	error: z.string().optional().describe('Error message if the execution failed'),
	nodeResults: z
		.array(nodeResultSchema)
		.optional()
		.describe(
			'The nodes that ran, in execution order. Absent when you cannot read executions of this workflow',
		),
	truncated: z
		.boolean()
		.optional()
		.describe(
			`True when more than ${MAX_NODE_RESULTS} nodes ran and nodeResults omits the earliest nodes`,
		),
} satisfies z.ZodRawShape;

export const createTestWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	activeExecutions: ActiveExecutions,
	workflowRunner: WorkflowRunner,
	nodeTypes: INodeTypes,
	telemetry: Telemetry,
	mcpService: McpService,
	logger: Logger,
	executionReadGranted: boolean,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'test_workflow',
	config: {
		description:
			'Test a workflow using pin data to bypass external services. Trigger nodes, nodes with credentials, and HTTP Request nodes are pinned (use simulated data). Other nodes (Set, If, Code, etc.) execute normally — including credential-free I/O nodes like Execute Command or file read/write nodes. Use prepare_workflow_pin_data to generate the pin data first. The result lists each node that ran with its status, the item count of each output, and its error message.',
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
	handler: async ({
		workflowId,
		pinData,
		triggerNodeName,
		timeout,
	}: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'test_workflow',
			parameters: {
				workflowId,
				nodeCount: Object.keys(pinData).length,
				hasTriggerNodeName: !!triggerNodeName,
				hasCustomTimeout: timeout !== undefined,
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
				logger,
				workflowId,
				pinData as IPinData,
				triggerNodeName,
				timeout,
				executionReadGranted,
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
					? `Workflow execution timed out after ${error.timeoutMs * Time.milliseconds.toSeconds} seconds`
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
	nodeTypes: INodeTypes,
	mcpService: McpService,
	logger: Logger,
	workflowId: string,
	pinData: IPinData,
	triggerNodeName?: string,
	timeoutSeconds: number = WORKFLOW_EXECUTION_TIMEOUT_DEFAULT_SECONDS,
	executionReadGranted = false,
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
	const triggerNode = findEnabledEligibleTrigger(
		nodes,
		(node) => {
			try {
				const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
				return isTriggerNode(nodeType.description);
			} catch {
				return false;
			}
		},
		triggerNodeName,
	);
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

	// Redaction can hide the refusal reason in the saved execution, so get it up front.
	const credentialRefusal = await findCredentialRefusal(workflowId, nodes, user.id);

	const executionId = await workflowRunner.run(runData);

	// The runner finalizes a refused run before it returns, so there is nothing to wait for.
	if (credentialRefusal && !activeExecutions.has(executionId)) {
		return {
			executionId,
			status: 'error',
			error: [credentialRefusal.message, credentialRefusal.description].filter(Boolean).join('. '),
		};
	}

	const data = await waitForExecutionResult(
		executionId,
		activeExecutions,
		mcpService,
		timeoutSeconds * Time.seconds.toMilliseconds,
	);
	const hasError = data.status === 'error' || data.data.resultData?.error;
	const canReadExecution =
		executionReadGranted &&
		(await workflowFinderService.findWorkflowHeadForUser(workflowId, user, ['execution:read'])) !==
			null;
	const viewedResultData =
		hasError || canReadExecution
			? await loadResultDataForViewer(executionId, user, logger)
			: undefined;
	const nodeSummary =
		canReadExecution && viewedResultData ? summarizeNodeResults(viewedResultData.runData) : {};

	if (!hasError) {
		return { executionId, status: data.status, ...nodeSummary };
	}

	return {
		executionId,
		status: 'error',
		error: viewedResultData
			? (getViewedErrorMessage(viewedResultData) ?? 'Execution completed with errors')
			: REDACTION_CHECK_FAILED_MESSAGE,
		...nodeSummary,
	};
}

async function loadResultDataForViewer(executionId: string, user: User, logger: Logger) {
	const execution = await loadExecutionForViewer(executionId, user).catch((error: unknown) => {
		logger.error('MCP test_workflow could not apply execution data redaction', {
			executionId,
			error: ensureError(error),
		});
		return undefined;
	});
	return execution?.data?.resultData;
}

function getViewedErrorMessage(source: {
	error?: { message: string };
	redactedError?: IRedactedErrorInfo;
}): string | undefined {
	const message = source.redactedError
		? formatRedactedError(source.redactedError)
		: source.error?.message;
	return message === undefined ? undefined : truncate(message, MAX_ERROR_LENGTH);
}

function summarizeNodeResults(
	runData: IRunData,
): Pick<TestWorkflowOutput, 'nodeResults' | 'truncated'> {
	const nodeResults = Object.entries(runData)
		.filter(([, runs]) => runs.length > 0)
		.sort(([, a], [, b]) => a[0].executionIndex - b[0].executionIndex)
		.map(([nodeName, runs]) => summarizeNode(nodeName, runs));

	if (nodeResults.length <= MAX_NODE_RESULTS) return { nodeResults };
	return { nodeResults: nodeResults.slice(-MAX_NODE_RESULTS), truncated: true };
}

function summarizeNode(nodeName: string, runs: ITaskData[]): NodeResult {
	const itemCounts: number[] = [];
	for (const run of runs) {
		(run.data?.main ?? []).forEach((items, outputIndex) => {
			itemCounts[outputIndex] = (itemCounts[outputIndex] ?? 0) + (items?.length ?? 0);
		});
	}

	const lastRun = runs[runs.length - 1];
	const error = getViewedErrorMessage(lastRun);
	return {
		nodeName,
		status: lastRun.executionStatus ?? (error ? 'error' : 'success'),
		itemCounts,
		...(error !== undefined && { error }),
	};
}
