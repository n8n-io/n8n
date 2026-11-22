import type { TelemetryProxy } from '@n8n/backend-services';
import {
	UnsupportedWorkflowNodesError,
	type WorkflowSimulationService,
} from '@n8n/backend-module-ai-gym';
import type { User, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	createGetWorkflowSimulationSupportTool,
	createSimulateWorkflowTool,
} from '../simulate-workflow.tool';

vi.mock('../workflow-validation.utils', () => ({
	getMcpWorkflow: vi.fn(),
}));

import { getMcpWorkflow } from '../workflow-validation.utils';

describe('MCP AI Gym simulation tools', () => {
	const user = { id: 'user-1' } as User;
	const workflowFinderService = mock<WorkflowFinderService>();
	const simulationService = mock<WorkflowSimulationService>();
	const telemetry = mock<TelemetryProxy>();
	const sampleWorkflow = {
		id: 'wf-1',
		name: 'Incident Triage',
		nodes: [],
		connections: {},
	} as unknown as WorkflowEntity;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getMcpWorkflow).mockResolvedValue(sampleWorkflow);
	});

	describe('get_workflow_simulation_support', () => {
		it('returns vendor capabilities, support status, and missing credentials', async () => {
			simulationService.checkSupport.mockResolvedValue({
				supported: true,
				unsupportedNodes: [],
				missingCredentials: [
					{
						nodeName: 'Slack',
						nodeType: 'n8n-nodes-base.slack',
						credentialType: 'slackApi',
						credentialDisplayName: 'Slack API',
						reason: 'missing',
					},
				],
				requiredVendors: ['slack'],
			});
			simulationService.getCapabilities.mockResolvedValue({
				vendors: [
					{
						slug: 'slack',
						hosts: ['slack.com'],
						faultFlags: ['slack.rate_limit'],
						seedSchema: { description: 'Slack seed', settings: [], collections: [] },
					},
					{
						slug: 'github',
						hosts: ['api.github.com'],
						faultFlags: [],
						seedSchema: { description: 'GitHub seed', settings: [], collections: [] },
					},
				],
			});

			const tool = createGetWorkflowSimulationSupportTool(
				user,
				workflowFinderService,
				simulationService,
				telemetry,
			);
			const result = await tool.handler({ workflowId: 'wf-1' }, {} as never);
			const structured = result.structuredContent as Record<string, unknown>;

			expect(structured.supported).toBe(true);
			expect(structured.readyToSimulate).toBe(true);
			expect(structured.requiredVendors).toEqual(['slack']);
			expect(structured.missingCredentials).toHaveLength(1);
			expect(structured.vendorCapabilities).toHaveLength(1);
			expect((structured.vendorCapabilities as Array<{ slug: string }>)[0].slug).toBe('slack');
		});
	});

	describe('simulate_workflow', () => {
		it('executes simulation with seeds and faults and returns summarized node outputs', async () => {
			simulationService.simulate.mockResolvedValue({
				status: 'success',
				durationMs: 24,
				vendorsUsed: ['slack'],
				events: [{ kind: 'http', service: 'slack' } as never],
				vendorStates: { slack: { messages: [] } },
				runData: {
					data: {
						resultData: {
							runData: {
								'Post Alert': [
									{
										startTime: 0,
										executionTime: 10,
										executionIndex: 0,
										executionStatus: 'success',
										source: [],
										data: {
											main: [[{ json: { ok: true, channel: 'C01' } }]],
										},
									},
								],
							},
						},
					},
					mode: 'manual',
					startedAt: new Date(),
					status: 'success',
				},
			});

			const tool = createSimulateWorkflowTool(
				user,
				workflowFinderService,
				simulationService,
				telemetry,
			);
			const result = await tool.handler(
				{
					workflowId: 'wf-1',
					seeds: { slack: { workspace_name: 'Acme' } },
					faults: { 'slack.rate_limit': 1 },
				},
				{} as never,
			);

			expect(simulationService.simulate).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowData: sampleWorkflow,
					seeds: { slack: { workspace_name: 'Acme' } },
					faults: { 'slack.rate_limit': 1 },
					userId: 'user-1',
				}),
			);

			const structured = result.structuredContent as Record<string, unknown>;
			expect(structured.status).toBe('success');
			expect(structured.eventCount).toBe(1);
			expect(structured.nodeOutputs).toEqual({
				'Post Alert': {
					status: 'success',
					itemCount: 1,
					items: [{ ok: true, channel: 'C01' }],
				},
			});
		});

		it('surfaces unsupported-node errors cleanly in structured output', async () => {
			simulationService.simulate.mockRejectedValue(
				new UnsupportedWorkflowNodesError([
					{
						nodeName: 'Custom Node',
						nodeType: 'n8n-nodes-base.customUnsupported',
						reason: 'No ai-gym simulator is available for this node type',
					},
				]),
			);

			const tool = createSimulateWorkflowTool(
				user,
				workflowFinderService,
				simulationService,
				telemetry,
			);
			const result = await tool.handler({ workflowId: 'wf-1' }, {} as never);
			const structured = result.structuredContent as Record<string, unknown>;

			expect(structured.status).toBe('error');
			expect(String(structured.error)).toContain('unsupported nodes');
		});
	});
});
