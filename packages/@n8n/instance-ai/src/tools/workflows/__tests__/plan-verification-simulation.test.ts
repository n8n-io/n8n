import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { MockedFunction } from 'vitest';

vi.mock('../classify-node-destructiveness.service', () => ({
	classifyNodesForSimulation: vi.fn(),
}));
vi.mock('../generate-simulation-fixtures.service', () => ({
	generateSimulationFixtures: vi.fn(),
}));

import type { NodeSimulationVerdict } from '../../../workflow-loop/workflow-loop-state';
import { classifyNodesForSimulation } from '../classify-node-destructiveness.service';
import { generateSimulationFixtures } from '../generate-simulation-fixtures.service';
import { planVerificationSimulation } from '../plan-verification-simulation';

const mockClassify = classifyNodesForSimulation as MockedFunction<
	typeof classifyNodesForSimulation
>;
const mockGenerateFixtures = generateSimulationFixtures as MockedFunction<
	typeof generateSimulationFixtures
>;

const wf = (nodes: Array<{ name: string; type: string; disabled?: boolean }>): WorkflowJSON =>
	({
		name: 'test',
		nodes: nodes.map((n, i) => ({
			id: `id-${i}`,
			name: n.name,
			type: n.type,
			typeVersion: 1,
			position: [i * 100, 0],
			parameters: {},
			...(n.disabled !== undefined ? { disabled: n.disabled } : {}),
		})),
		connections: {},
	}) as unknown as WorkflowJSON;

const executeVerdict = (nodeName: string): NodeSimulationVerdict => ({
	nodeName,
	verdict: 'execute',
	reason: 'Reads data',
	confidence: 'high',
	source: 'deterministic',
});

describe('planVerificationSimulation — simulated trigger verdicts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGenerateFixtures.mockResolvedValue({});
	});

	it('injects a deterministic simulate verdict for non-deterministic triggers', async () => {
		mockClassify.mockResolvedValue([executeVerdict('Fetch Rows')]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: wf([
				{ name: 'On New Email', type: 'n8n-nodes-base.gmailTrigger' },
				{ name: 'Fetch Rows', type: 'n8n-nodes-base.dataTable' },
			]),
			workflowId: 'wf-1',
		});

		expect(nodeSimulationPlan).toContainEqual({
			nodeName: 'On New Email',
			verdict: 'simulate',
			reason: 'Trigger event is simulated during verification',
			confidence: 'high',
			source: 'deterministic',
		});
		// The fixture generator receives the trigger in its plan.
		const fixtureInput = mockGenerateFixtures.mock.calls[0][0];
		expect(fixtureInput.plan.map((verdict) => verdict.nodeName)).toContain('On New Email');
	});

	it('does not inject verdicts for deterministic-input or disabled triggers', async () => {
		mockClassify.mockResolvedValue([]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: wf([
				{ name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
				{ name: 'Hook', type: 'n8n-nodes-base.webhook' },
				{ name: 'Chat', type: '@n8n/n8n-nodes-langchain.chatTrigger' },
				{ name: 'Off', type: 'n8n-nodes-base.gmailTrigger', disabled: true },
				{ name: 'Set', type: 'n8n-nodes-base.set' },
			]),
			workflowId: 'wf-1',
		});

		expect(nodeSimulationPlan).toEqual([]);
		expect(mockGenerateFixtures).not.toHaveBeenCalled();
	});

	it('keeps declared-output fixtures authoritative over the trigger injection', async () => {
		mockClassify.mockResolvedValue([]);

		const { nodeSimulationPlan, simulationFixtures } = await planVerificationSimulation({
			workflow: wf([{ name: 'On New Email', type: 'n8n-nodes-base.gmailTrigger' }]),
			declaredOutputFixtures: { 'On New Email': [{ subject: 'declared' }] },
			workflowId: 'wf-1',
		});

		const verdicts = (nodeSimulationPlan ?? []).filter((v) => v.nodeName === 'On New Email');
		expect(verdicts).toHaveLength(1);
		expect(verdicts[0]).toMatchObject({
			verdict: 'simulate',
			reason: 'Source declares verification output for this node',
		});
		// Declared fixture is used; no generation needed for this node.
		expect(mockGenerateFixtures).not.toHaveBeenCalled();
		expect(simulationFixtures).toEqual({ 'On New Email': [{ subject: 'declared' }] });
	});
});
