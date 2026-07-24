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

const wf = (
	nodes: Array<{
		name: string;
		type: string;
		disabled?: boolean;
		credentials?: Record<string, { id?: string; name: string }>;
	}>,
	connections: Record<string, unknown> = {},
): WorkflowJSON =>
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
			...(n.credentials !== undefined ? { credentials: n.credentials } : {}),
		})),
		connections,
	}) as unknown as WorkflowJSON;

const modelConnection = (subNode: string, root: string) => ({
	[subNode]: { ai_languageModel: [[{ node: root, type: 'ai_languageModel', index: 0 }]] },
});

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

	it('forwards the fallback model config to classification and fixture generation', async () => {
		const fallbackModelConfig = {
			id: 'anthropic/claude-opus-4-8' as const,
			url: 'https://proxy.example.com/anthropic/v1',
			apiKey: 'proxy-token',
		};
		mockClassify.mockResolvedValue([
			{
				nodeName: 'Send It',
				verdict: 'simulate',
				reason: 'Sends a message',
				confidence: 'high',
				source: 'deterministic',
			},
		]);

		await planVerificationSimulation({
			workflow: wf([{ name: 'Send It', type: 'n8n-nodes-base.slack' }]),
			workflowId: 'wf-1',
			fallbackModelConfig,
		});

		expect(mockClassify).toHaveBeenCalledWith(expect.objectContaining({ fallbackModelConfig }));
		expect(mockGenerateFixtures).toHaveBeenCalledWith(
			expect.objectContaining({ fallbackModelConfig }),
		);
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

	it('overrides an AI root to simulate when its LLM sub-node has no credentials', async () => {
		mockClassify.mockResolvedValue([executeVerdict('Draft Reply')]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: wf(
				[
					{ name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
					{ name: 'Draft Reply', type: '@n8n/n8n-nodes-langchain.agent' },
					{ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
				],
				modelConnection('OpenAI Model', 'Draft Reply'),
			),
			workflowId: 'wf-1',
		});

		expect(nodeSimulationPlan).toContainEqual({
			nodeName: 'Draft Reply',
			verdict: 'simulate',
			reason:
				'Language model sub-node has no configured credentials — output is simulated during verification',
			confidence: 'high',
			source: 'deterministic',
		});
	});

	it('overrides the AI root when its LLM sub-node credentials are mocked', async () => {
		mockClassify.mockResolvedValue([executeVerdict('Draft Reply')]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: wf(
				[
					{ name: 'Draft Reply', type: '@n8n/n8n-nodes-langchain.agent' },
					{
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						credentials: { openAiApi: { id: 'mocked', name: 'Mocked' } },
					},
				],
				modelConnection('OpenAI Model', 'Draft Reply'),
			),
			mockedNodeNames: ['OpenAI Model'],
			workflowId: 'wf-1',
		});

		expect(nodeSimulationPlan?.find((v) => v.nodeName === 'Draft Reply')).toMatchObject({
			verdict: 'simulate',
		});
	});

	it('leaves AI roots alone when the LLM sub-node has real credentials', async () => {
		mockClassify.mockResolvedValue([executeVerdict('Draft Reply')]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: wf(
				[
					{ name: 'Draft Reply', type: '@n8n/n8n-nodes-langchain.agent' },
					{
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						credentials: { openAiApi: { id: 'real-cred', name: 'OpenAI' } },
					},
				],
				modelConnection('OpenAI Model', 'Draft Reply'),
			),
			workflowId: 'wf-1',
		});

		expect(nodeSimulationPlan?.find((v) => v.nodeName === 'Draft Reply')).toMatchObject({
			verdict: 'execute',
		});
	});

	it('leaves AI roots alone when only the fallback model is credentialless', async () => {
		mockClassify.mockResolvedValue([executeVerdict('Draft Reply')]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: wf(
				[
					{ name: 'Draft Reply', type: '@n8n/n8n-nodes-langchain.agent' },
					{
						name: 'Primary Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						credentials: { openAiApi: { id: 'real-cred', name: 'OpenAI' } },
					},
					{ name: 'Fallback Model', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic' },
				],
				{
					...modelConnection('Primary Model', 'Draft Reply'),
					'Fallback Model': {
						ai_languageModel: [[{ node: 'Draft Reply', type: 'ai_languageModel', index: 1 }]],
					},
				},
			),
			workflowId: 'wf-1',
		});

		expect(nodeSimulationPlan?.find((v) => v.nodeName === 'Draft Reply')).toMatchObject({
			verdict: 'execute',
		});
	});

	it('looks through a Model Selector to the credentials of the models feeding it', async () => {
		mockClassify.mockResolvedValue([executeVerdict('Draft Reply')]);

		const selectorWorkflow = (modelCredentials?: Record<string, { id: string; name: string }>) =>
			wf(
				[
					{ name: 'Draft Reply', type: '@n8n/n8n-nodes-langchain.agent' },
					{ name: 'Selector', type: '@n8n/n8n-nodes-langchain.modelSelector' },
					{
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						...(modelCredentials ? { credentials: modelCredentials } : {}),
					},
				],
				{
					...modelConnection('Selector', 'Draft Reply'),
					...modelConnection('OpenAI Model', 'Selector'),
				},
			);

		const withCreds = await planVerificationSimulation({
			workflow: selectorWorkflow({ openAiApi: { id: 'real-cred', name: 'OpenAI' } }),
			workflowId: 'wf-1',
		});
		// The selector itself has no credentials, but the model behind it does.
		expect(withCreds.nodeSimulationPlan?.find((v) => v.nodeName === 'Draft Reply')).toMatchObject({
			verdict: 'execute',
		});
		expect(withCreds.nodeSimulationPlan?.find((v) => v.nodeName === 'Selector')).toBeUndefined();

		const withoutCreds = await planVerificationSimulation({
			workflow: selectorWorkflow(),
			workflowId: 'wf-1',
		});
		expect(
			withoutCreds.nodeSimulationPlan?.find((v) => v.nodeName === 'Draft Reply'),
		).toMatchObject({ verdict: 'simulate' });
	});

	it('still injects trigger and AI-root verdicts when classification throws but declared fixtures exist', async () => {
		mockClassify.mockRejectedValue(new Error('classifier down'));

		const { nodeSimulationPlan, simulationFixtures } = await planVerificationSimulation({
			workflow: wf(
				[
					{ name: 'On New Email', type: 'n8n-nodes-base.gmailTrigger' },
					{ name: 'Draft Reply', type: '@n8n/n8n-nodes-langchain.agent' },
					{ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' },
					{ name: 'Send Reply', type: 'n8n-nodes-base.gmail' },
				],
				modelConnection('OpenAI Model', 'Draft Reply'),
			),
			declaredOutputFixtures: { 'Send Reply': [{ id: 'declared' }] },
			workflowId: 'wf-1',
		});

		// The catch path must not hand verify a plan where the polling trigger
		// has no verdict — it would run for real.
		expect(nodeSimulationPlan?.find((v) => v.nodeName === 'On New Email')).toMatchObject({
			verdict: 'simulate',
		});
		expect(nodeSimulationPlan?.find((v) => v.nodeName === 'Draft Reply')).toMatchObject({
			verdict: 'simulate',
		});
		expect(simulationFixtures).toEqual({ 'Send Reply': [{ id: 'declared' }] });
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

describe('planVerificationSimulation — wait-gate halt verdicts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGenerateFixtures.mockResolvedValue({});
	});

	const simulateVerdict = (nodeName: string): NodeSimulationVerdict => ({
		nodeName,
		verdict: 'simulate',
		reason: 'Credentials are not configured for this node',
		confidence: 'high',
		source: 'deterministic',
	});

	const gateWorkflow = (connections: Record<string, unknown>): WorkflowJSON =>
		({
			name: 'approval loop',
			nodes: [
				{
					id: 'id-0',
					name: 'Format Draft',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'id-1',
					name: 'Email Approval',
					type: 'n8n-nodes-base.gmail',
					typeVersion: 2,
					position: [100, 0],
					parameters: { operation: 'sendAndWait' },
				},
				{
					id: 'id-2',
					name: 'Revise Post',
					type: 'n8n-nodes-base.openAi',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
			],
			connections,
		}) as unknown as WorkflowJSON;

	const loopConnections = {
		'Format Draft': { main: [[{ node: 'Email Approval', type: 'main', index: 0 }]] },
		'Email Approval': { main: [[{ node: 'Revise Post', type: 'main', index: 0 }]] },
		'Revise Post': { main: [[{ node: 'Format Draft', type: 'main', index: 0 }]] },
	};

	it('halts a simulated send-and-wait gate that sits on a loop', async () => {
		mockClassify.mockResolvedValue([
			simulateVerdict('Email Approval'),
			simulateVerdict('Revise Post'),
		]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: gateWorkflow(loopConnections),
			workflowId: 'wf-1',
		});

		const gateVerdict = nodeSimulationPlan?.find((v) => v.nodeName === 'Email Approval');
		expect(gateVerdict).toMatchObject({ verdict: 'simulate', haltBranch: true });
		expect(gateVerdict?.reason).toContain('human decision');
		// Non-gate loop members keep their fixture behaviour.
		expect(
			nodeSimulationPlan?.find((v) => v.nodeName === 'Revise Post')?.haltBranch,
		).toBeUndefined();
		// No fixture is generated for a halted gate.
		const fixtureInput = mockGenerateFixtures.mock.calls[0][0];
		expect(fixtureInput.plan.map((verdict) => verdict.nodeName)).not.toContain('Email Approval');
		expect(fixtureInput.plan.map((verdict) => verdict.nodeName)).toContain('Revise Post');
	});

	it('leaves a simulated gate off any loop untouched', async () => {
		mockClassify.mockResolvedValue([simulateVerdict('Email Approval')]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: gateWorkflow({
				'Format Draft': { main: [[{ node: 'Email Approval', type: 'main', index: 0 }]] },
				'Email Approval': { main: [[{ node: 'Revise Post', type: 'main', index: 0 }]] },
			}),
			workflowId: 'wf-1',
		});

		expect(
			nodeSimulationPlan?.find((v) => v.nodeName === 'Email Approval')?.haltBranch,
		).toBeUndefined();
	});

	it('leaves an execute-verdict gate alone — a live gate pauses and breaks the loop itself', async () => {
		mockClassify.mockResolvedValue([executeVerdict('Email Approval')]);

		const { nodeSimulationPlan } = await planVerificationSimulation({
			workflow: gateWorkflow(loopConnections),
			workflowId: 'wf-1',
		});

		expect(nodeSimulationPlan?.find((v) => v.nodeName === 'Email Approval')).toMatchObject({
			verdict: 'execute',
		});
		expect(
			nodeSimulationPlan?.find((v) => v.nodeName === 'Email Approval')?.haltBranch,
		).toBeUndefined();
	});
});
