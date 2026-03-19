import type { User } from '@n8n/db';
import {
	discoverSchemasForNode,
	findSchemaForOperation,
	jsonSchemaToSampleData,
} from '@n8n/workflow-sdk';
import type { INode, IPinData, INodeExecutionData } from 'n8n-workflow';
import { jsonStringify } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { ExecutionService } from '@/executions/execution.service';
import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to generate test pin data for'),
});

const outputSchema = {
	pinData: z
		.record(z.array(z.record(z.unknown())))
		.describe('Pin data map: node name → array of data items. Pass this to test_workflow.'),
	coverage: z.object({
		fromExecution: z
			.number()
			.describe('Number of nodes with pin data from last successful execution'),
		fromSchema: z.number().describe('Number of nodes with pin data generated from output schemas'),
		fallback: z.number().describe('Number of nodes with fallback empty pin data'),
		total: z.number().describe('Total number of nodes processed'),
	}),
} satisfies z.ZodRawShape;

export const createPrepareTestPinDataTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	executionService: ExecutionService,
	nodeTypes: NodeTypes,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'prepare_test_pin_data',
	config: {
		description:
			'Generate test pin data for all nodes in a workflow. Uses data from the last successful execution when available, falls back to schema-based sample data, then to empty defaults. Pass the result to test_workflow.',
		inputSchema: inputSchema.shape,
		outputSchema,
		annotations: {
			title: 'Prepare Test Pin Data',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId }: z.infer<typeof inputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'prepare_test_pin_data',
			parameters: { workflowId },
		};

		try {
			const result = await preparePinData(
				workflowId,
				user,
				workflowFinderService,
				executionService,
				nodeTypes,
			);

			telemetryPayload.results = {
				success: true,
				data: result.coverage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(result) }],
				structuredContent: result,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = { success: false, error: errorMessage };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify({ error: errorMessage }) }],
				structuredContent: { error: errorMessage },
				isError: true,
			};
		}
	},
});

// =============================================================================
// Core Logic
// =============================================================================

export async function preparePinData(
	workflowId: string,
	user: User,
	workflowFinderService: WorkflowFinderService,
	executionService: ExecutionService,
	nodeTypes: NodeTypes,
): Promise<{
	pinData: IPinData;
	coverage: { fromExecution: number; fromSchema: number; fallback: number; total: number };
}> {
	const workflow = await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

	const enabledNodes = (workflow.nodes ?? []).filter((n) => !n.disabled);

	// Tier 1: Try to get data from last successful execution
	const executionRunData = await getExecutionRunData(workflowId, user, executionService);

	const pinData: IPinData = {};
	let fromExecution = 0;
	let fromSchema = 0;
	let fallback = 0;

	for (const node of enabledNodes) {
		// Tier 1: Execution history
		const execData = extractNodePinDataFromExecution(node.name, executionRunData);
		if (execData) {
			pinData[node.name] = execData;
			fromExecution++;
			continue;
		}

		// Tier 2: Schema-based generation
		const schemaData = generatePinDataFromSchema(node, nodeTypes);
		if (schemaData) {
			pinData[node.name] = schemaData;
			fromSchema++;
			continue;
		}

		// Tier 3: Fallback
		pinData[node.name] = [{ json: {} }];
		fallback++;
	}

	return {
		pinData,
		coverage: {
			fromExecution,
			fromSchema,
			fallback,
			total: enabledNodes.length,
		},
	};
}

// =============================================================================
// Tier 1: Execution History
// =============================================================================

async function getExecutionRunData(
	workflowId: string,
	user: User,
	executionService: ExecutionService,
): Promise<Record<string, INodeExecutionData[]> | undefined> {
	try {
		const execution = await executionService.getLastSuccessfulExecution(workflowId, user);
		if (!execution?.data?.resultData?.runData) return undefined;

		const result: Record<string, INodeExecutionData[]> = {};
		for (const [nodeName, taskDataArray] of Object.entries(execution.data.resultData.runData)) {
			const firstRun = taskDataArray[0];
			if (firstRun?.data?.main?.[0]) {
				result[nodeName] = firstRun.data.main[0];
			}
		}

		return Object.keys(result).length > 0 ? result : undefined;
	} catch {
		// Execution fetch failed — fall through to other tiers
		return undefined;
	}
}

function extractNodePinDataFromExecution(
	nodeName: string,
	executionRunData: Record<string, INodeExecutionData[]> | undefined,
): INodeExecutionData[] | undefined {
	if (!executionRunData) return undefined;
	return executionRunData[nodeName];
}

// =============================================================================
// Tier 2: Schema-Based Generation
// =============================================================================

function generatePinDataFromSchema(
	node: INode,
	nodeTypes: NodeTypes,
): INodeExecutionData[] | undefined {
	try {
		const resource = (node.parameters?.resource as string) ?? '';
		const operation = (node.parameters?.operation as string) ?? '';

		// Need at least a node type to look up schemas
		if (!node.type) return undefined;

		// Get the node version
		const version =
			typeof node.typeVersion === 'number' ? node.typeVersion : Number(node.typeVersion);

		// Discover schemas for this node type
		const schemas = discoverSchemasForNode(node.type, version);
		if (schemas.length === 0) return undefined;

		// For nodes without resource/operation, try to find a single output schema
		let schema;
		if (resource || operation) {
			schema = findSchemaForOperation(schemas, resource, operation);
		} else if (schemas.length === 1) {
			// Single schema (e.g., Webhook output.json)
			schema = schemas[0];
		}

		if (!schema?.schema) return undefined;

		// Verify the node type exists (prevents errors for removed node types)
		try {
			nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		} catch {
			return undefined;
		}

		const sampleData = jsonSchemaToSampleData(schema.schema);
		if (typeof sampleData === 'object' && sampleData !== null) {
			return [{ json: sampleData as INodeExecutionData['json'] }];
		}

		return undefined;
	} catch {
		// Schema discovery/generation failed — fall through to Tier 3
		return undefined;
	}
}
