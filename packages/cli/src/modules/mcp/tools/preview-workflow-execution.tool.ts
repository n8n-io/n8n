import {
	WORKFLOW_DIAGRAM_URI,
	type PreviewWorkflowExecution,
	type PreviewWorkflowNode,
	type PreviewWorkflowOutput,
} from '@n8n/mcp-apps/server';
import type { ExecutionRepository, User } from '@n8n/db';
import type { ExecutionStatus, IRunData, ITaskData } from 'n8n-workflow';
import { ensureError, jsonStringify } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { MCP_PREVIEW_WORKFLOW_EXECUTION_TOOL } from './workflow-builder/constants';
import { buildExecutionUrl, buildPreviewWorkflowOutput } from './workflow-preview.utils';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow the execution belongs to'),
	executionId: z.string().describe('The ID of the execution to preview'),
} satisfies z.ZodRawShape;

const previewConnectionSchema = z.object({
	node: z.string(),
	type: z.string(),
	index: z.number(),
});

const previewNodeIconSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('file'), src: z.string() }),
	z.object({ type: z.literal('icon'), name: z.string(), color: z.string().optional() }),
	z.object({ type: z.literal('unknown') }),
]);

const previewNodeDisplaySchema = z.discriminatedUnion('variant', [
	z.object({
		variant: z.literal('stickyNote'),
		width: z.number(),
		height: z.number(),
		content: z.string().optional(),
		color: z.number().optional(),
	}),
	z.object({ variant: z.literal('node') }),
]);

const previewExecutionSchema = z.object({
	id: z.string(),
	workflowId: z.string(),
	status: z.string(),
	mode: z.string(),
	startedAt: z.string().nullable(),
	stoppedAt: z.string().nullable(),
	waitTill: z.string().nullable().optional(),
});

const outputSchema = {
	workflowId: z.string().describe('The ID of the workflow being previewed'),
	workflowUrl: z.string().describe('Absolute URL to open the execution in n8n'),
	name: z.string().describe('The name of the workflow snapshot'),
	execution: previewExecutionSchema.describe('Execution metadata for the previewed run'),
	nodes: z
		.array(
			z.object({
				name: z.string(),
				type: z.string(),
				icon: previewNodeIconSchema,
				display: previewNodeDisplaySchema.optional(),
				executionStatus: z.enum(['success', 'error']).optional(),
				position: z.tuple([z.number(), z.number()]),
			}),
		)
		.describe('Workflow nodes stripped to display-safe fields'),
	connections: z
		.record(z.record(z.array(z.array(previewConnectionSchema).nullable())))
		.describe('Workflow connections keyed by source node'),
} satisfies z.ZodRawShape;

export const createPreviewWorkflowExecutionTool = (
	user: User,
	executionRepository: ExecutionRepository,
	workflowFinderService: WorkflowFinderService,
	telemetry: Telemetry,
	nodeTypes: NodeTypes,
	instanceBaseUrl: string,
	loadNodesAndCredentials?: LoadNodesAndCredentials,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_PREVIEW_WORKFLOW_EXECUTION_TOOL.toolName,
	config: {
		description:
			'Renders a visual preview of one workflow execution, showing which nodes succeeded or failed.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_PREVIEW_WORKFLOW_EXECUTION_TOOL.displayTitle,
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
		_meta: {
			ui: { resourceUri: WORKFLOW_DIAGRAM_URI },
		},
	},
	handler: async ({ workflowId, executionId }: { workflowId: string; executionId: string }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_PREVIEW_WORKFLOW_EXECUTION_TOOL.toolName,
			parameters: { workflowId, executionId },
		};

		try {
			const output = await previewWorkflowExecution(
				workflowId,
				executionId,
				user,
				executionRepository,
				workflowFinderService,
				nodeTypes,
				instanceBaseUrl,
				loadNodesAndCredentials,
			);
			const nodeOutcomeCounts = countNodeOutcomes(output.nodes);

			telemetryPayload.results = {
				success: true,
				data: {
					workflow_id: output.workflowId,
					workflow_name: output.name,
					execution_id: output.execution?.id,
					execution_status: output.execution?.status,
					node_count: output.nodes.length,
					successful_node_count: nodeOutcomeCounts.success,
					failed_node_count: nodeOutcomeCounts.error,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{
						type: 'text',
						text: `Showing execution ${executionId} for workflow ${output.name} (${nodeOutcomeCounts.success} successful, ${nodeOutcomeCounts.error} failed nodes)`,
					},
				],
				structuredContent: output,
			};
		} catch (e) {
			const error = ensureError(e);
			const isAccessError = error instanceof WorkflowAccessError;

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify({ error: error.message }) }],
				structuredContent: { error: error.message },
				isError: true,
			};
		}
	},
});

