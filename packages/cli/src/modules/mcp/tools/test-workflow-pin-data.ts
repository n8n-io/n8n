import type { User } from '@n8n/db';
import { discoverSchemasForNode, findSchemaForOperation, type JsonSchema } from '@n8n/workflow-sdk';
import type { INode, INodeExecutionData, IPinData } from 'n8n-workflow';
import { jsonStringify } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { getMcpWorkflow } from './workflow-validation.utils';

import type { ExecutionService } from '@/executions/execution.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const inputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to generate test pin data for'),
});

const outputSchema = {
	pinData: z
		.record(z.array(z.record(z.unknown())))
		.describe(
			'Pin data from the last successful execution. Keys are node names, values are arrays of data items. These are ready to use as-is.',
		),
	nodeSchemasToGenerate: z
		.record(z.record(z.unknown()))
		.describe(
			'Nodes that need pin data generated. Keys are node names, values are JSON Schema objects describing the expected output shape. Generate realistic sample data matching each schema and merge into pinData before passing to test_workflow.',
		),
	nodesWithoutSchema: z
		.array(z.string())
		.describe(
			'Node names with no execution data or output schema. Generate a single item with an empty JSON object ({ json: {} }) for each, and merge into pinData before passing to test_workflow.',
		),
	coverage: z.object({
		fromExecution: z
			.number()
			.describe('Number of nodes with pin data from last successful execution'),
		withSchema: z.number().describe('Number of nodes with output schemas for you to generate'),
		withoutSchema: z
			.number()
			.describe('Number of nodes with no data or schema — use empty defaults'),
		total: z.number().describe('Total number of enabled nodes'),
	}),
} satisfies z.ZodRawShape;

export const createPrepareTestPinDataTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	executionService: ExecutionService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema.shape> => ({
	name: 'prepare_test_pin_data',
	config: {
		description:
			'Prepare test pin data for a workflow. Returns execution data for nodes that have it, JSON Schemas for nodes that need generated data, and a list of nodes with no schema. You should generate realistic sample data for the schemas, use empty defaults for nodes without schema, merge everything into a single pinData object, and pass it to test_workflow.',
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

interface PreparePinDataResult {
	[key: string]: unknown;
	pinData: IPinData;
	nodeSchemasToGenerate: Record<string, JsonSchema>;
	nodesWithoutSchema: string[];
	coverage: {
		fromExecution: number;
		withSchema: number;
		withoutSchema: number;
		total: number;
	};
}

export async function preparePinData(
	workflowId: string,
	user: User,
	workflowFinderService: WorkflowFinderService,
	executionService: ExecutionService,
): Promise<PreparePinDataResult> {
	const workflow = await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

	const enabledNodes = (workflow.nodes ?? []).filter((n) => !n.disabled);

	// Tier 1: Try to get data from last successful execution
	const executionRunData = await getExecutionRunData(workflowId, user, executionService);

	const pinData: IPinData = {};
	const nodeSchemasToGenerate: Record<string, JsonSchema> = {};
	const nodesWithoutSchema: string[] = [];

	let fromExecution = 0;
	let withSchema = 0;
	let withoutSchema = 0;

	for (const node of enabledNodes) {
		// Tier 1: Execution history
		const execData = extractNodePinDataFromExecution(node.name, executionRunData);
		if (execData) {
			pinData[node.name] = execData;
			fromExecution++;
			continue;
		}

		// Tier 2: Return schema for LLM to generate
		const schema = discoverOutputSchema(node);
		if (schema) {
			nodeSchemasToGenerate[node.name] = schema;
			withSchema++;
			continue;
		}

		// Tier 3: No data, no schema
		nodesWithoutSchema.push(node.name);
		withoutSchema++;
	}

	return {
		pinData,
		nodeSchemasToGenerate,
		nodesWithoutSchema,
		coverage: {
			fromExecution,
			withSchema,
			withoutSchema,
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
// Tier 2: Schema Discovery
// =============================================================================

function discoverOutputSchema(node: INode): JsonSchema | undefined {
	try {
		if (!node.type) return undefined;

		const resource = (node.parameters?.resource as string) ?? '';
		const operation = (node.parameters?.operation as string) ?? '';
		const version =
			typeof node.typeVersion === 'number' ? node.typeVersion : Number(node.typeVersion);

		const schemas = discoverSchemasForNode(node.type, version);
		if (schemas.length === 0) return undefined;

		let match;
		if (resource || operation) {
			match = findSchemaForOperation(schemas, resource, operation);
		} else if (schemas.length === 1) {
			match = schemas[0];
		}

		return match?.schema;
	} catch {
		return undefined;
	}
}
