import type { TelemetryProxy } from '@n8n/backend-services';
import type {
	AiGymSeedPayload,
	SimulationResult,
	WorkflowSimulationService,
} from '@n8n/backend-module-ai-gym';
import type { User } from '@n8n/db';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { normalizePinData } from '@n8n/workflow-sdk';
import type { IPinData } from 'n8n-workflow';
import { jsonStringify } from 'n8n-workflow';
import z from 'zod';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { getMcpWorkflow } from './workflow-validation.utils';

// =============================================================================
// get_workflow_simulation_support
// =============================================================================

const supportInputSchema = z.object({
	workflowId: z
		.string()
		.describe(
			'The ID of the workflow to inspect for AI Gym simulation readiness, supported services, seed schemas, fault flags, and missing credentials.',
		),
});

const supportOutputSchema = {
	supported: z
		.boolean()
		.describe('Whether every enabled node in the workflow is supported by the AI Gym simulator.'),
	readyToSimulate: z
		.boolean()
		.describe(
			'True when every enabled node in the workflow is supported by AI Gym (simulation synthesizes credentials automatically for unconfigured nodes).',
		),
	requiredVendors: z
		.array(z.string())
		.describe(
			'AI Gym vendor slugs required by nodes in this workflow (e.g. slack, github, linear).',
		),
	unsupportedNodes: z
		.array(
			z.object({
				nodeName: z.string(),
				nodeType: z.string(),
				reason: z.string(),
			}),
		)
		.describe('Enabled nodes that cannot be simulated in AI Gym.'),
	missingCredentials: z
		.array(
			z.object({
				nodeName: z.string(),
				nodeType: z.string(),
				credentialType: z.string(),
				credentialDisplayName: z.string(),
				reason: z.enum(['missing', 'not-configured']),
			}),
		)
		.describe(
			'Enabled nodes without real credentials configured (informational; AI Gym synthesizes simulated credentials automatically so simulation can still run).',
		),
	vendorCapabilities: z
		.array(
			z.object({
				slug: z.string(),
				hosts: z.array(z.string()),
				faultFlags: z.array(z.string()),
				seedSchema: z.unknown(),
			}),
		)
		.describe('Seed schemas and fault flags for the vendors used by this workflow.'),
	error: z.string().optional().describe('Error message if support could not be inspected.'),
} satisfies z.ZodRawShape;

export const createGetWorkflowSimulationSupportTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	simulationService: WorkflowSimulationService,
	telemetry: TelemetryProxy,
): ToolDefinition<typeof supportInputSchema.shape> => ({
	name: 'get_workflow_simulation_support',
	config: {
		description:
			'Check whether a workflow can be simulated in AI Gym. Returns unsupported nodes, any unconfigured credentials (informational — simulation synthesizes credentials automatically), the required vendor slugs, and the dynamic seed schemas and fault flags available for each service in the workflow.',
		inputSchema: supportInputSchema.shape,
		outputSchema: supportOutputSchema,
		annotations: {
			title: 'Get Workflow Simulation Support',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId }: z.infer<typeof supportInputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_workflow_simulation_support',
			parameters: { workflowId },
		};

		try {
			const workflow = await getMcpWorkflow(
				workflowId,
				user,
				['workflow:read'],
				workflowFinderService,
			);
			const [support, capabilities] = await Promise.all([
				simulationService.checkSupport(workflow),
				simulationService.getCapabilities(),
			]);

			const requiredSet = new Set(support.requiredVendors);
			const vendorCapabilities = capabilities.vendors
				.filter((vendor) => requiredSet.has(vendor.slug))
				.map((vendor) => ({
					slug: vendor.slug,
					hosts: vendor.hosts,
					faultFlags: vendor.faultFlags,
					seedSchema: vendor.seedSchema,
				}));

			const output = {
				supported: support.supported,
				readyToSimulate: support.supported,
				requiredVendors: support.requiredVendors,
				unsupportedNodes: support.unsupportedNodes,
				missingCredentials: support.missingCredentials,
				vendorCapabilities,
			};

			telemetryPayload.results = {
				success: true,
				data: {
					supported: output.supported,
					readyToSimulate: output.readyToSimulate,
					vendorCount: output.requiredVendors.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const output = {
				supported: false,
				readyToSimulate: false,
				requiredVendors: [],
				unsupportedNodes: [],
				missingCredentials: [],
				vendorCapabilities: [],
				error: error.message,
			};

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: error instanceof WorkflowAccessError ? error.reason : undefined,
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
// simulate_workflow
// =============================================================================

const seedPayloadSchema = z.record(z.unknown());

const simulateInputSchema = z.object({
	workflowId: z.string().describe('The ID of the workflow to simulate in AI Gym.'),
	seeds: z
		.record(z.union([seedPayloadSchema, z.array(seedPayloadSchema)]))
		.optional()
		.describe(
			'Optional vendor seed state keyed by AI Gym vendor slug (e.g. slack, github, linear, gmail). Call get_workflow_simulation_support first to inspect each vendor seedSchema. Accepts either a single payload or an array of payloads per vendor.',
		),
	faults: z
		.record(z.number().int())
		.optional()
		.describe(
			'Optional fault injection counts keyed by fault flag name (e.g. {"slack.rate_limit": 1}). Use -1 to fail always.',
		),
	pinData: z
		.record(z.array(z.record(z.unknown())))
		.optional()
		.describe(
			'Optional pin data overrides (for example trigger input payloads). Keys are node names, values are arrays of items wrapped in {"json": {...}}.',
		),
	startNode: z
		.string()
		.optional()
		.describe('Optional name of the node to start the simulation from.'),
	destinationNode: z
		.string()
		.optional()
		.describe('Optional name of the destination node for partial simulation.'),
	timeoutMs: z
		.number()
		.int()
		.positive()
		.max(300_000)
		.optional()
		.describe('Optional simulation timeout in milliseconds (max 300000).'),
});

interface SimulateWorkflowMcpOutput {
	status: 'success' | 'error' | 'crashed';
	durationMs: number;
	vendorsUsed: string[];
	eventCount: number;
	events: unknown[];
	vendorStates: Record<string, Record<string, unknown>>;
	nodeOutputs: Record<string, unknown>;
	error?: string;
}

const simulateOutputSchema = {
	status: z
		.enum(['success', 'error', 'crashed'])
		.describe('Outcome of the ephemeral in-process simulation.'),
	durationMs: z.number().describe('Simulation duration in milliseconds.'),
	vendorsUsed: z.array(z.string()).describe('AI Gym vendors exercised during the run.'),
	eventCount: z.number().describe('Number of simulated vendor monitor events captured.'),
	events: z
		.array(z.unknown())
		.describe('Structured monitor events recorded by AI Gym (capped to the first 100 events).'),
	vendorStates: z
		.record(z.record(z.unknown()))
		.describe('Post-run simulated state snapshots keyed by vendor slug.'),
	nodeOutputs: z
		.record(z.unknown())
		.describe('Summary of each executed node output or error from the simulated run.'),
	error: z.string().optional().describe('Error message if the simulation could not run or failed.'),
} satisfies z.ZodRawShape;

function summarizeNodeOutputs(result: SimulationResult): Record<string, unknown> {
	const summary: Record<string, unknown> = {};
	const runData = result.runData.data.resultData.runData ?? {};
	for (const [nodeName, runs] of Object.entries(runData)) {
		const lastRun = runs[runs.length - 1];
		if (!lastRun) continue;
		if (lastRun.error) {
			summary[nodeName] = {
				status: 'error',
				error: lastRun.error.message,
			};
			continue;
		}
		const mainItems = lastRun.data?.main?.[0] ?? [];
		summary[nodeName] = {
			status: 'success',
			itemCount: mainItems.length,
			items: mainItems.slice(0, 10).map((item) => item.json),
		};
	}
	return summary;
}

export const createSimulateWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	simulationService: WorkflowSimulationService,
	telemetry: TelemetryProxy,
): ToolDefinition<typeof simulateInputSchema.shape> => ({
	name: 'simulate_workflow',
	config: {
		description:
			'Run an ephemeral, in-process workflow simulation against AI Gym simulated services without touching real external APIs or persisting execution rows. Works even without configured credentials by synthesizing tenant-minted credentials (and uses non-secret fields from real credentials when present). Supports seeding initial vendor state and injecting API faults. Call get_workflow_simulation_support first to see required vendors, seed schemas, and fault flags.',
		inputSchema: simulateInputSchema.shape,
		outputSchema: simulateOutputSchema,
		annotations: {
			title: 'Simulate Workflow',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowId,
		seeds,
		faults,
		pinData,
		startNode,
		destinationNode,
		timeoutMs,
	}: z.infer<typeof simulateInputSchema>) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'simulate_workflow',
			parameters: {
				workflowId,
				seedVendors: seeds ? Object.keys(seeds) : [],
				faultCount: faults ? Object.keys(faults).length : 0,
				hasPinData: !!pinData,
			},
		};

		try {
			const workflow = await getMcpWorkflow(
				workflowId,
				user,
				['workflow:execute'],
				workflowFinderService,
			);

			const normalizedPinData = pinData ? normalizePinData(pinData as IPinData) : undefined;
			const result = await simulationService.simulate({
				workflowData: workflow,
				seeds: seeds as Record<string, AiGymSeedPayload | AiGymSeedPayload[]> | undefined,
				faults,
				pinData: normalizedPinData,
				startNode,
				destinationNode,
				timeoutMs,
				userId: user.id,
			});

			const output: SimulateWorkflowMcpOutput = {
				status: result.status,
				durationMs: result.durationMs,
				vendorsUsed: result.vendorsUsed,
				eventCount: result.events.length,
				events: result.events.slice(0, 100),
				vendorStates: result.vendorStates,
				nodeOutputs: summarizeNodeOutputs(result),
				error: result.error,
			};

			telemetryPayload.results = {
				success: output.status === 'success',
				data: {
					status: output.status,
					durationMs: output.durationMs,
					eventCount: output.eventCount,
					vendorsUsed: output.vendorsUsed,
				},
			};
			if (output.status !== 'success' && output.error) {
				telemetryPayload.results.error = output.error;
			}
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output as unknown as Record<string, unknown>,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const output: SimulateWorkflowMcpOutput = {
				status: 'error',
				durationMs: 0,
				vendorsUsed: [],
				eventCount: 0,
				events: [],
				vendorStates: {},
				nodeOutputs: {},
				error: error.message,
			};

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: jsonStringify(output) }],
				structuredContent: output as unknown as Record<string, unknown>,
			};
		}
	},
});