export async function previewWorkflowExecution(
	workflowId: string,
	executionId: string,
	user: User,
	executionRepository: ExecutionRepository,
	workflowFinderService: WorkflowFinderService,
	nodeTypes: NodeTypes,
	instanceBaseUrl: string,
	loadNodesAndCredentials?: LoadNodesAndCredentials,
): Promise<PreviewWorkflowOutput> {
	await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

	const execution = await executionRepository.findWithUnflattenedData(executionId, [workflowId]);
	if (!execution) {
		throw new WorkflowAccessError(
			`Execution '${executionId}' not found for workflow '${workflowId}'`,
			'execution_not_found',
		);
	}

	return await buildPreviewWorkflowOutput({
		workflow: execution.workflowData,
		instanceBaseUrl,
		workflowUrl: buildExecutionUrl(instanceBaseUrl, workflowId, executionId),
		nodeTypes,
		loadNodesAndCredentials,
		nodeExecutionStatuses: getNodeExecutionStatuses(execution.data.resultData.runData),
		execution: serializeExecution(execution),
	});
}

function getNodeExecutionStatuses(
	runData: IRunData,
): Map<string, PreviewWorkflowNode['executionStatus']> {
	const statuses = new Map<string, PreviewWorkflowNode['executionStatus']>();

	for (const [nodeName, nodeRuns] of Object.entries(runData)) {
		const executionStatus = getNodeExecutionStatus(nodeRuns);
		if (executionStatus) statuses.set(nodeName, executionStatus);
	}

	return statuses;
}

function getNodeExecutionStatus(
	nodeRuns: ITaskData[] | undefined,
): PreviewWorkflowNode['executionStatus'] {
	if (!nodeRuns || nodeRuns.length === 0) return undefined;

	if (nodeRuns.some(isFailedNodeRun)) return 'error';
	if (nodeRuns.some((run) => run.executionStatus === 'success')) return 'success';
	if (nodeRuns.every((run) => run.executionStatus === undefined)) return 'success';

	return undefined;
}

function isFailedNodeRun(run: ITaskData) {
	return (
		Boolean(run.error) || Boolean(run.redactedError) || isFailedExecutionStatus(run.executionStatus)
	);
}

function isFailedExecutionStatus(status: ExecutionStatus | undefined) {
	return status === 'error' || status === 'crashed';
}

function serializeExecution(execution: {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: string;
	startedAt?: Date | null;
	stoppedAt?: Date | null;
	waitTill?: Date | null;
}): PreviewWorkflowExecution {
	return {
		id: execution.id,
		workflowId: execution.workflowId,
		status: execution.status,
		mode: execution.mode,
		startedAt: execution.startedAt?.toISOString() ?? null,
		stoppedAt: execution.stoppedAt?.toISOString() ?? null,
		...(execution.waitTill !== undefined
			? { waitTill: execution.waitTill?.toISOString() ?? null }
			: {}),
	};
}

function countNodeOutcomes(nodes: PreviewWorkflowNode[]) {
	return nodes.reduce(
		(counts, node) => {
			if (node.executionStatus) counts[node.executionStatus] += 1;
			return counts;
		},
		{ success: 0, error: 0 },
	);
}
